const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('test_dom.html', 'utf8');
const dom = new JSDOM(html);
const row = dom.window.document.querySelector('tr.GridRow');
if (row) {
    const tds = row.querySelectorAll('td');
    tds.forEach((td, j) => console.log(j + ': ' + td.textContent.trim().replace(/\s+/g, ' ').substring(0,50)));
}
