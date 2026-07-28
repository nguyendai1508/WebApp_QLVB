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

export const useAppStore = create<AppState>((set) => ({
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
    if (!silent) set({ isLoading: true });
    try {
      // Gọi song song các API để tải dữ liệu nhanh hơn
      const [catalogsData, staffData, incomingData, outgoingData, tasksData, usersData] = await Promise.all([
        api.getSetupData().catch(() => []),
        api.getStaffList().catch(() => []),
        api.getIncomingDocs().catch(() => []),
        api.getOutgoingDocs().catch(() => []),
        api.getTasks().catch(() => []),
        api.getUsers().catch(() => [])
      ]);

      set({
        catalogs: catalogsData || [],
        staff: staffData || [],
        incomingDocs: incomingData ? processStatus(incomingData) : [],
        outgoingDocs: outgoingData || [],
        tasks: tasksData ? processStatus(tasksData) : [],
        users: usersData || [],
        isInitialized: true
      });
    } catch (error) {
      console.error('Lỗi khởi tạo dữ liệu:', error);
    } finally {
      if (!silent) set({ isLoading: false });
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
