const fetch = require('node-fetch');
const FIREBASE_URL = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';

async function cleanDuplicates() {
  const users = await fetch(`${FIREBASE_URL}/users.json`).then(r => r.json());
  const staffs = await fetch(`${FIREBASE_URL}/staff.json`).then(r => r.json());
  
  if (!users || !staffs) return;
  
  const usernamesSeen = new Set();
  const duplicateUserKeys = [];
  const validStaffIds = new Set();
  
  // Clean Users
  for (const [key, user] of Object.entries(users)) {
    if (user.username) {
      if (usernamesSeen.has(user.username)) {
        duplicateUserKeys.push(key);
      } else {
        usernamesSeen.add(user.username);
        validStaffIds.add(user.staffId || user['Mã cán bộ']);
      }
    }
  }
  
  console.log(`Found ${duplicateUserKeys.length} duplicate users.`);
  
  for (const key of duplicateUserKeys) {
    await fetch(`${FIREBASE_URL}/users/${key}.json`, { method: 'DELETE' });
  }
  
  // Clean Staffs
  const duplicateStaffKeys = [];
  for (const [key, staff] of Object.entries(staffs)) {
    if (staff.Staff_ID && !validStaffIds.has(staff.Staff_ID)) {
       duplicateStaffKeys.push(key);
    }
  }
  
  console.log(`Found ${duplicateStaffKeys.length} duplicate staffs.`);
  for (const key of duplicateStaffKeys) {
    await fetch(`${FIREBASE_URL}/staff/${key}.json`, { method: 'DELETE' });
  }
  
  console.log('Cleanup complete!');
}

cleanDuplicates();
