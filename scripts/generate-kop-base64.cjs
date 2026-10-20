const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '..', 'KOP SMK.png');
const outPath = path.join(__dirname, '..', 'lib', 'kop-image.ts');

const buf = fs.readFileSync(imgPath);
const b64 = buf.toString('base64');
const tsContent = `export const REPORT_HEADER_IMAGE_BASE64 = "data:image/png;base64,${b64}";\n`;

fs.writeFileSync(outPath, tsContent, 'utf8');
console.log('Successfully written lib/kop-image.ts, length:', tsContent.length);
