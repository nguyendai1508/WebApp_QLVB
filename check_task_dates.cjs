const https = require('https');
https.get('https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app/tasks.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const tasks = Object.values(parsed || {});
      console.log('Total tasks:', tasks.length);
      console.log('Sample task 1:', JSON.stringify(tasks[0], null, 2));
      console.log('Sample task 100:', JSON.stringify(tasks[100], null, 2));
    } catch(e) { console.error(e); }
  });
}).on('error', console.error);
