const https = require('https');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const dbUrl = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';
  
  const staff = await fetchJson(`${dbUrl}/staff.json`);
  const tasks = await fetchJson(`${dbUrl}/tasks.json`);
  const docs = await fetchJson(`${dbUrl}/incomingDocs.json`);
  
  const staffList = Object.keys(staff || {}).map(k => ({ id: k, ...staff[k] }));
  const taskList = Object.keys(tasks || {}).map(k => ({ id: k, ...tasks[k] }));
  const docList = Object.keys(docs || {}).map(k => ({ id: k, ...docs[k] }));
  
  console.log(`\n--- VĂN BẢN ĐẾN (INCOMING DOCS) ---`);
  console.log(`Tổng số Văn bản đến: ${docList.length}`);
  
  console.log(`\n--- CÔNG VIỆC (TASKS) ---`);
  console.log(`Tổng số Công việc: ${taskList.length}`);
  console.log(`Trung bình số công việc mỗi văn bản: ${(taskList.length / docList.length).toFixed(1)}`);
  
  console.log(`\n--- TẢI CÔNG VIỆC TỪNG CÁN BỘ (DASHBOARD MỚI) ---`);
  
  // Aggregate tasks by Full_Name
  const staffSummary = {};
  for (const s of staffList) {
      if (!staffSummary[s.Full_Name]) {
          staffSummary[s.Full_Name] = { total: 0, lead: 0, coop: 0 };
      }
      
      const myTasks = taskList.filter(t => t.Lead_Assignee === s.id || t.leadAssignee === s.id);
      staffSummary[s.Full_Name].total += myTasks.length;
      
      myTasks.forEach(t => {
          if (t.Role === 'Chủ trì' || t.role === 'Chủ trì') staffSummary[s.Full_Name].lead++;
          else if (t.Role === 'Phối hợp' || t.role === 'Phối hợp') staffSummary[s.Full_Name].coop++;
      });
  }
  
  for (const [name, stats] of Object.entries(staffSummary)) {
      if (stats.total === 0) continue;
      console.log(`${name.padEnd(25)} | Tổng việc: ${stats.total.toString().padEnd(2)} | Chủ trì: ${stats.lead.toString().padEnd(2)} | Phối hợp: ${stats.coop}`);
  }
}

run().catch(console.error);
