const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const outFile = path.join(publicDir, 'pdf.worker.min.js');

const candidates = [
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.js'),
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'esm', 'build', 'pdf.worker.min.js'),
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'web', 'pdf.worker.min.js'),
];

function findAndCopy() {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log('Found worker at:', candidate);
      fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(candidate, outFile);
      console.log('Copied pdf.worker.min.js to public folder');
      return;
    }
  }
  console.error('Could not find pdf.worker.min.js in node_modules/pdfjs-dist. Make sure pdfjs-dist is installed.');
  process.exit(1);
}

findAndCopy();
