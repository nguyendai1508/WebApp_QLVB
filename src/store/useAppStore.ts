import { create } from 'zustand';
import { api } from '@/services/api';

interface AppState {
  user: any;
  catalogs: any[];
  staff: any[];
  incomingDocs: any[];
  outgoingDocs: any[];
  tasks: any[];
  users: any[];
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: any) => void;
  setIsLoading: (loading: boolean) => void;
  initialize: (silent?: boolean) => Promise<void>;
  refreshStaff: () => Promise<void>;
  deleteCatalog: (type: string, value: string) => Promise<void>;
}

const parseDate = (dateStr: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(dateStr);
};

const processStatus = (items: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  return items.map(item => {
    if (item.Status === 'Hoàn thành' || item.Status === 'Chờ duyệt' || item.Status === 'Xin gia hạn') {
      return item;
    }
    
    if (item.Deadline) {
      const deadlineDate = parseDate(item.Deadline);
      if (deadlineDate && !isNaN(deadlineDate.getTime())) {
        deadlineDate.setHours(0, 0, 0, 0);
        const timeDiff = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (diffDays < 0) {
          item.Status = 'Quá hạn';
        } else if (diffDays <= 2) {
          item.Status = 'Sắp hạn';
        }
      }
    }
    return item;
  });
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null, 
  catalogs: [],
  staff: [],
  incomingDocs: [],
  outgoingDocs: [],
  tasks: [],
  users: [],
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  deleteCatalog: async (type: string, value: string) => {
    try {
      const res = await api.deleteSetupData({ type, value });
      if (res && res.success) {
        set(state => ({
          catalogs: state.catalogs.filter(c => !(String(c.Type).toLowerCase() === String(type).toLowerCase() && String(c.Value).toLowerCase() === String(value).toLowerCase()))
        }));
      } else {
        alert("Lỗi khi xóa: " + (res?.message || "Không xác định"));
      }
    } catch(e) {
      console.log(e);
    }
  },




  initialize: async (silent = false) => {
    const state = get();
    if (state.isInitialized) return; // Chỉ khởi tạo listener 1 lần duy nhất
    
    if (!silent) set({ isLoading: true });
    
    try {
      const { ref, onValue } = await import('firebase/database');
      const { db } = await import('@/services/firebase');
      
      onValue(ref(db), (snapshot) => {
        const data = snapshot.val() || {};
        
        // Parse data format
        const catalogsData = Array.isArray(data.setup) ? data.setup.filter(Boolean) : Object.values(data.setup || {}).filter((v: any) => v && v.Type && v.Value);
        const staffData = Object.keys(data.staff || {}).map(key => ({ id: key, ...data.staff[key] }));
        const incomingData = Object.keys(data.incomingDocs || {}).map(key => ({ id: key, ...data.incomingDocs[key] }));
        const outgoingData = Object.keys(data.outgoingDocs || {}).map(key => ({ id: key, ...data.outgoingDocs[key] }));
        const tasksData = Object.keys(data.tasks || {}).map(key => ({ id: key, ...data.tasks[key] }));
        const usersData = Object.keys(data.users || {}).map(key => ({ id: key, ...data.users[key] }));

        const formattedStaff = staffData.map((s: any) => {
            const matchedUser = usersData.find((u: any) => 
              u['Mã cán bộ'] === (s.id || s.Staff_ID) || 
              u.staffId === (s.id || s.Staff_ID)
            );
            
            return {
                ...s,
                Staff_ID: s.id || s.Staff_ID,
                Full_Name: s.fullName || s.Full_Name,
                Role: s.role || s.Role,
                Department: s.department || s.Department,
                Status: s.status || s.Status,
                Phone: s.phone || s.Phone,
                Email: s.email || s.Email,
                Direct_Manager: s.manager || s.Direct_Manager,
                Notes: s.notes || s.Notes,
                Username: matchedUser ? (matchedUser.username || matchedUser['Tên đăng nhập'] || '') : ''
            };
        });

        const resolveStaffName = (idOrName: string) => {
            if (!idOrName) return '';
            const ids = idOrName.split(',').map(s => s.trim());
            const names = ids.map(id => {
                const staff = formattedStaff.find((s: any) => s.Staff_ID === id || s.id === id);
                return staff ? (staff.Full_Name || staff.fullName) : id;
            });
            return names.join(', ');
        };

        set({
          catalogs: catalogsData,
          staff: formattedStaff,
          incomingDocs: processStatus(incomingData.map((d: any) => ({
              ...d,
              Doc_ID: d.id || d.Doc_ID || '',
              Sign_Number: d.signNumber || d.Sign_Number || '',
              Draft_Date: d.docDate || d.Draft_Date || '',
            Receive_Date: d.receiveDate || d.Receive_Date || '',
            Summary: d.summary || d.Summary || '',
            Issuer: d.issuer || d.Issuer || '',
            Category: d.category || d.Category || '',
            Doc_Type: d.docType || d.Doc_Type || '',
            Urgency: d.urgency || d.Urgency || '',
            Security: d.security || d.Security || '',
            Assigner: d.assigner || d.Assigner || '',
            Lead_Department: d.leadDepartment || d.Lead_Department || '',
            Lead_Assignee: resolveStaffName(d.leadAssignee || d.Lead_Assignee || d.Assignee_ID || ''),
            Co_Assignee: resolveStaffName(d.coAssignee || d.Co_Assignee || d.Co_Assignees || ''),
            Deadline: d.deadline || d.Deadline || '',
            Status: d.status || d.Status || '',
            Result: d.result || d.Result || '',
            Related_Task: d.relatedTask || d.Related_Task || '',
            Related_Outgoing_Doc: d.relatedOutgoingDoc || d.Related_Outgoing_Doc || '',
            Notes: d.notes || d.Notes || '',
            File_Name: d.files ? d.files.map((f:any) => f.fileName).join(',') : (d.File_Name || ''),
            File_URL: d.files ? d.files.map((f:any) => f.url || f.fileBase64).join(',') : (d.File_URL || '')
        }))),
        outgoingDocs: (outgoingData || []).map((d: any) => ({
            ...d,
            Doc_ID: d.id || d.Doc_ID || '',
            Sign_Number: d.signNumber || d.Sign_Number || '',
            Draft_Date: d.draftDate || d.Draft_Date || '',
            Release_Date: d.releaseDate || d.Release_Date || '',
            Summary: d.summary || d.Summary || '',
            Department: d.department || d.Department || '',
            Drafter: d.drafter || d.Drafter || '',
            Signer: d.signer || d.Signer || '',
            Doc_Type: d.docType || d.Doc_Type || '',
            Category: d.category || d.Category || '',
            Urgency: d.urgency || d.Urgency || '',
            Security: d.security || d.Security || '',
            Status: d.status || d.Status || '',
            Recipient: d.recipient || d.Recipient || '',
            Related_Incoming_Doc: d.relatedIncomingDoc || d.Related_Incoming_Doc || '',
            Notes: d.notes || d.Notes || '',
            File_Name: d.files ? d.files.map((f:any) => f.fileName).join(',') : (d.File_Name || ''),
            File_URL: d.files ? d.files.map((f:any) => f.url || f.fileBase64).join(',') : (d.File_URL || '')
        })),
        tasks: processStatus(tasksData.map((t: any) => ({
            ...t,
            Task_ID: t.id || t.Task_ID || '',
            Source: t.source || t.Source || '',
            Linked_Doc_ID: t.relatedDoc || t.Linked_Doc_ID || '',
            Content: t.content || t.Content || '',
            Category: t.category || t.Category || '',
            Priority: t.priority || t.Priority || '',
            Assigner: t.assigner || t.Assigner || '',
            Lead_Department: t.leadDepartment || t.Lead_Department || '',
            Lead_Assignee: resolveStaffName(t.leadAssignee || t.Lead_Assignee || t.Assignee_ID || ''),
            Co_Assignee: resolveStaffName(t.coAssignee || t.Co_Assignee || t.Co_Assignees || ''),
            Assign_Date: t.assignDate || t.Assign_Date || '',
            Deadline: t.deadline || t.Deadline || '',
            Actual_Complete_Date: t.actualCompleteDate || t.Actual_Complete_Date || '',
            Status: t.status || t.Status || '',
            Progress_Percentage: t.progressPercentage || t.Progress_Percentage || 0,
            Result_Output: t.resultOutput || t.Result_Output || '',
            Related_Outgoing_Doc: t.relatedOutgoingDoc || t.Related_Outgoing_Doc || '',
            Notes: t.notes || t.Notes || '',
            Created_By: t.createdBy || t.Created_By || ''
        }))),
        users: usersData || [],
        isLoading: false,
        isInitialized: true
      });
    });
    } catch(e) {
      console.error("Lỗi khi kết nối Realtime Database", e);
      set({ isLoading: false });
    }
  },

  refreshStaff: async () => {
    try {
      const staffData = await api.getStaffList();
      set({ staff: staffData || [] });
    } catch (error) {
      console.error('Lỗi làm mới cán bộ', error);
    }
  }
}));
