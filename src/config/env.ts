// Environment configuration that works in both popup and service worker contexts
// This avoids direct use of import.meta.env which can cause issues in service workers

interface EnvConfig {
  VITE_BACKEND_API_URL?: string
  VITE_API_KEY?: string
  VITE_HUBSPOT_CLIENT_ID?: string
  VITE_DWOLLA_ENVIRONMENT?: string
  MODE?: string
  DEV?: boolean
}

// Default values
const defaults: EnvConfig = {
  VITE_BACKEND_API_URL: 'http://localhost:3001',
  VITE_API_KEY: 'development-key',
  VITE_HUBSPOT_CLIENT_ID: '',
  VITE_DWOLLA_ENVIRONMENT: 'sandbox',
  MODE: 'development',
  DEV: true
}

// Function to safely get env values
export function getEnv(): EnvConfig {
  // Try to use import.meta.env if available (in popup context)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return {
      VITE_BACKEND_API_URL: import.meta.env.VITE_BACKEND_API_URL || defaults.VITE_BACKEND_API_URL,
      VITE_API_KEY: import.meta.env.VITE_API_KEY || defaults.VITE_API_KEY,
      VITE_HUBSPOT_CLIENT_ID: import.meta.env.VITE_HUBSPOT_CLIENT_ID || defaults.VITE_HUBSPOT_CLIENT_ID,
      VITE_DWOLLA_ENVIRONMENT: import.meta.env.VITE_DWOLLA_ENVIRONMENT || defaults.VITE_DWOLLA_ENVIRONMENT,
      MODE: import.meta.env.MODE || defaults.MODE,
      DEV: import.meta.env.DEV ?? defaults.DEV
    }
  }
  
  // Return defaults if import.meta.env is not available (service worker context)
  return defaults
}

// Export individual values for convenience
export const env = getEnv()