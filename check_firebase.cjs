const https = require('https');
https.get('https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app/tasks.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.error) {
        console.log("Firebase error:", parsed.error);
        return;
      }
      const keys = Object.keys(parsed || {});
      console.log('Total tasks in DB:', keys.length);
      
      // Let's count how many tasks each person has
      const counts = {};
      Object.values(parsed || {}).forEach(t => {
         const name = t.leadAssignee || t.Lead_Assignee || t.Assignee_ID || 'Unknown';
         counts[name] = (counts[name] || 0) + 1;
      });
      console.log('Task counts by Lead_Assignee:', counts);
    } catch(e) { console.error(e); }
  });
}).on('error', console.error);
