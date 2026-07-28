// Utility to call Google Apps Script backend

export const isDev = process.env.NODE_ENV === 'development';

/**
 * Calls a GAS function via google.script.run
 * If in development mode, it simulates a backend call using mock data.
 * @param action The string action name matching the backend switch case
 * @param payload The payload object
 */
export const callBackend = async (action: string, payload: any = {}): Promise<any> => {
  if (isDev) {
    console.log(`[MOCK GAS] Calling action: ${action}`, payload);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockBackendResponse(action, payload));
      }, 500); // Simulate network delay
    });
  } else {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .handleRequest(action, payload);
    });
  }
};

/**
 * Mock data for local development
 */
function mockBackendResponse(action: string, payload: any) {
  switch (action) {
    case 'LOGIN':
      if (payload.username === 'admin' && payload.password === '123') {
        return {
          success: true,
          user: { Username: 'admin', Linked_Staff_ID: 'NV01', Data_Scope: 'Toàn quyền', Role: 'Admin' }
        };
      }
      return { success: false, error: 'Sai thông tin' };
    case 'GET_INITIAL_DATA':
      return {
        success: true,
        data: {
          incomingDocs: [
            { Doc_ID: 'DEN-001', Sign_Number: '12/GM-UBND', Draft_Date: '12/03/2026', Summary: 'Giấy mời họp giao ban', Issuer: 'UBND huyện', Assignee_ID: 'NV01', Deadline: '16/03/2026', Status: 'Hoàn thành' },
            { Doc_ID: 'DEN-002', Sign_Number: '88/QD-UBND', Draft_Date: '11/03/2026', Summary: 'Về việc kiểm tra hồ sơ', Issuer: 'UBND huyện', Assignee_ID: 'NV02', Deadline: '14/03/2026', Status: 'Quá hạn' },
          ],
          outgoingDocs: [],
          tasks: [
            { Task_ID: 'T-001', Source: 'Văn bản đến', Linked_Doc_ID: 'DEN-001', Category: 'Cải cách hành chính', Priority: 'Khẩn', Status: 'Đang xử lý', Progress_Percentage: 50 }
          ],
          staff: [
            { Staff_ID: 'NV01', Full_Name: 'Đỗ Minh Khôi' },
            { Staff_ID: 'NV02', Full_Name: 'Bùi Thị Ngọc' }
          ]
        }
      };
    default:
      return { success: false, error: 'Unknown mock action' };
  }
}
