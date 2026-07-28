const fs = require('fs');
const https = require('https');

https.get('https://qlvb-snnmt.dongnai.gov.vn/HeThong/pDangNhap.aspx', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('login_page.html', data);
    console.log("Đã tải xong login_page.html, chiều dài: " + data.length);
    
    // Tìm các thẻ input
    const inputRegex = /<input[^>]*>/gi;
    let match;
    console.log("Danh sách các input:");
    while ((match = inputRegex.exec(data)) !== null) {
      let input = match[0];
      let idMatch = input.match(/id="([^"]+)"/i);
      let nameMatch = input.match(/name="([^"]+)"/i);
      let typeMatch = input.match(/type="([^"]+)"/i);
      console.log(`- type: ${typeMatch ? typeMatch[1] : 'text/none'}, name: ${nameMatch ? nameMatch[1] : ''}, id: ${idMatch ? idMatch[1] : ''}`);
    }
  });
}).on('error', (err) => {
  console.log("Lỗi: " + err.message);
});
