const fs = require('fs');

const html = fs.readFileSync('test_dom.html', 'utf8');
const rows = [];

const tableMatch = html.match(/<table[^>]*id="[^"]*grdVanBan[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
if (!tableMatch) {
  console.log("KHÔNG TÌM THẤY BẢNG 'DanhSach' trong DOM!");
} else {
  console.log("TÌM THẤY BẢNG. Bắt đầu parse row...");
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(tableMatch[1])) !== null) {
    const trHtml = trMatch[1];
    if (trHtml.includes('<th')) continue; 
    
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    
    while ((tdMatch = tdRegex.exec(trHtml)) !== null) {
      // Phân tích lấy file đính kèm
      let files = [];
      let tdHtml = tdMatch[1]; // Cột có thể chứa file
      const fileRegex = /href='([^']+fdownload=1&FileDownload=\d+)'[^>]*>.*?<\/a><a href='[^']*'[^>]*>([^<]+)<\/a>/gi;
      let fMatch;
      while ((fMatch = fileRegex.exec(tdHtml)) !== null) {
         let url = fMatch[1];
         let fName = fMatch[2].trim();
         if (!url.startsWith('http')) {
            url = 'https://qlvb-snnmt.dongnai.gov.vn' + (url.startsWith('/') ? '' : '/') + url;
         }
         files.push({ url: url.replace(/&amp;/g, '&'), fileName: fName });
      }

      let text = tdHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      text = text.replace(/\s+/g, ' '); 
      tds.push(text);
    }
    
    if (tds.length >= 6) {
      rows.push({ tds, files });
    }
  }
  
  // Dừng sau dòng đầu tiên để tránh console log quá nhiều
}
