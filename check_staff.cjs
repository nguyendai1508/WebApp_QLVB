const https = require('https');
const dbUrl = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';

https.get(`${dbUrl}/staff.json`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const staff = JSON.parse(data);
    const names = Object.values(staff || {}).map(s => s.fullName || s.Full_Name);
    console.log("Total staff in DB:", names.length);
    const counts = {};
    names.forEach(n => counts[n] = (counts[n] || 0) + 1);
    console.log("Name counts:", counts);
  });
});
