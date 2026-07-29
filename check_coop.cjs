const https = require('https');
https.get('https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app/tasks.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const tasks = Object.values(parsed || {});
      console.log('Total tasks in DB:', tasks.length);
      
      let totalCoAssignees = 0;
      tasks.forEach(t => {
         if (t.coAssignee || t.Co_Assignee || t.Co_Assignees) {
             totalCoAssignees++;
         }
      });
      console.log('Total tasks with Co_Assignees:', totalCoAssignees);
    } catch(e) { console.error(e); }
  });
}).on('error', console.error);
