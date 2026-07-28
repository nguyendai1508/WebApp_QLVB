import fs from 'fs';
let text = fs.readFileSync('chrome-extension/content.js', 'utf8');
text = text.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('chrome-extension/content.js', text);
