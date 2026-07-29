const fs = require('fs');
const html = fs.readFileSync('test_dom.html', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const as = dom.window.document.querySelectorAll('td a');
as.forEach(a => console.log(a.href));
