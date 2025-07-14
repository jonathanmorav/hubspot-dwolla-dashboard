import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the root directory
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Find the service worker file
const files = fs.readdirSync(path.join(distDir, 'assets'));
const serviceWorkerFile = files.find(f => f.startsWith('service-worker-static.ts-') && f.endsWith('.js'));

if (!serviceWorkerFile) {
  console.error('Service worker file not found in dist/assets');
  process.exit(1);
}

// Update the service-worker-loader.js
const loaderPath = path.join(distDir, 'service-worker-loader.js');
const loaderContent = `// Service worker loader for Chrome extension
// Use importScripts instead of ES6 import
try {
  importScripts('/assets/${serviceWorkerFile}');
} catch (error) {
  console.error('Failed to load service worker:', error);
}
`;

fs.writeFileSync(loaderPath, loaderContent);
console.log('✓ Fixed service worker loader');

// Update manifest.json to ensure it uses module type is removed
const manifestPath = path.join(distDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

if (manifest.background && manifest.background.type === 'module') {
  delete manifest.background.type;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✓ Removed module type from manifest');
}

console.log('✓ Service worker fix complete');