import { build } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildExtension() {
  console.log('Building Chrome Extension...\n');
  
  // Load environment variables based on NODE_ENV
  const isProduction = process.env.NODE_ENV === 'production';
  const envFile = isProduction ? '.env.production' : '.env.development';
  const envPath = path.join(rootDir, envFile);
  
  console.log(`📦 Building for ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`📁 Using environment file: ${envFile}`);
  
  // Load environment variables
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✓ Environment variables loaded\n');
  } else {
    console.log(`⚠️  Environment file ${envFile} not found, using defaults\n`);
  }
  
  try {
    // Step 1: Run TypeScript check
    console.log('1. Running TypeScript check...');
    try {
      execSync('./node_modules/.bin/tsc --noEmit --skipLibCheck', { stdio: 'inherit', cwd: rootDir });
      console.log('✓ TypeScript check passed\n');
    } catch (error) {
      console.error('✗ TypeScript check failed');
      process.exit(1);
    }
    
    // Step 2: Build main extension with Vite
    console.log('2. Building main extension...');
    execSync('./node_modules/.bin/vite build', { stdio: 'inherit', cwd: rootDir });
    console.log('✓ Main extension built\n');
    
    // Step 3: Use the compiled service worker instead of custom one
    console.log('3. Installing service worker...');
    
    // Find the compiled service worker in dist/assets
    const assetsDir = path.join(rootDir, 'dist', 'assets');
    const assetFiles = fs.readdirSync(assetsDir);
    const compiledSwFile = assetFiles.find(f => f.startsWith('service-worker-static.ts-') && f.endsWith('.js'));
    
    if (!compiledSwFile) {
      console.error('✗ Compiled service worker not found');
      process.exit(1);
    }
    
    const swSource = path.join(assetsDir, compiledSwFile);
    const swDest = path.join(rootDir, 'dist', 'service-worker.js');
    
    // Read the compiled service worker
    let swContent = fs.readFileSync(swSource, 'utf-8');
    
    // Replace environment variables in compiled service worker
    const replacements = {
      'import.meta.env.VITE_HUBSPOT_CLIENT_ID': `"${process.env.VITE_HUBSPOT_CLIENT_ID || '4e69a57d-eb8b-45ef-9088-c822b0eb4d08'}"`,
      'import.meta.env.VITE_DWOLLA_CLIENT_ID': `"${process.env.VITE_DWOLLA_CLIENT_ID || 'aaEBh0JXyCHGdDT8sUvgQn3bWys61zdrXbCPcwU1WkhdMqMVZX'}"`,
      'import.meta.env.VITE_DWOLLA_ENVIRONMENT': `"${process.env.VITE_DWOLLA_ENVIRONMENT || 'sandbox'}"`,
      'import.meta.env.VITE_BACKEND_API_URL': `"${process.env.VITE_BACKEND_API_URL || 'http://localhost:3001'}"`,
      'import.meta.env.VITE_API_KEY': `"${process.env.VITE_API_KEY || 'development-key'}"`
    };
    
    // Replace environment variables in the compiled code
    Object.entries(replacements).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      swContent = swContent.replace(regex, value);
      console.log(`  - ${key.replace('import.meta.env.', '')}: ${value.slice(1, -1)}`);
    });
    
    // Write the processed service worker
    fs.writeFileSync(swDest, swContent);
    console.log('✓ Custom service worker installed with environment variables\n');
    
    // Step 4: Fix manifest.json
    console.log('4. Fixing manifest.json...');
    const manifestPath = path.join(rootDir, 'dist', 'manifest.json');
    
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      
      // Update service worker configuration
      if (manifest.background) {
        // Ensure service worker points to the bundled file
        manifest.background.service_worker = 'service-worker.js';
        // Remove module type - Chrome doesn't support ES6 modules in service workers
        delete manifest.background.type;
      }
      
      // Write updated manifest
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✓ Manifest updated\n');
    } else {
      // If no manifest exists from crx plugin, copy production manifest
      const prodManifest = path.join(rootDir, 'manifest.production.json');
      if (fs.existsSync(prodManifest)) {
        fs.copyFileSync(prodManifest, manifestPath);
        console.log('✓ Production manifest copied\n');
      }
    }
    
    // Step 5: Verify the service worker is valid
    console.log('5. Verifying service worker...');
    const swContentToVerify = fs.readFileSync(swDest, 'utf-8');
    
    // Check for ES6 imports/exports
    if (swContentToVerify.includes('import ') || swContentToVerify.includes('export ')) {
      console.error('✗ Service worker still contains ES6 import/export statements');
      console.error('This will cause errors in Chrome. Please check the build configuration.');
      process.exit(1);
    }
    
    // Check that it's an IIFE
    if (!swContentToVerify.includes('(function') && !swContentToVerify.includes('(()=>')) {
      console.warn('⚠ Service worker may not be properly wrapped as IIFE');
    }
    
    console.log('✓ Service worker verification passed\n');
    
    // Step 6: Copy icons if they exist
    const iconsSource = path.join(rootDir, 'public', 'icons');
    const iconsDest = path.join(rootDir, 'dist', 'icons');
    
    if (fs.existsSync(iconsSource) && !fs.existsSync(iconsDest)) {
      fs.mkdirSync(iconsDest, { recursive: true });
      const iconFiles = fs.readdirSync(iconsSource);
      iconFiles.forEach(file => {
        fs.copyFileSync(
          path.join(iconsSource, file),
          path.join(iconsDest, file)
        );
      });
      console.log('✓ Icons copied\n');
    }
    
    console.log('🎉 Extension build complete!');
    console.log('\nNext steps:');
    console.log('1. Load the extension from the dist/ folder in Chrome');
    console.log('2. Get the Extension ID from chrome://extensions');
    console.log('3. Configure OAuth with the Extension ID');
    
  } catch (error) {
    console.error('\n✗ Build failed:', error);
    process.exit(1);
  }
}

buildExtension();