const https = require('https');
https.get('https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app/incomingDocs.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const docs = Object.values(parsed || {});
      console.log('Total incomingDocs in DB:', docs.length);
      
      const leadCounts = {};
      const coopCounts = {};
      docs.forEach(d => {
         const lead = d.leadAssignee || d.Lead_Assignee || d.Assignee_ID || 'Unknown';
         leadCounts[lead] = (leadCounts[lead] || 0) + 1;
         
         if (d.coAssignee || d.Co_Assignee || d.Co_Assignees) {
             const coops = (d.coAssignee || d.Co_Assignee || d.Co_Assignees).split(',');
             coops.forEach(c => {
                 const cTrim = c.trim();
                 coopCounts[cTrim] = (coopCounts[cTrim] || 0) + 1;
             });
         }
      });
      console.log('Docs Lead counts:', leadCounts);
      console.log('Docs Coop counts:', coopCounts);
    } catch(e) { console.error(e); }
  });
}).on('error', console.error);
