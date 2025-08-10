// convert-font-to-js.js
import amiriFont from '../fonts/Amiri-Regular-normal.js';

const fs = require('fs');
const path = require('path');

const inPath = path.join(__dirname, 'src', 'fonts', 'Amiri-Regular.ttf'); 
const outPath = path.join(__dirname, 'src', 'fonts', 'Amiri-Regular-normal.js');

const fontBuffer = fs.readFileSync(inPath);
const base64 = fontBuffer.toString('base64');
const fileContent = `export default "${base64}";\n`;

fs.writeFileSync(outPath, fileContent);
console.log('Done ->', outPath);
