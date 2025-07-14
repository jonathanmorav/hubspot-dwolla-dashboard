import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Unified Customer Dashboard',
  version: '1.0.0',
  description: 'Unified view of customer data from HubSpot and Dwolla',
  
  permissions: [
    'storage',
    'identity',
    'alarms'
  ],
  
  host_permissions: [
    'https://api.hubapi.com/*',
    'https://api.dwolla.com/*',
    'https://api-sandbox.dwolla.com/*',
    'https://app.hubspot.com/*',
    'https://accounts.google.com/*'
  ],
  
  background: {
    service_worker: 'src/background/service-worker-static.ts'
  },
  
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'public/icons/icon-16.png',
      '32': 'public/icons/icon-32.png',
      '48': 'public/icons/icon-48.png',
      '128': 'public/icons/icon-128.png'
    }
  },
  
  icons: {
    '16': 'public/icons/icon-16.png',
    '32': 'public/icons/icon-32.png',
    '48': 'public/icons/icon-48.png',
    '128': 'public/icons/icon-128.png'
  },
  
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'"
  }
})