const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist' && f !== '.next') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const targetExtensions = ['.tsx', '.ts', '.jsx', '.js'];

walkDir(__dirname, (filePath) => {
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath);
  
  // Skip script files
  if (fileName.startsWith('replace_all_sizes')) {
    return;
  }
  
  if (targetExtensions.includes(ext)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('text-[9px]')) {
      const originalLength = content.length;
      content = content.replace(/text-\[9px\]/g, 'text-[10px]');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated 9px text sizes in: ${path.relative(__dirname, filePath)}`);
    }
  }
});
