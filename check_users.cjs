const https = require('https');
const dbUrl = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';

https.get(`${dbUrl}/users.json`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const users = JSON.parse(data);
    const names = Object.values(users || {}).map(u => u.username || u['Tên đăng nhập']);
    console.log("Total users in DB:", names.length);
    const counts = {};
    names.forEach(n => counts[n] = (counts[n] || 0) + 1);
    console.log("User counts:", counts);
  });
});
