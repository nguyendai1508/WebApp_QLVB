const fs = require('fs');

try {
  const harData = JSON.parse(fs.readFileSync('qlvb-snnmt.dongnai.gov.vn.har', 'utf8'));
  const entries = harData.log.entries;
  
  console.log("=== PHÂN TÍCH FILE HAR ===");
  
  // 1. Tìm Request POST đăng nhập (Thường chứa login, DangNhap, v.v)
  const loginEntry = entries.find(e => 
    e.request.method === 'POST' && 
    (e.request.url.includes('DangNhap') || e.request.url.includes('login'))
  );
  
  if (loginEntry) {
    console.log("\n[1] URL ĐĂNG NHẬP: " + loginEntry.request.url);
    if (loginEntry.request.postData && loginEntry.request.postData.params) {
      console.log("\n[1.1] PARAMETERS GỬI LÊN (PAYLOAD):");
      loginEntry.request.postData.params.forEach(p => {
        // Rút gọn viewstate nếu quá dài
        let val = p.value || '';
        if (val.length > 50) val = val.substring(0, 50) + '...';
        console.log(`- ${p.name}: ${val}`);
      });
    }
  } else {
    console.log("\n[1] KHÔNG TÌM THẤY REQUEST POST ĐĂNG NHẬP!");
  }
  
  // 2. Tìm Request GET Danh sách văn bản
  const listEntry = entries.find(e => 
    e.request.method === 'GET' && 
    (e.request.url.includes('DanhSach') || e.request.url.includes('VanBanDen')) &&
    e.response.content.mimeType.includes('text/html')
  );
  
  if (listEntry) {
    console.log("\n[2] URL DANH SÁCH: " + listEntry.request.url);
    let html = listEntry.response.content.text;
    if (html) {
      // Decode base64 nếu cần
      if (listEntry.response.content.encoding === 'base64') {
        html = Buffer.from(html, 'base64').toString('utf8');
      }
      console.log(`\n[2.1] CHIỀU DÀI HTML NHẬN ĐƯỢC: ${html.length} chars`);
      // Lưu html ra file để xem nội dung DOM
      fs.writeFileSync('test_dom.html', html, 'utf8');
      console.log("\n[2.2] Đã lưu HTML ra file test_dom.html để phân tích Regex.");
    }
  } else {
    console.log("\n[2] KHÔNG TÌM THẤY REQUEST HTML DANH SÁCH!");
  }

} catch (err) {
  console.error("Lỗi đọc file HAR: ", err);
}
