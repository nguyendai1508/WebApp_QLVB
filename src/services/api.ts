// src/services/api.ts

/**
 * Wrapper for google.script.run
 * Promisifies all calls to GAS backend.
 */

// Helper to run a GAS function as a Promise
const runGasFunction = (functionName: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google || !window.google.script || !window.google.script.run) {
      reject(new Error('google.script.run is not available in this environment.'));
      return;
    }

    const runner = window.google.script.run
      .withSuccessHandler((result: any) => resolve(result))
      .withFailureHandler((error: any) => reject(error));
      
    if (typeof runner[functionName] === 'function') {
      runner[functionName](...args);
    } else {
      reject(new Error(`Function ${functionName} not found on google.script.run`));
    }
  });
};

export const api = {
  // Queries
  getSetupData: () => runGasFunction('getSetupData'),
  getFirebaseConfig: () => runGasFunction('getFirebaseConfig'),
  getStaffList: () => runGasFunction('getStaffList'),
  getIncomingDocs: () => runGasFunction('getIncomingDocs'),
  getOutgoingDocs: () => runGasFunction('getOutgoingDocs'),
  getTasks: () => runGasFunction('getTasks'),
  getUsers: () => runGasFunction('getUsers'),

  // Mutations
  createStaff: (data: any) => runGasFunction('createStaff', data),
  updateStaff: (id: string, data: any) => runGasFunction('updateStaff', id, data),
  deleteStaff: (id: string) => runGasFunction('deleteStaff', id),
  
  createIncomingDoc: (data: any) => runGasFunction('createIncomingDoc', data),
  updateIncomingDoc: (id: string, data: any) => runGasFunction('updateIncomingDoc', id, data),
  deleteIncomingDoc: (id: string) => runGasFunction('deleteIncomingDoc', id),
  
  createOutgoingDoc: (data: any) => runGasFunction('createOutgoingDoc', data),
  updateOutgoingDoc: (id: string, data: any) => runGasFunction('updateOutgoingDoc', id, data),
  deleteOutgoingDoc: (id: string) => runGasFunction('deleteOutgoingDoc', id),
  
  createTask: (data: any) => runGasFunction('createTask', data),
  updateTask: (id: string, data: any) => runGasFunction('updateTask', id, data),
  deleteTask: (id: string) => runGasFunction('deleteTask', id),
  
  // Setup / Catalogs
  addSetupData: (data: any) => runGasFunction('addSetupData', data),
  updateSetupData: (data: any) => runGasFunction('updateSetupData', data),
  deleteSetupData: (data: any) => runGasFunction('deleteSetupData', data),

  createUser: (data: any) => runGasFunction('createUser', data),
  updateUser: (id: string, data: any) => runGasFunction('updateUser', id, data),
  deleteUser: (id: string) => runGasFunction('deleteUser', id),

  // Auth & Sync
  login: (credentials: any) => runGasFunction('handleRequest', 'LOGIN', credentials),
  syncDongNai: (credentials: any) => runGasFunction('handleRequest', 'SYNC_DONG_NAI', credentials)
};
