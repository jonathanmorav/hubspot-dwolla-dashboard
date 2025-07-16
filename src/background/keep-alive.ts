// Keep service worker alive
// Chrome kills service workers after 30 seconds of inactivity
// This creates a persistent connection to prevent that

let keepAliveInterval: number | null = null;

export function startKeepAlive() {
  // Send a message every 20 seconds to keep the service worker active
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just accessing the API keeps the service worker alive
    });
  }, 20000) as unknown as number;
}

export function stopKeepAlive() {
  if (keepAliveInterval !== null) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Also keep alive during message processing
export function keepAliveForDuration(durationMs: number) {
  const interval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});
  }, 5000) as unknown as number;
  
  setTimeout(() => {
    clearInterval(interval);
  }, durationMs);
}

// Start keep-alive when service worker loads
startKeepAlive();