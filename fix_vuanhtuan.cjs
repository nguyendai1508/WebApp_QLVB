const https = require('https');

const dbUrl = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${dbUrl}${path}`);
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(data ? JSON.parse(data) : null); }
        catch (e) { resolve(data); }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const staff = await request('GET', '/staff.json');
  const users = await request('GET', '/users.json');
  const tasks = await request('GET', '/tasks.json');
  
  if (!staff || !users || !tasks) return console.log("Missing data");

  const staffEntries = Object.entries(staff);
  const userEntries = Object.entries(users);
  
  // Find vuanhtuan and tuanva
  let vuanhtuanUserKey, vuanhtuanStaffId, vuanhtuanStaffKey;
  let tuanvaUserKey, tuanvaStaffId, tuanvaStaffKey;

  for (const [k, u] of userEntries) {
      if (u.username === 'vuanhtuan') {
          vuanhtuanUserKey = k;
          vuanhtuanStaffId = u.staffId || u['Mã cán bộ'];
      }
      if (u.username === 'tuanva.ubxphurieng') {
          tuanvaUserKey = k;
          tuanvaStaffId = u.staffId || u['Mã cán bộ'];
      }
  }

  for (const [k, s] of staffEntries) {
      if (s.Staff_ID === vuanhtuanStaffId || s.id === vuanhtuanStaffId) {
          vuanhtuanStaffKey = k;
      }
      if (s.Staff_ID === tuanvaStaffId || s.id === tuanvaStaffId) {
          tuanvaStaffKey = k;
      }
  }

  if (!vuanhtuanUserKey || !tuanvaUserKey) {
      console.log("One of the users is missing, nothing to fix.");
      return;
  }

  console.log(`Merging vuanhtuan (${vuanhtuanStaffKey}) -> tuanva (${tuanvaStaffKey})`);

  let updatedTasks = 0;
  for (const [tKey, t] of Object.entries(tasks)) {
      let updated = false;
      if (t.Lead_Assignee === vuanhtuanStaffId || t.Lead_Assignee === vuanhtuanStaffKey) {
          t.Lead_Assignee = tuanvaStaffKey;
          await request('PATCH', `/tasks/${tKey}.json`, { Lead_Assignee: tuanvaStaffKey });
          updated = true;
      }
      if (t.leadAssignee === vuanhtuanStaffId || t.leadAssignee === vuanhtuanStaffKey) {
          await request('PATCH', `/tasks/${tKey}.json`, { leadAssignee: tuanvaStaffKey });
          updated = true;
      }
      if (updated) updatedTasks++;
  }

  console.log(`Updated ${updatedTasks} tasks.`);
  
  await request('DELETE', `/users/${vuanhtuanUserKey}.json`);
  console.log(`Deleted vuanhtuan user.`);
  
  if (vuanhtuanStaffKey) {
      await request('DELETE', `/staff/${vuanhtuanStaffKey}.json`);
      console.log(`Deleted vuanhtuan staff.`);
  }
}

run().catch(console.error);
