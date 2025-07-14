import { build } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildServiceWorker() {
  console.log('Building service worker...');
  
  try {
    // Build the service worker using the separate config
    await build({
      configFile: path.join(rootDir, 'vite.config.sw.ts'),
      mode: 'production'
    });
    
    // Copy the built service worker to the main dist folder
    const swSource = path.join(rootDir, 'dist-sw', 'service-worker.js');
    const swDest = path.join(rootDir, 'dist', 'service-worker.js');
    
    // Ensure dist directory exists
    if (!fs.existsSync(path.join(rootDir, 'dist'))) {
      fs.mkdirSync(path.join(rootDir, 'dist'), { recursive: true });
    }
    
    // Copy the service worker
    fs.copyFileSync(swSource, swDest);
    console.log('✓ Service worker built and copied to dist/service-worker.js');
    
    // Clean up temporary build directory
    fs.rmSync(path.join(rootDir, 'dist-sw'), { recursive: true, force: true });
    
    // Update manifest.json to point to the bundled service worker
    const manifestPath = path.join(rootDir, 'dist', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      
      // Update service worker path and ensure it's not a module
      if (manifest.background) {
        manifest.background.service_worker = 'service-worker.js';
        delete manifest.background.type; // Remove module type if present
      }
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✓ Updated manifest.json');
    }
    
    console.log('✓ Service worker build complete');
  } catch (error) {
    console.error('Failed to build service worker:', error);
    process.exit(1);
  }
}

buildServiceWorker();