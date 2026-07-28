const https = require('https');
const querystring = require('querystring');

// Hàm extract hidden fields
function extractHiddenFields(html) {
  const fields = {};
  const regex = /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    fields[match[1]] = match[2];
  }
  return fields;
}

// 1. GET để lấy cookie và viewstate
https.get('https://qlvb-snnmt.dongnai.gov.vn/HeThong/pDangNhap.aspx', (res1) => {
  console.log("GET Set-Cookie: ", res1.headers['set-cookie']);
  let html = '';
  res1.on('data', d => html += d);
  res1.on('end', () => {
    const hiddenFields = extractHiddenFields(html);
    let cookieStr = res1.headers['set-cookie'] ? res1.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
    console.log("Cookie sau GET: ", cookieStr);
    
    const payload = querystring.stringify({
      ...hiddenFields,
      'txtTenDangNhap': 'DaiNV',
      'txtMatKhau': 'Dai@885336',
      'txtTenDangNhapUQ': '', // field có trong form
      '__EVENTTARGET': 'lnkDangnhap', 
      '__EVENTARGUMENT': ''
    });

    const options = {
      hostname: 'qlvb-snnmt.dongnai.gov.vn',
      path: '/HeThong/pDangNhap.aspx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res2) => {
      console.log('Status Code:', res2.statusCode);
      console.log('Headers:', res2.headers);
      let res2Body = '';
      res2.on('data', d => res2Body += d);
      res2.on('end', () => {
        let authCookies = res2.headers['set-cookie'] || [];
        let finalCookie = cookieStr + '; ' + authCookies.map(c => c.split(';')[0]).join('; ');
        console.log('Final Cookie:', finalCookie);
        
        // Gọi thử trang danh sách
        const listOptions = {
          hostname: 'qlvb-snnmt.dongnai.gov.vn',
          path: '/VanBanDen/pDanhSachVanBanDenNew.aspx',
          method: 'GET',
          headers: {
            'Cookie': finalCookie,
            'User-Agent': 'Mozilla/5.0'
          }
        };
        const req3 = https.request(listOptions, (res3) => {
           console.log('List Page Status Code:', res3.statusCode);
           let html3 = '';
           res3.on('data', d => html3 += d);
           res3.on('end', () => {
              console.log('List Page HTML Length:', html3.length);
              console.log('Has grdVanBan?', html3.includes('grdVanBan'));
           });
        });
        req3.end();
      });
    });

    req.write(payload);
    req.end();
  });
});
