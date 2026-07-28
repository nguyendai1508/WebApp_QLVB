const fs = require('fs');
const html = fs.readFileSync('login_page.html', 'utf8');

const btnRegex = /<(a|button)[^>]*>([\s\S]*?)<\/(a|button)>/gi;
let match;
while ((match = btnRegex.exec(html)) !== null) {
  let tag = match[0];
  if (tag.toLowerCase().includes('đăng nhập') || tag.toLowerCase().includes('login') || tag.toLowerCase().includes('dangnhap')) {
    console.log("NÚT SUBMIT TÌM THẤY:");
    console.log(tag.replace(/\s+/g, ' '));
  }
}
