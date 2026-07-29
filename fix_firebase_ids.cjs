const fs = require('fs');

// 1. Fix Tasks.tsx
const tasksPath = 'src/pages/Tasks.tsx';
let tasksContent = fs.readFileSync(tasksPath, 'utf8');

// Replace updateTask calls
tasksContent = tasksContent.replaceAll('api.updateTask(task.Task_ID,', 'api.updateTask(task.id || task.Task_ID,');
tasksContent = tasksContent.replaceAll('api.updateTask(editingTask.Task_ID,', 'api.updateTask(editingTask.id || editingTask.Task_ID,');

// Replace handleDelete calls
tasksContent = tasksContent.replaceAll('handleDelete(task.Task_ID)', 'handleDelete(task.id || task.Task_ID)');
tasksContent = tasksContent.replaceAll('api.deleteTask(editingTask.Task_ID)', 'api.deleteTask(editingTask.id || editingTask.Task_ID)');
tasksContent = tasksContent.replaceAll('d.id || d.Task_ID', 'd.id || d.Task_ID');

fs.writeFileSync(tasksPath, tasksContent, 'utf8');
console.log('Fixed Firebase IDs in Tasks.tsx');


// 2. Fix IncomingDocs.tsx
const incPath = 'src/pages/IncomingDocs.tsx';
let incContent = fs.readFileSync(incPath, 'utf8');

incContent = incContent.replaceAll('api.updateIncomingDoc(selectedDoc.Doc_ID,', 'api.updateIncomingDoc(selectedDoc.id || selectedDoc.Doc_ID,');
incContent = incContent.replaceAll('api.updateIncomingDoc(editingDoc.Doc_ID,', 'api.updateIncomingDoc(editingDoc.id || editingDoc.Doc_ID,');
incContent = incContent.replaceAll('handleDelete(doc.Doc_ID)', 'handleDelete(doc.id || doc.Doc_ID)');
incContent = incContent.replaceAll('api.deleteIncomingDoc(editingDoc.Doc_ID)', 'api.deleteIncomingDoc(editingDoc.id || editingDoc.Doc_ID)');

fs.writeFileSync(incPath, incContent, 'utf8');
console.log('Fixed Firebase IDs in IncomingDocs.tsx');


// 3. Fix OutgoingDocs.tsx
const outPath = 'src/pages/OutgoingDocs.tsx';
let outContent = fs.readFileSync(outPath, 'utf8');

outContent = outContent.replaceAll('api.updateOutgoingDoc(editingDoc.Doc_ID,', 'api.updateOutgoingDoc(editingDoc.id || editingDoc.Doc_ID,');
outContent = outContent.replaceAll('handleDelete(doc.Doc_ID)', 'handleDelete(doc.id || doc.Doc_ID)');
outContent = outContent.replaceAll('api.deleteOutgoingDoc(editingDoc.Doc_ID)', 'api.deleteOutgoingDoc(editingDoc.id || editingDoc.Doc_ID)');

fs.writeFileSync(outPath, outContent, 'utf8');
console.log('Fixed Firebase IDs in OutgoingDocs.tsx');


// 4. Fix Staff.tsx
const staffPath = 'src/pages/Staff.tsx';
let staffContent = fs.readFileSync(staffPath, 'utf8');

staffContent = staffContent.replaceAll('api.updateStaff(editingStaff.Staff_ID,', 'api.updateStaff(editingStaff.id || editingStaff.Staff_ID,');
staffContent = staffContent.replaceAll('handleDelete(person.Staff_ID)', 'handleDelete(person.id || person.Staff_ID)');

fs.writeFileSync(staffPath, staffContent, 'utf8');
console.log('Fixed Firebase IDs in Staff.tsx');


// 5. Fix Users.tsx
const usersPath = 'src/pages/Users.tsx';
let usersContent = fs.readFileSync(usersPath, 'utf8');

usersContent = usersContent.replaceAll("api.updateUser(editingUser['Mã người dùng'],", "api.updateUser(editingUser.id || editingUser['Mã người dùng'],");
usersContent = usersContent.replaceAll("handleDelete(user['Mã người dùng'])", "handleDelete(user.id || user['Mã người dùng'])");

fs.writeFileSync(usersPath, usersContent, 'utf8');
console.log('Fixed Firebase IDs in Users.tsx');
