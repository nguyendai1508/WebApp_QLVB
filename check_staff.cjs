const https = require('https');
https.get('https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app/staff.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const keys = Object.keys(parsed || {});
      console.log('Total staff in DB:', keys.length);
      keys.forEach(k => {
          console.log(`ID: ${k}, Name: ${parsed[k].fullName || parsed[k].Full_Name}`);
      });
    } catch(e) { console.error(e); }
  });
}).on('error', console.error);
