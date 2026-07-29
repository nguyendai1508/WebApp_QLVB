const fs = require('fs');

const path = 'src/pages/Tasks.tsx';
let content = fs.readFileSync(path, 'utf8');

// The goal is to inject roleFilter logic into filteredTasks correctly!
// In Tasks.tsx, filteredTasks looks like this:
/*
  const filteredTasks = viewTasks.filter(task => {
    const matchSearch = ...
    ...
    return matchSearch && matchStatus && matchPriority && matchAssignee && matchDeadline;
  });
*/

const searchTarget = "return matchSearch && matchStatus && matchPriority && matchAssignee && matchDeadline;";
const replacement = `
    const matchRole = roleFilter === 'ALL' ? true : (
      roleFilter === 'LEAD' ? task.Role === 'Chủ trì' : task.Role === 'Phối hợp'
    );
    return matchSearch && matchStatus && matchPriority && matchAssignee && matchDeadline && matchRole;
`;

if (content.includes(searchTarget)) {
    content = content.replace(searchTarget, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully fixed roleFilter logic!");
} else {
    console.log("Could not find the target string to replace in filteredTasks!");
}
