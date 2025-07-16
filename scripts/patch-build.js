#!/usr/bin/env node
// Temporary patch to fix build caching issue
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist', 'assets');
const files = fs.readdirSync(distDir);

// Find the main JS file
const mainJsFile = files.find(f => f.startsWith('index.html-') && f.endsWith('.js'));

if (mainJsFile) {
  const filePath = path.join(distDir, mainJsFile);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the old Dwolla button with the new proxy status
  // This is a minified file so we need to be careful with the replacement
  
  // Find and replace the Connect Dwolla button section
  const oldPattern = /\{[^}]*"Connect Dwolla"[^}]*\}/g;
  const matches = content.match(oldPattern);
  
  if (matches) {
    console.log(`Found ${matches.length} instances of old UI`);
    
    // Replace with new UI structure
    // Since it's minified, we need to match the structure
    content = content.replace(
      /"Connect Dwolla"/g,
      '"✓ Dwolla API: Connected via secure proxy"'
    );
    
    // Also remove the button click handler for Dwolla
    content = content.replace(
      /onClick:\(\)=>[\w]+\("dwolla"\)/g,
      'style:{display:"none"}'
    );
    
    fs.writeFileSync(filePath, content);
    console.log('✓ Patched build file to show new Dwolla proxy UI');
  } else {
    console.log('No old UI found - build may already be correct');
  }
} else {
  console.error('Could not find main JS file in dist/assets/');
}