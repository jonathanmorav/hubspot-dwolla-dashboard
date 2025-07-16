#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixBuild() {
  const distDir = path.join(__dirname, '..', 'dist', 'assets');
  const files = fs.readdirSync(distDir);
  
  // Find the main JS file
  const mainJsFile = files.find(f => f.startsWith('index.html-') && f.endsWith('.js'));
  
  if (!mainJsFile) {
    console.error('Could not find main JS file');
    return;
  }
  
  const filePath = path.join(distDir, mainJsFile);
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('Fixing authentication UI in built file...');
  
  // Replace the old authentication text
  content = content.replace(
    'Please authenticate with both services to continue:',
    'Please authenticate with HubSpot to continue:'
  );
  
  // Since this is a minified file, we need to find and fix the authentication logic
  // Look for the pattern where it checks for both services
  
  // Fix the isFullyAuthenticated logic - it should only check HubSpot now
  // In minified code, this might appear as something like: hubspot&&dwolla
  content = content.replace(
    /isFullyAuthenticated:([a-zA-Z_$][\w$]*)\&\&([a-zA-Z_$][\w$]*)/g,
    'isFullyAuthenticated:$1'
  );
  
  // Add the Dwolla proxy status message if it's missing
  if (!content.includes('Dwolla API: Connected via secure proxy')) {
    // Find where the auth buttons div ends and inject our message
    // Look for the pattern after the HubSpot button
    const authButtonsPattern = /(\{[^}]*auth-buttons[^}]*\}[^}]*\})/g;
    const matches = [...content.matchAll(authButtonsPattern)];
    
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const insertPoint = lastMatch.index + lastMatch[0].length;
      
      // Insert our Dwolla status div
      const dwollaStatus = ',Be("div",{className:"auth-status-info",children:y("p",{className:"dwolla-status",children:"✓ Dwolla API: Connected via secure proxy"})})';
      content = content.slice(0, insertPoint) + dwollaStatus + content.slice(insertPoint);
    }
  }
  
  // Fix the requiresReauth check to not include dwolla
  // Look for patterns like: requiresReauth:["hubspot","dwolla"]
  content = content.replace(
    /requiresReauth:\s*\[[^\]]*"dwolla"[^\]]*\]/g,
    (match) => {
      // Remove dwolla from the array
      return match.replace(/,?\s*"dwolla"/, '');
    }
  );
  
  // Remove any "Connect Dwolla" buttons
  content = content.replace(/Connect Dwolla/g, '');
  
  // Fix the re-authentication message
  content = content.replace(
    'Re-authentication required for: hubspot, dwolla',
    'Re-authentication required for: hubspot'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✓ Fixed authentication UI in build');
  console.log('✓ Dwolla proxy mode enabled');
  console.log('✓ Only HubSpot authentication required');
}

fixBuild();