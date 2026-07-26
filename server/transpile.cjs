const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const dir = 'e:/Railaware/server';

function walkDir(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.js') && file !== 'server.js' && file !== 'env.js' && file !== 'logger.js') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('import ') || content.includes('export ') || content.includes('import(')) {
        console.log(`Transpiling: ${fullPath}`);

        const result = babel.transformSync(content, {
          plugins: ['@babel/plugin-transform-modules-commonjs'],
          sourceType: 'module'
        });

        let code = result.code;

        fs.writeFileSync(fullPath, code);
      }
    }
  }
}

walkDir(dir);
console.log("Transpilation complete.");
