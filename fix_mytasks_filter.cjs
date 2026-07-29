const fs = require('fs');
const path = 'src/pages/Tasks.tsx';
let content = fs.readFileSync(path, 'utf8');

const searchUser = `const myName = user?.FullName || '';`;
const replaceUser = `const myName = user?.FullName || user?.['Họ tên cán bộ'] || user?.fullName || user?.Full_Name || user?.username || '';`;
content = content.replace(searchUser, replaceUser);

const searchView = `matchView = task.Lead_Assignee?.includes(user?.FullName || '') || \n                  task.Co_Assignee?.includes(user?.FullName || '');`;
const replaceView = `const uName = user?.FullName || user?.['Họ tên cán bộ'] || user?.fullName || user?.Full_Name || user?.username || '';
      matchView = task.Lead_Assignee?.includes(uName) || task.Co_Assignee?.includes(uName);`;
content = content.replace(searchView, replaceView);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed MY_TASKS filter by using all possible user name fields');
