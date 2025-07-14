// Comprehensive logging system for Chrome extension
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
// Timer for performance tracking
export class LogTimer {
    constructor() {
        Object.defineProperty(this, "startTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.startTime = performance.now();
    }
    end() {
        return performance.now() - this.startTime;
    }
}
// Sanitizer to remove sensitive data
export class LogSanitizer {
    constructor() {
        Object.defineProperty(this, "emailRegex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g
        });
        Object.defineProperty(this, "tokenRegex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: /(token|key|secret|password)["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi
        });
        Object.defineProperty(this, "customerIdRegex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi
        });
    }
    sanitize(data) {
        if (typeof data === 'string') {
            return this.sanitizeString(data);
        }
        if (typeof data === 'object' && data !== null) {
            return this.sanitizeObject(data);
        }
        return data;
    }
    sanitizeString(str) {
        // Replace emails with masked version
        str = str.replace(this.emailRegex, (_match, user, domain) => {
            return `${user.substring(0, 2)}***@${domain}`;
        });
        // Remove tokens/secrets
        str = str.replace(this.tokenRegex, '$1=[REDACTED]');
        // Hash customer IDs
        str = str.replace(this.customerIdRegex, '[CUSTOMER_ID]');
        return str;
    }
    sanitizeObject(obj) {
        const sanitized = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Skip sensitive keys entirely
                if (this.isSensitiveKey(key)) {
                    sanitized[key] = '[REDACTED]';
                }
                else {
                    sanitized[key] = this.sanitize(obj[key]);
                }
            }
        }
        return sanitized;
    }
    isSensitiveKey(key) {
        const sensitiveKeys = [
            'password', 'token', 'secret', 'key', 'authorization',
            'access_token', 'refresh_token', 'client_secret'
        ];
        return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
    }
}
// Chrome storage based log store
export class ChromeLogStore {
    constructor(maxLogs = 1000, maxAge = 24 * 60 * 60 * 1000) {
        Object.defineProperty(this, "maxLogs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "maxAge", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.maxLogs = maxLogs;
        this.maxAge = maxAge;
    }
    async store(log) {
        try {
            const { logs = [] } = await chrome.storage.local.get('logs');
            // Add new log
            logs.push(log);
            // Rotate if needed
            const rotated = this.rotate(logs);
            await chrome.storage.local.set({ logs: rotated });
        }
        catch (error) {
            console.error('Failed to store log:', error);
        }
    }
    async getLogs(filter) {
        const { logs = [] } = await chrome.storage.local.get('logs');
        if (!filter) {
            return logs;
        }
        return logs.filter((log) => {
            for (const key in filter) {
                if (log[key] !== filter[key]) {
                    return false;
                }
            }
            return true;
        });
    }
    async clear() {
        await chrome.storage.local.remove('logs');
    }
    async export() {
        const { logs = [] } = await chrome.storage.local.get('logs');
        return logs;
    }
    rotate(logs) {
        const now = Date.now();
        // Remove old logs
        let filtered = logs.filter(log => (now - log.context.timestamp) < this.maxAge);
        // Keep only maxLogs most recent
        if (filtered.length > this.maxLogs) {
            filtered = filtered.slice(-this.maxLogs);
        }
        return filtered;
    }
}
// Main Logger class
export class Logger {
    constructor(config) {
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "store", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sanitizer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.config = config;
        this.store = new ChromeLogStore(config.maxLogs, config.maxAge);
        this.sanitizer = new LogSanitizer();
    }
    static getInstance(config) {
        if (!Logger.instance && config) {
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }
    shouldLog(level) {
        return level >= this.config.level;
    }
    async log(level, message, context, error) {
        if (!this.shouldLog(level)) {
            return;
        }
        const logEntry = {
            level,
            message,
            context: {
                timestamp: Date.now(),
                extensionVersion: chrome.runtime.getManifest().version,
                environment: import.meta.env?.MODE === 'production' ? 'production' : 'development',
                ...context
            }
        };
        if (error) {
            logEntry.error = {
                message: error.message,
                stack: error.stack,
                code: error.code
            };
        }
        // Sanitize if enabled
        if (this.config.sanitize) {
            logEntry.message = this.sanitizer.sanitize(logEntry.message);
            logEntry.context = this.sanitizer.sanitize(logEntry.context);
            if (logEntry.error) {
                logEntry.error = this.sanitizer.sanitize(logEntry.error);
            }
        }
        // Store log
        await this.store.store(logEntry);
        // Console output if enabled
        if (this.config.console) {
            this.consoleLog(logEntry);
        }
    }
    consoleLog(entry) {
        const prefix = `[${LogLevel[entry.level]}] ${new Date(entry.context.timestamp).toISOString()}`;
        const message = `${prefix} - ${entry.message}`;
        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(message, entry.context);
                break;
            case LogLevel.INFO:
                console.info(message, entry.context);
                break;
            case LogLevel.WARN:
                console.warn(message, entry.context);
                break;
            case LogLevel.ERROR:
                console.error(message, entry.context, entry.error);
                break;
        }
    }
    debug(message, context) {
        this.log(LogLevel.DEBUG, message, context);
    }
    info(message, context) {
        this.log(LogLevel.INFO, message, context);
    }
    warn(message, context) {
        this.log(LogLevel.WARN, message, context);
    }
    error(message, error, context) {
        this.log(LogLevel.ERROR, message, context, error);
    }
    startTimer(_operation) {
        return new LogTimer();
    }
    async logPerformance(operation, duration, metadata) {
        const level = duration > 3000 ? LogLevel.WARN : LogLevel.INFO;
        await this.log(level, `Performance: ${operation}`, {
            operation,
            duration: Math.round(duration),
            ...metadata
        });
    }
    async getLogs(filter) {
        return this.store.getLogs(filter);
    }
    async clearLogs() {
        return this.store.clear();
    }
    async exportLogs() {
        return this.store.export();
    }
}
// Create singleton instance
export const logger = Logger.getInstance({
    level: import.meta.env?.DEV ? LogLevel.DEBUG : LogLevel.INFO,
    console: import.meta.env?.DEV,
    sanitize: true,
    maxLogs: 1000,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
// Utility functions
export function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
export function detectQueryType(query) {
    if (query.includes('@'))
        return 'email';
    if (query.includes('inc') || query.includes('llc') || query.includes('corp'))
        return 'business';
    if (query.split(' ').length >= 2)
        return 'name';
    return 'unknown';
}
