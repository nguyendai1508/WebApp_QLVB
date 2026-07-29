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
  
  console.log("Fetching staff, tasks, and incomingDocs...");
  const staff = await fetchJson(`${dbUrl}/staff.json`);
  const tasks = await fetchJson(`${dbUrl}/tasks.json`);
  const docs = await fetchJson(`${dbUrl}/incomingDocs.json`);
  
  const staffList = Object.keys(staff || {}).map(k => ({ id: k, ...staff[k] }));
  const taskList = Object.keys(tasks || {}).map(k => ({ id: k, ...tasks[k] }));
  const docList = Object.keys(docs || {}).map(k => ({ id: k, ...docs[k] }));
  
  console.log(`\n--- VĂN BẢN ĐẾN (INCOMING DOCS) ---`);
  console.log(`Tổng số Văn bản đến: ${docList.length}`);
  if (docList.length > 0) {
      console.log(`\nVD Văn bản 1 (Sign_Number: ${docList[0].signNumber || docList[0].Sign_Number}):`);
      console.log(` - Chủ trì (leadAssignee): ${docList[0].leadAssignee || docList[0].Lead_Assignee}`);
      console.log(` - Phối hợp (coAssignee): ${docList[0].coAssignee || docList[0].Co_Assignee}`);
      
      console.log(`\nVD Văn bản 2 (Sign_Number: ${docList[1].signNumber || docList[1].Sign_Number}):`);
      console.log(` - Chủ trì (leadAssignee): ${docList[1].leadAssignee || docList[1].Lead_Assignee}`);
      console.log(` - Phối hợp (coAssignee): ${docList[1].coAssignee || docList[1].Co_Assignee}`);
  }

  console.log(`\n--- CÔNG VIỆC (TASKS) ---`);
  console.log(`Tổng số Công việc: ${taskList.length}`);
  
  // Đếm số việc (Chủ trì / Phối hợp) của 1 người cụ thể để chứng minh
  const exampleStaffId = '-OyhJg_Pcx8M0NgbDatm'; // Đặng Thị Lê
  console.log(`\nPhân tích việc của Cán bộ ID: ${exampleStaffId} (Đặng Thị Lê):`);
  const myTasks = taskList.filter(t => t.leadAssignee === exampleStaffId || t.Lead_Assignee === exampleStaffId);
  console.log(` - Tổng số việc gán cho ID này (Lead_Assignee trong DB): ${myTasks.length}`);
  
  let myLead = 0, myCoop = 0, myOther = 0;
  myTasks.forEach(t => {
      if (t.Role === 'Chủ trì' || t.role === 'Chủ trì') myLead++;
      else if (t.Role === 'Phối hợp' || t.role === 'Phối hợp') myCoop++;
      else myOther++;
  });
  console.log(` - Trong đó, Role="Chủ trì": ${myLead}`);
  console.log(` - Trong đó, Role="Phối hợp": ${myCoop}`);
  console.log(` - Khác: ${myOther}`);
  
  if (myTasks.length > 0) {
      console.log(`\nVD 1 Công việc Phối hợp của Đặng Thị Lê:`);
      const coopTask = myTasks.find(t => t.Role === 'Phối hợp');
      console.log(JSON.stringify(coopTask, null, 2));
  }
}

run().catch(console.error);
