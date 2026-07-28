// src/utils/mockGoogleScript.ts

/**
 * Mock file for google.script.run to allow local development without errors.
 * This simulates the behavior of Google Apps Script backend.
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Dữ liệu giả lập lấy từ các giao diện để test
const mockData = {
  catalogs: [
    { Type: 'Đơn vị/Tổ công tác', Value: 'Văn phòng HĐND-UBND' },
    { Type: 'Đơn vị/Tổ công tác', Value: 'Tư pháp - Hộ tịch' },
    { Type: 'Chức vụ', Value: 'Chủ tịch UBND' },
    { Type: 'Lĩnh vực', Value: 'Tổng hợp' }
  ],
  staff: [
    { Staff_ID: 'CB-001', Full_Name: 'Nguyễn Văn An', Role: 'Công chức Tài chính - Kế toán', Department: 'Tài chính - Kế toán', Status: 'Đang công tác' },
    { Staff_ID: 'CB-002', Full_Name: 'Trần Thị Mai', Role: 'Công chức Văn phòng', Department: 'Văn phòng HĐND-UBND', Status: 'Đang công tác' }
  ],
  incomingDocs: [
    { Doc_ID: 'DEN-0001', Sign_Number: '123/CV-UBND', Receive_Date: '02/03/2026', Summary: 'Về việc rà soát kế hoạch', Issuer: 'UBND huyện', Status: 'Đang xử lý' }
  ],
  outgoingDocs: [
    { Doc_ID: 'DI-0004', Sign_Number: '07/TB-UBND', Release_Date: '14/03/2026', Summary: 'Thông báo lịch kiểm tra', Signer: 'Phó Chủ tịch UBND', Status: 'Dự thảo' }
  ],
  tasks: [
    { Task_ID: 'CV-0004', Category: 'Chuẩn bị nội dung họp giao ban', Source: 'Chỉ đạo khác', Progress_Percentage: 20, Status: 'Đã phân công' }
  ],
  users: [
    { ID: 'ND-001', Username: 'Admin', Name: 'Nguyễn Văn An', StaffName: 'Nguyễn Văn An', Scope: 'Toàn đơn vị', Role: 'Admin', PassLength: 9 }
  ]
};

class MockGoogleScriptRun {
  private resolveHandler: Function | null = null;
  private rejectHandler: Function | null = null;

  withSuccessHandler(handler: Function) {
    this.resolveHandler = handler;
    return this;
  }

  withFailureHandler(handler: Function) {
    this.rejectHandler = handler;
    return this;
  }

  private async executeMethod(methodName: string, ...args: any[]) {
    await delay(500); // Giả lập độ trễ mạng
    console.log(`[MOCK GAS] Executing: ${methodName}`, args);
    
    try {
      let result;
      switch (methodName) {
        case 'getSetupData': result = mockData.catalogs; break;
        case 'getStaffList': result = mockData.staff; break;
        case 'getIncomingDocs': result = mockData.incomingDocs; break;
        case 'getOutgoingDocs': result = mockData.outgoingDocs; break;
        case 'getTasks': result = mockData.tasks; break;
        case 'getUsers': result = mockData.users; break;
        case 'createStaff':
        case 'createIncomingDoc':
        case 'createOutgoingDoc':
        case 'createTask':
          result = { success: true, message: 'Đã lưu thành công (Mock)', data: args[0] };
          break;
        default:
          throw new Error(`Method ${methodName} not found in mock.`);
      }
      
      if (this.resolveHandler) this.resolveHandler(result);
    } catch (error) {
      if (this.rejectHandler) this.rejectHandler(error);
    }
  }

  // Khai báo các method mock
  getSetupData() { this.executeMethod('getSetupData'); }
  getStaffList() { this.executeMethod('getStaffList'); }
  getIncomingDocs() { this.executeMethod('getIncomingDocs'); }
  getOutgoingDocs() { this.executeMethod('getOutgoingDocs'); }
  getTasks() { this.executeMethod('getTasks'); }
  getUsers() { this.executeMethod('getUsers'); }
  
  createStaff(data: any) { this.executeMethod('createStaff', data); }
  createIncomingDoc(data: any) { this.executeMethod('createIncomingDoc', data); }
  createOutgoingDoc(data: any) { this.executeMethod('createOutgoingDoc', data); }
  createTask(data: any) { this.executeMethod('createTask', data); }
}

// Gắn vào window nếu chưa tồn tại (chạy trên localhost)
if (typeof window !== 'undefined' && !window.google) {
  (window as any).google = {
    script: {
      run: new MockGoogleScriptRun()
    }
  };
  console.log('[MOCK GAS] Google Script API mocked for local development.');
}

// Bắt buộc khai báo TypeScript cho window.google.script.run
declare global {
  interface Window {
    google?: {
      script: {
        run: any;
      }
    }
  }
}
