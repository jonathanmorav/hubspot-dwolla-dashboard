// Session management for Chrome Extension
// Handles activity tracking and session timeout

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

interface SessionState {
  lastActivity: number;
  isActive: boolean;
}

class SessionManager {
  private static instance: SessionManager;
  
  private constructor() {
    this.initializeSession();
    this.startActivityMonitoring();
  }
  
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }
  
  // Initialize session on extension startup
  private async initializeSession() {
    // Set initial activity time
    await this.updateActivity();
    
    // Listen for user activity in popup
    if (typeof window !== 'undefined') {
      // Popup context
      ['click', 'keydown', 'scroll', 'mousemove'].forEach(event => {
        window.addEventListener(event, () => this.updateActivity(), { passive: true });
      });
    }
  }
  
  // Update last activity timestamp
  async updateActivity() {
    const now = Date.now();
    await chrome.storage.local.set({
      session_last_activity: now,
      session_active: true
    });
  }
  
  // Check if session is still valid
  async isSessionValid(): Promise<boolean> {
    const result = await chrome.storage.local.get(['session_last_activity', 'session_active']);
    
    if (!result.session_active || !result.session_last_activity) {
      return false;
    }
    
    const lastActivity = result.session_last_activity;
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity;
    
    // Session is valid if activity was within timeout period
    return timeSinceLastActivity < SESSION_TIMEOUT;
  }
  
  // Start monitoring for session timeout
  private startActivityMonitoring() {
    // Only run in service worker context
    if (typeof chrome.alarms !== 'undefined') {
      // Create alarm for periodic session checks
      chrome.alarms.create('session-check', { periodInMinutes: 1 });
      
      chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === 'session-check') {
          await this.checkSessionTimeout();
        }
      });
    }
  }
  
  // Check if session has timed out
  private async checkSessionTimeout() {
    const isValid = await this.isSessionValid();
    
    if (!isValid) {
      // Session has timed out, clear auth data
      await this.clearSession();
    }
  }
  
  // Clear session and auth data
  async clearSession() {
    // Import clearAllTokens from auth utils
    const { clearAllTokens } = await import('./auth');
    
    // Clear all auth tokens
    await clearAllTokens();
    
    // Clear session data
    await chrome.storage.local.remove([
      'session_last_activity',
      'session_active'
    ]);
    
    // Notify any open popups
    try {
      chrome.runtime.sendMessage({
        type: 'SESSION_EXPIRED',
        timestamp: Date.now()
      });
    } catch {
      // Popup might be closed, ignore error
    }
  }
  
  // End session (user logout)
  async endSession() {
    await this.clearSession();
  }
  
  // Get session info
  async getSessionInfo(): Promise<SessionState | null> {
    const result = await chrome.storage.local.get(['session_last_activity', 'session_active']);
    
    if (!result.session_active) {
      return null;
    }
    
    return {
      lastActivity: result.session_last_activity || 0,
      isActive: await this.isSessionValid()
    };
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

// Export session timeout constant
export { SESSION_TIMEOUT };