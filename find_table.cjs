const fs = require('fs');
const html = fs.readFileSync('test_dom.html', 'utf8');

const tableRegex = /<table([^>]*)>/gi;
let match;
console.log("Danh sách các thẻ table trong trang:");
while ((match = tableRegex.exec(html)) !== null) {
  // Extract id attributes if they exist
  const attrs = match[1];
  const idMatch = attrs.match(/id="([^"]*)"/i);
  if (idMatch) {
    console.log("- Table ID: " + idMatch[1]);
  } else {
    // console.log("- Table không có ID: " + attrs.substring(0, 50));
  }
}
