import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Debug panel for development - view logs and performance metrics
import { useState, useEffect, useCallback } from 'react';
import { LogLevel } from '../utils/logger';
import './DebugPanel.css';
export function DebugPanel({ show, onClose }) {
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [rateLimit, setRateLimit] = useState(null);
    const [performance, setPerformance] = useState([]);
    const loadLogs = useCallback(async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_LOGS',
                filter: filter === 'all' ? undefined : { level: filter }
            });
            if (response.logs) {
                setLogs(response.logs);
            }
        }
        catch (error) {
            console.error('Failed to load logs:', error);
        }
    }, [filter]);
    const loadRateLimit = useCallback(async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_RATE_LIMIT_STATUS'
            });
            if (response.status) {
                setRateLimit(response.status);
            }
        }
        catch (error) {
            console.error('Failed to load rate limit:', error);
        }
    }, []);
    const loadPerformance = useCallback(async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_PERFORMANCE_METRICS'
            });
            if (response.metrics) {
                setPerformance(response.metrics);
            }
        }
        catch (error) {
            console.error('Failed to load performance:', error);
        }
    }, []);
    const clearLogs = async () => {
        try {
            await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
            setLogs([]);
        }
        catch (error) {
            console.error('Failed to clear logs:', error);
        }
    };
    const exportLogs = async () => {
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    useEffect(() => {
        if (show) {
            loadLogs();
            loadRateLimit();
            loadPerformance();
        }
        if (show && autoRefresh) {
            const interval = setInterval(() => {
                loadLogs();
                loadRateLimit();
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [show, autoRefresh, loadLogs, loadRateLimit, loadPerformance]);
    if (!show)
        return null;
    return (_jsxs("div", { className: "debug-panel", children: [_jsxs("div", { className: "debug-header", children: [_jsx("h2", { children: "Debug Panel" }), _jsx("button", { onClick: onClose, className: "close-button", children: "\u00D7" })] }), _jsxs("div", { className: "debug-controls", children: [_jsxs("select", { value: filter, onChange: (e) => setFilter(e.target.value), className: "filter-select", children: [_jsx("option", { value: "all", children: "All Levels" }), _jsx("option", { value: LogLevel.DEBUG, children: "Debug" }), _jsx("option", { value: LogLevel.INFO, children: "Info" }), _jsx("option", { value: LogLevel.WARN, children: "Warn" }), _jsx("option", { value: LogLevel.ERROR, children: "Error" })] }), _jsxs("label", { className: "auto-refresh", children: [_jsx("input", { type: "checkbox", checked: autoRefresh, onChange: (e) => setAutoRefresh(e.target.checked) }), "Auto-refresh"] }), _jsx("button", { onClick: loadLogs, className: "refresh-button", children: "Refresh" }), _jsx("button", { onClick: clearLogs, className: "clear-button", children: "Clear" }), _jsx("button", { onClick: exportLogs, className: "export-button", children: "Export" })] }), _jsxs("div", { className: "debug-content", children: [_jsxs("div", { className: "debug-section", children: [_jsx("h3", { children: "Rate Limits" }), rateLimit && (_jsx("div", { className: "rate-limit-grid", children: Object.entries(rateLimit).map(([provider, status]) => (_jsxs("div", { className: "rate-limit-item", children: [_jsx("h4", { children: provider }), _jsx("div", { className: "rate-limit-bar", children: _jsx("div", { className: "rate-limit-fill", style: {
                                                    width: `${status.percentUsed}%`,
                                                    backgroundColor: status.percentUsed > 80 ? '#ff4444' : '#44ff44'
                                                } }) }), _jsxs("p", { children: [status.used, "/", status.limit, " (", status.remaining, " remaining)"] }), _jsxs("p", { className: "reset-time", children: ["Resets: ", new Date(status.resetTime).toLocaleTimeString()] })] }, provider))) }))] }), _jsxs("div", { className: "debug-section", children: [_jsx("h3", { children: "Performance Metrics" }), _jsx("div", { className: "performance-list", children: performance.slice(0, 10).map((metric, index) => (_jsxs("div", { className: "performance-item", children: [_jsx("span", { className: "operation", children: metric.operation }), _jsxs("span", { className: `duration ${metric.duration > 3000 ? 'slow' : ''}`, children: [metric.duration, "ms"] })] }, index))) })] }), _jsxs("div", { className: "debug-section", children: [_jsxs("h3", { children: ["Logs (", logs.length, ")"] }), _jsx("div", { className: "log-list", children: logs.map((log, index) => (_jsxs("div", { className: `log-entry level-${LogLevel[log.level].toLowerCase()}`, children: [_jsxs("div", { className: "log-header", children: [_jsx("span", { className: "log-level", children: LogLevel[log.level] }), _jsx("span", { className: "log-time", children: new Date(log.context.timestamp).toLocaleTimeString() }), log.context.requestId && (_jsx("span", { className: "log-request-id", children: log.context.requestId }))] }), _jsx("div", { className: "log-message", children: log.message }), log.context.duration && (_jsxs("div", { className: "log-duration", children: ["Duration: ", log.context.duration, "ms"] })), log.error && (_jsxs("div", { className: "log-error", children: [_jsx("strong", { children: "Error:" }), " ", log.error.message, log.error.stack && (_jsx("pre", { className: "error-stack", children: log.error.stack }))] })), _jsxs("details", { className: "log-context", children: [_jsx("summary", { children: "Context" }), _jsx("pre", { children: JSON.stringify(log.context, null, 2) })] })] }, index))) })] })] })] }));
}
