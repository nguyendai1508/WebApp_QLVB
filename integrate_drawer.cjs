const fs = require('fs');
const path = 'src/pages/Tasks.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Import QuickTaskDrawer
const oldImport = `import { TaskForm } from '@/components/TaskForm';`;
const newImport = `import { TaskForm } from '@/components/TaskForm';
import { QuickTaskDrawer } from '@/components/QuickTaskDrawer';`;

content = content.replace(oldImport, newImport);

// 2. Add state drawerTask inside Tasks component
const oldStateInjected = `const [editingTask, setEditingTask] = useState<any>(null);`;
const newStateInjected = `const [editingTask, setEditingTask] = useState<any>(null);
  const [drawerTask, setDrawerTask] = useState<any>(null);`;

content = content.replace(oldStateInjected, newStateInjected);

// 3. Add handler functions for QuickTaskDrawer
const oldHandlerInject = `const handleEdit = (task: any) => {`;
const newHandlerInject = `const handleOpenDrawer = (task: any) => {
    setDrawerTask(task);
  };

  const handleDrawerUpdateStatus = async (task: any, newStatus: string, extraPayload?: any) => {
    try {
      setIsLoading(true);
      const { api } = await import('@/services/api');
      const targetId = task.id || task.Task_ID;
      const todayISO = new Date().toISOString().split('T')[0];
      
      const payload = {
        source: task.Source,
        relatedDoc: task.Linked_Doc_ID,
        category: task.Category,
        content: task.Content,
        priority: task.Priority,
        assigner: task.Assigner,
        leadDepartment: task.Lead_Department,
        leadAssignee: task.Lead_Assignee,
        coAssignee: task.Co_Assignee,
        assignDate: task.Assign_Date,
        deadline: task.Deadline,
        actualCompleteDate: newStatus === 'Hoàn thành' ? todayISO : task.Actual_Complete_Date,
        progressPercentage: newStatus === 'Hoàn thành' ? 100 : (extraPayload?.progressPercentage ?? task.Progress_Percentage),
        status: newStatus,
        resultOutput: task.Result_Output,
        relatedOutgoingDoc: task.Related_Outgoing_Doc,
        notes: task.Notes,
        extensionDate: extraPayload?.Extension_Date !== undefined ? extraPayload.Extension_Date : task.Extension_Date,
        extensionReason: extraPayload?.Extension_Reason !== undefined ? extraPayload.Extension_Reason : task.Extension_Reason,
        auditLog: \`[\${new Date().toLocaleString('en-GB')}] \${user?.FullName || 'Cán bộ'} đã [CẬP NHẬT TRẠNG THÁI \${newStatus}].\\n\${task.Audit_Trail || ''}\`,
        createdBy: task.Created_By
      };

      const res = await api.updateTask(targetId, payload);
      if (res.success) {
        setDrawerTask(null);
        await initialize();
      } else {
        alert('Lỗi: ' + res.message);
      }
    } catch (e) {
      alert('Có lỗi xảy ra!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrawerAddComment = async (task: any, commentText: string) => {
    try {
      setIsLoading(true);
      const { api } = await import('@/services/api');
      const targetId = task.id || task.Task_ID;
      const timeStr = new Date().toLocaleString('en-GB');
      const newComment = \`[\${timeStr}] 💬 \${user?.FullName || 'Người dùng'} đã thảo luận:\\n\${commentText.trim()}\`;
      const currentLog = task.Audit_Trail || task.auditLog || '';
      const updatedLog = newComment + (currentLog ? '\\n\\n' + currentLog : '');

      const payload = {
        source: task.Source,
        relatedDoc: task.Linked_Doc_ID,
        category: task.Category,
        content: task.Content,
        priority: task.Priority,
        assigner: task.Assigner,
        leadDepartment: task.Lead_Department,
        leadAssignee: task.Lead_Assignee,
        coAssignee: task.Co_Assignee,
        assignDate: task.Assign_Date,
        deadline: task.Deadline,
        actualCompleteDate: task.Actual_Complete_Date,
        progressPercentage: task.Progress_Percentage,
        status: task.Status,
        resultOutput: task.Result_Output,
        relatedOutgoingDoc: task.Related_Outgoing_Doc,
        notes: task.Notes,
        extensionDate: task.Extension_Date,
        extensionReason: task.Extension_Reason,
        auditLog: updatedLog,
        createdBy: task.Created_By
      };

      const res = await api.updateTask(targetId, payload);
      if (res.success) {
        setDrawerTask((prev: any) => prev ? { ...prev, Audit_Trail: updatedLog, auditLog: updatedLog } : null);
        await initialize();
      }
    } catch (e) {
      alert('Có lỗi xảy ra!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (task: any) => {`;

content = content.replace(oldHandlerInject, newHandlerInject);

// 4. Update Eye button on Child Rows and Flat Table Rows to open Drawer instead of full Modal!
content = content.replaceAll('onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Xem"', 'onClick={() => handleOpenDrawer(task)} className="p-1 text-blue-600 hover:text-blue-800 transition-colors" title="Xem nhanh (1-Click)"');

// 5. Render QuickTaskDrawer before the end of Tasks component
const oldFormModalEnd = `</Modal>
      )}

      <Modal`;

const newFormModalEnd = `</Modal>
      )}

      {/* Quick Review Drawer */}
      {drawerTask && (
        <QuickTaskDrawer
          task={drawerTask}
          incomingDoc={incomingDocs.find((d: any) => d.Doc_ID === drawerTask.Linked_Doc_ID || d.id === drawerTask.Linked_Doc_ID)}
          user={user}
          onClose={() => setDrawerTask(null)}
          onUpdateStatus={handleDrawerUpdateStatus}
          onAddComment={handleDrawerAddComment}
        />
      )}

      <Modal`;

content = content.replace(oldFormModalEnd, newFormModalEnd);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully integrated QuickTaskDrawer into Tasks.tsx');
