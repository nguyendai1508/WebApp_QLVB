const https = require('https');

const dbUrl = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${dbUrl}${path}`);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("Fetching data...");
  const staff = await request('GET', '/staff.json');
  const users = await request('GET', '/users.json');
  const tasks = await request('GET', '/tasks.json');
  
  if (!staff || !users || !tasks) return console.log("Missing data");

  const staffEntries = Object.entries(staff);
  const userEntries = Object.entries(users);
  
  // Group staff by Full_Name
  const staffByName = {};
  staffEntries.forEach(([key, s]) => {
    const name = s.fullName || s.Full_Name;
    if (!staffByName[name]) staffByName[name] = [];
    staffByName[name].push({ key, ...s });
  });
  
  // For each name, keep the first one, redirect tasks, delete others
  let tasksUpdated = 0;
  let staffDeleted = 0;
  let usersDeleted = 0;
  
  for (const [name, duplicates] of Object.entries(staffByName)) {
    if (duplicates.length <= 1) continue;
    
    console.log(`\nFixing duplicates for: ${name} (${duplicates.length} records)`);
    
    const primary = duplicates[0];
    const primaryStaffId = primary.id || primary.Staff_ID;
    const primaryKey = primary.key;
    
    const others = duplicates.slice(1);
    
    for (const other of others) {
      const otherStaffId = other.id || other.Staff_ID;
      const otherKey = other.key;
      
      // Update tasks
      for (const [tKey, t] of Object.entries(tasks)) {
        if (t.Lead_Assignee === otherStaffId || t.Lead_Assignee === otherKey || 
            t.leadAssignee === otherStaffId || t.leadAssignee === otherKey) {
            
            t.Lead_Assignee = primaryKey; // We use primaryKey because useAppStore expects Firebase key or Staff_ID
            await request('PATCH', `/tasks/${tKey}.json`, { Lead_Assignee: primaryKey });
            tasksUpdated++;
        }
      }
      
      // Delete duplicate staff
      await request('DELETE', `/staff/${otherKey}.json`);
      staffDeleted++;
      
      // Delete duplicate user that matched this staff
      const matchingUser = userEntries.find(([uKey, u]) => u.staffId === otherStaffId || u['Mã cán bộ'] === otherStaffId);
      if (matchingUser) {
          await request('DELETE', `/users/${matchingUser[0]}.json`);
          usersDeleted++;
      }
    }
  }
  
  console.log(`\nDONE! Updated ${tasksUpdated} tasks. Deleted ${staffDeleted} duplicate staff and ${usersDeleted} duplicate users.`);
}

run().catch(console.error);
