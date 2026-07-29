// src/services/api.ts
import { db } from './firebase';
import { ref, get, set, push, update, remove } from 'firebase/database';

export const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbw6Eff-tF4pYYi_-KBja5BoS7JHUUfKBIVNzpXmyDz7KqNEIDfp7Wh4Mfb_TtkyRGnMTg/exec';

type ApiResponse = { id?: string; success: boolean; message?: string; [key: string]: any };

// Generic CRUD helpers
const getList = async (path: string) => {
  const snapshot = await get(ref(db, path));
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
  }
  return [];
};

const createItem = async (path: string, data: any): Promise<ApiResponse> => {
  const listRef = ref(db, path);
  const newItemRef = push(listRef);
  const itemData = { ...data, createdAt: new Date().toISOString() };
  await set(newItemRef, itemData);
  return { id: newItemRef.key || '', ...itemData, success: true, message: 'Thành công' };
};

const updateItem = async (path: string, id: string, data: any): Promise<ApiResponse> => {
  const itemData = { ...data, updatedAt: new Date().toISOString() };
  await update(ref(db, `${path}/${id}`), itemData);
  return { id, ...itemData, success: true, message: 'Thành công' };
};

const deleteItem = async (path: string, id: string): Promise<ApiResponse> => {
  await remove(ref(db, `${path}/${id}`));
  return { success: true, message: 'Thành công' };
};

const deleteMultipleItems = async (path: string, ids: string[]): Promise<ApiResponse> => {
  const updates: any = {};
  ids.forEach(id => {
    updates[`${path}/${id}`] = null;
  });
  await update(ref(db), updates);
  return { success: true, message: 'Thành công' };
};

export const api = {
  // Queries
  getSetupData: async () => {
    const snapshot = await get(ref(db, 'setup'));
    if (!snapshot.exists()) return [];
    const val = snapshot.val();
    if (Array.isArray(val)) return val.filter(Boolean);
    return Object.values(val).filter((v: any) => v && v.Type && v.Value);
  },
  getStaffList: () => getList('staff'),
  getIncomingDocs: () => getList('incomingDocs'),
  getOutgoingDocs: () => getList('outgoingDocs'),
  getTasks: () => getList('tasks'),
  getUsers: () => getList('users'),
  getFirebaseConfig: async () => ({
    databaseURL: "https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app"
  }),

  // Mutations
  createStaff: (data: any) => createItem('staff', data),
  updateStaff: (id: string, data: any) => updateItem('staff', id, data),
  deleteStaff: (id: string) => deleteItem('staff', id),
  
  createIncomingDoc: (data: any) => createItem('incomingDocs', data),
  updateIncomingDoc: (id: string, data: any) => updateItem('incomingDocs', id, data),
  deleteIncomingDoc: (id: string) => deleteItem('incomingDocs', id),
  deleteMultipleIncomingDocs: (ids: string[]) => deleteMultipleItems('incomingDocs', ids),
  
  createOutgoingDoc: (data: any) => createItem('outgoingDocs', data),
  updateOutgoingDoc: (id: string, data: any) => updateItem('outgoingDocs', id, data),
  deleteOutgoingDoc: (id: string) => deleteItem('outgoingDocs', id),
  
  createTask: (data: any) => createItem('tasks', data),
  updateTask: (id: string, data: any) => updateItem('tasks', id, data),
  deleteTask: (id: string) => deleteItem('tasks', id),
  deleteMultipleTasks: (ids: string[]) => deleteMultipleItems('tasks', ids),
  
  // Setup / Catalogs
  addSetupData: async (data: any) => {
    const list = await api.getSetupData();
    list.push({ Type: data.type, Value: data.value });
    await set(ref(db, 'setup'), list);
    return { success: true };
  },
  updateSetupData: async (data: any) => {
    const list = await api.getSetupData();
    const idx = list.findIndex((c: any) => c.Type === data.type && c.Value === data.oldValue);
    if (idx !== -1) {
       list[idx].Value = data.newValue;
       await set(ref(db, 'setup'), list);
       return { success: true };
    }
    return { success: false, message: 'Không tìm thấy' };
  },
  deleteSetupData: async (data: any): Promise<ApiResponse> => {
    const list = await api.getSetupData();
    const newList = list.filter((c: any) => !(c.Type === data.type && c.Value === data.value));
    await set(ref(db, 'setup'), newList);
    return { success: true, message: 'Thành công' };
  },

  createUser: (data: any) => createItem('users', data),
  updateUser: (id: string, data: any) => updateItem('users', id, data),
  deleteUser: (id: string) => deleteItem('users', id),

  // File Upload Webhook
  uploadFileToDrive: async (fileName: string, mimeType: string, base64Data: string) => {
    const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'upload_file',
            fileName,
            mimeType,
            fileData: base64Data
        })
    });
    return response.json();
  },

  // Zalo Webhook
  sendZalo: async (phone: string, message: string, type: string) => {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'send_zalo',
            phone,
            message,
            type
        })
      });
      return response.json();
    } catch (error) {
      return { success: false };
    }
  },

  // Auth
  login: async (credentials: any) => {
    const users = await getList('users');
    const user = users.find(u => u.username === credentials.username && u.password === credentials.password);
    if (user) {
        return { success: true, user: user };
    }
    // Hardcode admin as fallback if empty DB
    if (credentials.username === 'admin' && credentials.password === '123') {
        const adminUser = {
            id: 'admin_id',
            username: 'admin',
            fullName: 'Administrator',
            role: 'Admin',
            permissions: { canAddIncoming: true, canAddOutgoing: true, canAssignTask: true }
        };
        return { success: true, user: adminUser };
    }
    return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
  }
};
