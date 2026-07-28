// src/services/api.ts
import { db } from './firebase';
import { ref, get, set, push, update, remove } from 'firebase/database';

export const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyJybqKmvU5kRY-2_QoU_AtggLbL7jVU_A_U2mhBqo34XI0qeg2375b754LilQ1NI9SLA/exec';

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

export const api = {
  // Queries
  getSetupData: async () => {
    const snapshot = await get(ref(db, 'setup'));
    return snapshot.exists() ? snapshot.val() : {};
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
  
  createOutgoingDoc: (data: any) => createItem('outgoingDocs', data),
  updateOutgoingDoc: (id: string, data: any) => updateItem('outgoingDocs', id, data),
  deleteOutgoingDoc: (id: string) => deleteItem('outgoingDocs', id),
  
  createTask: (data: any) => createItem('tasks', data),
  updateTask: (id: string, data: any) => updateItem('tasks', id, data),
  deleteTask: (id: string) => deleteItem('tasks', id),
  
  // Setup / Catalogs
  addSetupData: async (data: any) => {
    const current = await api.getSetupData();
    const updated = { ...current };
    for (const key of Object.keys(data)) {
        if (Array.isArray(updated[key])) {
            updated[key] = [...updated[key], ...data[key]];
        } else {
            updated[key] = data[key];
        }
    }
    await set(ref(db, 'setup'), updated);
    return updated;
  },
  updateSetupData: async (data: any) => {
    await update(ref(db, 'setup'), data);
    return data;
  },
  deleteSetupData: async (data: any): Promise<ApiResponse> => {
    // TODO: implement detailed setup deletion if needed
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
    const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'send_zalo',
            phone,
            message,
            type
        })
    });
    return response.json();
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
