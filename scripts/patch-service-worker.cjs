// Post-build script to patch service worker for compatibility
// Removes window references that cause errors in service worker context

const fs = require('fs');
const path = require('path');

function patchServiceWorker() {
  const distDir = path.join(__dirname, '..', 'dist', 'assets');
  
  // Find all service worker files
  const files = fs.readdirSync(distDir).filter(file => 
    file.startsWith('service-worker') && file.endsWith('.js')
  );
  
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace window.dispatchEvent with a no-op for service workers
    if (content.includes('window.dispatchEvent')) {
      console.log(`Patching ${file} to remove window references...`);
      
      // Replace the problematic preload error handling
      content = content.replace(
        /window\.dispatchEvent\([^)]+\)/g,
        '/* window.dispatchEvent removed for service worker compatibility */'
      );
      
      // Also remove any document references
      content = content.replace(
        /document\.createElement/g,
        '/* document.createElement removed */'
      );
      
      content = content.replace(
        /document\.querySelector/g,
        '/* document.querySelector removed */'
      );
      
      content = content.replace(
        /document\.getElementsByTagName/g,
        '/* document.getElementsByTagName removed */'
      );
      
      content = content.replace(
        /document\.head\.appendChild/g,
        '/* document.head.appendChild removed */'
      );
      
      // Simplify the preload function to avoid DOM operations
      content = content.replace(
        /const e=function\(\)\{[^}]+\}[^,]+,/g,
        'const e="modulepreload",'
      );
      
      // Replace the entire problematic dynamic import function with a simpler version
      // This removes all DOM manipulation code
      const dynamicImportRegex = /const [a-zA-Z]+=function\([^)]*\)\{[^}]*Promise\.allSettled[^}]+\}[^;]+;/gs;
      if (dynamicImportRegex.test(content)) {
        content = content.replace(dynamicImportRegex, 
          'const r=async function(moduleFactory,deps){try{return await moduleFactory()}catch(e){console.error("Module load error:",e);throw e}};'
        );
      }
      
      // Write the patched content back
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Patched ${file}`);
      
      // Also update the loader to use classic script syntax
      const loaderPath = path.join(__dirname, '..', 'dist', 'service-worker-loader.js');
      const loaderContent = `importScripts('./assets/${file}');`;
      fs.writeFileSync(loaderPath, loaderContent, 'utf8');
      console.log('✓ Updated service-worker-loader.js');
    }
  });
  
  console.log('Service worker patching complete!');
}

// Run the patch
patchServiceWorker();