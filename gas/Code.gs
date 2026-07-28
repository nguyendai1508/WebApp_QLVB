/**
 * QUẢN LÝ VĂN BẢN - GOOGLE APPS SCRIPT BACKEND
 */

// ==========================================
// CẤU HÌNH KẾT NỐI (QUAN TRỌNG)
// ==========================================
// Nếu bạn mở Apps Script trực tiếp từ Tiện ích mở rộng của Google Sheets (Bound Script), code sẽ tự nhận diện file đang mở.

const SHEET_NAMES = {
  SETUP: 'SETUP',
  STAFF: 'Danh sách cán bộ',
  INCOMING: 'Văn bản đến',
  OUTGOING: 'Văn bản đi',
  TASKS: 'Quản lý công việc',
  USERS: 'Người dùng'
};

const FOLDER_NAME = 'QLVB_Attachments';

// ==========================================
// CẤU HÌNH ZALO NOTIFICATION (ZNS / OA)
// ==========================================
const ZALO_CONFIG = {
  ENABLE_ZALO: false, // Đổi thành true để bật gửi tin nhắn
  MODE: 'OA', // Chọn 'OA' (Nhắn tin văn bản miễn phí) hoặc 'ZNS' (Mẫu trả phí)
  ACCESS_TOKEN: 'ĐIỀN_ZALO_ACCESS_TOKEN_CỦA_BẠN_VÀO_ĐÂY', 
  // Dành cho chế độ ZNS
  TEMPLATE_ID_NEW_TASK: 'ĐIỀN_MÃ_MẪU_ZNS_GIAO_VIỆC_VÀO_ĐÂY',
  TEMPLATE_ID_REMINDER: 'ĐIỀN_MÃ_MẪU_ZNS_NHẮC_HẠN_VÀO_ĐÂY',
  ZNS_ENDPOINT: 'https://business.openapi.zalo.me/message/template',
  // Dành cho chế độ OA
  OA_ENDPOINT: 'https://openapi.zalo.me/v3.0/oa/message/cs'
};



// ==========================================
// CẤU HÌNH FIREBASE REALTIME DATABASE
// ==========================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAe7qlkdRz-IDmK4oKxN6287Hir0j4Hq2k",
  authDomain: "qlvb-phurieng.firebaseapp.com",
  databaseURL: "https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "qlvb-phurieng",
  storageBucket: "qlvb-phurieng.firebasestorage.app",
  messagingSenderId: "513838855886",
  appId: "1:513838855886:web:f5e164272998f94ad9029f"
};

function getFirebaseConfig() {
  return FIREBASE_CONFIG;
}

function _pingFirebase() {
  try {
    if (!FIREBASE_CONFIG.databaseURL) return;
    const url = FIREBASE_CONFIG.databaseURL + "/lastUpdated.json";
    const options = {
      method: "put",
      payload: JSON.stringify({ timestamp: new Date().getTime() }),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch(e) {}
}

function getDb() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ==========================================
// 1. WEB APP ENTRY POINT
// ==========================================
function doGet(e) {
  // Trả về HTML App cho Web App
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Quản lý văn bản')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Hàm tiếp nhận HTTP POST (Từ Chrome Extension)
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    
    // 1. Lệnh Kiểm tra trùng lặp TRƯỚC KHI tải file
    
    // --- XỬ LÝ WEBHOOK TỪ ZALO OA ---
    if (postData.event_name === "user_send_text") {
      return _handleZaloWebhook(postData);
    }

    if (postData.action === "check_exists") {
      const docs = postData.docs;
      const existingRows = sheetDataToObjects(SHEET_NAMES.INCOMING, 1);
      
      const existingKeys = new Set(existingRows.map(row => {
          const soHieu = String(row['Số/Ký hiệu văn bản'] || '').trim();
          const trichYeu = String(row['Trích yếu / nội dung chính'] || '').trim();
          return `${soHieu}|${trichYeu}`;
      }));
      
      const newDocs = [];
      for (const doc of docs) {
        const soHieuDen = String(doc.soHieu || doc.soDen || '').trim();
        const trichYeu = String(doc.trichYeu || '').trim();
        const docKey = `${soHieuDen}|${trichYeu}`;
        if (!existingKeys.has(docKey)) {
           newDocs.push(doc);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
         success: true, 
         newDocs: newDocs,
         skippedCount: docs.length - newDocs.length
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Lệnh Đồng bộ văn bản và Tải lên Drive từ Extension
    if (postData.action === "sync_docs") {
      const docs = postData.docs; 
      let createdCount = 0;
      let skippedCount = 0;
      
      const existingRows = sheetDataToObjects(SHEET_NAMES.INCOMING, 1);
      
      // Khóa nhận diện chống trùng lặp (Kết hợp Số hiệu và Trích yếu để chặn cả những văn bản không có số)
      const existingKeys = new Set(existingRows.map(row => {
          const soHieu = String(row['Số/Ký hiệu văn bản'] || '').trim();
          const trichYeu = String(row['Trích yếu / nội dung chính'] || '').trim();
          return `${soHieu}|${trichYeu}`;
      }));
      
      let rowsToAppend = []; // Khởi tạo mảng chứa các dòng dữ liệu để ghi gộp

      for (const doc of docs) {
        const soHieuDen = String(doc.soHieu || doc.soDen || '').trim();
        const trichYeu = String(doc.trichYeu || '').trim();
        const docKey = `${soHieuDen}|${trichYeu}`;
        
        // Nếu văn bản đã tồn tại trong Sheet (Trùng khóa nhận diện)
        if (existingKeys.has(docKey)) {
          skippedCount++;
          continue;
        }
        
        // 1. Upload các file đính kèm lên Drive (nếu có base64) HOẶC sử dụng Link gốc
        let fileIds = [], fileUrls = [], fileNames = [];
        if (doc.files && Array.isArray(doc.files)) {
           for (const f of doc.files) {
              if (f.base64Content) {
                 let mimeType = "application/octet-stream";
                 if (f.fileName.toLowerCase().endsWith(".pdf")) mimeType = "application/pdf";
                 else if (f.fileName.toLowerCase().endsWith(".doc") || f.fileName.toLowerCase().endsWith(".docx")) mimeType = "application/msword";
                 else if (f.fileName.toLowerCase().endsWith(".xls") || f.fileName.toLowerCase().endsWith(".xlsx")) mimeType = "application/vnd.ms-excel";
                 
                 const uploaded = uploadFileToDrive(f.base64Content, f.fileName, mimeType); 
                 if (uploaded.success) {
                    fileIds.push(uploaded.fileId);
                    fileUrls.push(uploaded.fileUrl);
                    fileNames.push(f.fileName);
                 }
              }
           }
        }
        
        // Tạo Row Data và đưa vào mảng lưu gộp
        const rowData = {
          'Số/Ký hiệu văn bản': soHieuDen,
          'Ngày văn bản': doc.ngayVanBan || '',
          'Ngày đến': doc.ngayDen || new Date().toLocaleDateString('en-GB'),
          'Trích yếu / nội dung chính': doc.trichYeu || '',
          'Cơ quan ban hành': doc.coQuanBanHanh || '',
          'Loại văn bản': doc.loaiVanBan || '',
          'Độ khẩn': doc.doKhan || '',
          'Lãnh đạo giao xử lý': doc.nguoiSoan || '', // Ghi tạm
          'Trạng thái xử lý': 'Mới tiếp nhận',
          'Tên file': fileNames.join(', '),
          'Đường dẫn file': fileUrls.join('\n'),
          'ID file': fileIds.join(', '),
          'Người tạo': 'Sync Bot'
        };
        rowsToAppend.push(rowData);
        createdCount++;
      } // Kết thúc vòng lặp tải Drive

      // 2. Ghi GỘP trực tiếp vào Sheets (Tăng tốc độ ghi gấp 20 lần)
      if (rowsToAppend.length > 0) {
          const lock = LockService.getScriptLock();
          lock.waitLock(30000);
          try {
              // BẮT BUỘC ÉP ĐỒNG BỘ BỘ NHỚ CACHE CỦA GOOGLE ĐỂ LẤY DÒNG CUỐI ĐÚNG NHẤT (Chống Ghi đè)
              SpreadsheetApp.flush(); 
              
              const sheet = getDb().getSheetByName(SHEET_NAMES.INCOMING);
              const currentLastRow = Math.max(sheet.getLastRow(), 1);
              
              // Đánh lại STT và ID an toàn 
              for (let i = 0; i < rowsToAppend.length; i++) {
                  const stt = currentLastRow + i;
                  rowsToAppend[i]['STT'] = stt;
                  rowsToAppend[i]['Mã VB đến'] = `DEN-${(stt).toString().padStart(4, '0')}`;
              }
              
              appendMultipleRowsByHeader(SHEET_NAMES.INCOMING, 1, rowsToAppend);
              
              // ÉP LƯU DỮ LIỆU XUỐNG ĐĨA NGAY LẬP TỨC CHO LUỒNG KHÁC THẤY
              SpreadsheetApp.flush();
          } finally {
              lock.releaseLock();
          }
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, created: createdCount, skipped: skippedCount })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

/**
 * HÀM CẤP QUYỀN (CHỈ CHẠY 1 LẦN BẰNG TAY)
 * Chọn hàm này và ấn nút Run (Chạy) trên Apps Script để Google hiển thị bảng cấp quyền UrlFetchApp và DriveApp.
 */
function grantPermissions() {
  UrlFetchApp.fetch("https://google.com", { muteHttpExceptions: true });
  DriveApp.getRootFolder();
  Logger.log("Đã cấp quyền thành công!");
}

function getOrCreateFolder() {
  const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const file = DriveApp.getFileById(ssId);
  const parents = file.getParents();
  let parentFolder = DriveApp.getRootFolder();
  if (parents.hasNext()) {
    parentFolder = parents.next();
  }

  const folders = parentFolder.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(FOLDER_NAME);
  }
}

/**
 * Uploads a base64 encoded file to Google Drive.
 * Có cơ chế tự động thử lại (Retry) để chống lỗi Rate Limit khi chạy đa luồng tốc độ cao.
 */
function uploadFileToDrive(base64Data, filename, mimeType) {
  let lastError = null;
  // Cố gắng tải lên Drive tối đa 3 lần nếu gặp lỗi Quota/Rate Limit
  for (let retry = 0; retry < 3; retry++) {
    try {
      const folder = getOrCreateFolder();
      const base64Str = base64Data.split(',').pop();
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Str), mimeType, filename);
      const file = folder.createFile(blob);
      
      // Cấp quyền cho file được xem bởi bất kỳ ai có link
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return {
        success: true,
        fileId: file.getId(),
        fileUrl: file.getUrl(),
        fileSize: file.getSize()
      };
    } catch (error) {
      lastError = error;
      // Dừng 1.5s - 2.5s ngẫu nhiên trước khi thử lại để tránh dội bom API
      Utilities.sleep(1500 + Math.random() * 1000); 
    }
  }
  
  Logger.log("Lỗi upload sau 3 lần thử: " + lastError.toString());
  return { success: false, error: lastError.toString() };
}

/**
 * Upload trực tiếp file Blob (từ UrlFetchApp) lên Drive
 */
function uploadBlobToDrive(blob) {
  try {
    const folder = getOrCreateFolder();
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: file.getName()
    };
  } catch (error) {
    Logger.log("Lỗi upload Blob: " + error.toString());
    return { success: false, error: error.toString() };
  }
}

function processMultipleFiles(filesArray) {
  if (!filesArray || !Array.isArray(filesArray) || filesArray.length === 0) return null;
  const uploaded = [];
  filesArray.forEach(f => {
    if (f.fileBase64) {
      const res = uploadFileToDrive(f.fileBase64, f.fileName, f.fileMimeType);
      if (res.success) {
        uploaded.push({
          name: f.fileName,
          type: f.fileMimeType,
          size: res.fileSize,
          id: res.fileId,
          url: res.fileUrl
        });
      }
    }
  });
  if (uploaded.length === 0) return null;
  return {
    names: uploaded.map(u => u.name).join('\n'),
    types: uploaded.map(u => u.type).join('\n'),
    sizes: uploaded.map(u => u.size).join('\n'),
    ids: uploaded.map(u => u.id).join('\n'),
    urls: uploaded.map(u => u.url).join('\n')
  };
}

/**
 * Chèn một dòng mới vào Sheet dựa theo Map Key-Value khớp với Header
 */
function appendDataByHeader(sheetName, headerRowIndex, dataObj) {
  const sheet = getDb().getSheetByName(sheetName);
  if (!sheet) throw new Error("Không tìm thấy Sheet: " + sheetName);
  
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(headerRowIndex, 1, 1, lastCol).getValues()[0];
  
  const newRow = new Array(headers.length).fill('');
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && dataObj.hasOwnProperty(header)) {
      newRow[i] = dataObj[header];
    }
  }
  
  sheet.appendRow(newRow);
  _pingFirebase();
  return sheet.getLastRow();
}

/**
 * Chèn NHIỀU dòng mới vào Sheet cùng lúc (Batch Append) giúp tăng tốc độ cực nhanh
 */
function appendMultipleRowsByHeader(sheetName, headerRowIndex, dataObjArray) {
  if (!dataObjArray || dataObjArray.length === 0) return 0;
  
  const sheet = getDb().getSheetByName(sheetName);
  if (!sheet) throw new Error("Không tìm thấy Sheet: " + sheetName);
  
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(headerRowIndex, 1, 1, lastCol).getValues()[0];
  
  const newRows = [];
  
  for (const dataObj of dataObjArray) {
    const newRow = new Array(headers.length).fill('');
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header && dataObj.hasOwnProperty(header)) {
        newRow[i] = dataObj[header];
      }
    }
    newRows.push(newRow);
  }
  
  // Ghi một cục tất cả các dòng vào Sheet bằng setValues() thay vì gọi appendRow lặp đi lặp lại
  const startRow = Math.max(sheet.getLastRow(), headerRowIndex) + 1;
  sheet.getRange(startRow, 1, newRows.length, headers.length).setValues(newRows);
  _pingFirebase();
  
  return sheet.getLastRow();
}

/**
 * Cập nhật dòng dữ liệu dựa theo Map Key-Value
 */
function updateDataByHeader(sheetName, idColumnName, idValue, headerRowIndex, dataObj) {
  const sheet = getDb().getSheetByName(sheetName);
  if (!sheet) throw new Error("Không tìm thấy Sheet: " + sheetName);
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRowIndex) throw new Error("Bảng dữ liệu trống");
  
  const headers = sheet.getRange(headerRowIndex, 1, 1, lastCol).getValues()[0];
  const idColIndex = headers.indexOf(idColumnName);
  if (idColIndex === -1) throw new Error("Không tìm thấy cột ID: " + idColumnName);
  
  const idValues = sheet.getRange(headerRowIndex + 1, idColIndex + 1, lastRow - headerRowIndex, 1).getValues();
  let targetRowIndex = -1;
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(idValue)) {
      targetRowIndex = headerRowIndex + 1 + i;
      break;
    }
  }
  
  if (targetRowIndex === -1) throw new Error("Không tìm thấy bản ghi có ID: " + idValue);
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && dataObj.hasOwnProperty(header)) {
      sheet.getRange(targetRowIndex, i + 1).setValue(dataObj[header]);
    }
  }
  _pingFirebase();
  
  return targetRowIndex;
}

/**
 * Xóa dòng dữ liệu dựa theo ID
 */
function deleteDataByHeader(sheetName, idColumnName, idValue, headerRowIndex) {
  const sheet = getDb().getSheetByName(sheetName);
  if (!sheet) throw new Error("Không tìm thấy Sheet: " + sheetName);
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRowIndex) throw new Error("Bảng dữ liệu trống");
  
  const headers = sheet.getRange(headerRowIndex, 1, 1, lastCol).getValues()[0];
  const idColIndex = headers.indexOf(idColumnName);
  if (idColIndex === -1) throw new Error("Không tìm thấy cột ID: " + idColumnName);
  
  const idValues = sheet.getRange(headerRowIndex + 1, idColIndex + 1, lastRow - headerRowIndex, 1).getValues();
  let targetRowIndex = -1;
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(idValue)) {
      targetRowIndex = headerRowIndex + 1 + i;
      break;
    }
  }
  
  if (targetRowIndex === -1) throw new Error("Không tìm thấy bản ghi có ID: " + idValue);
  
  sheet.deleteRow(targetRowIndex);
  _pingFirebase();
  return true;
}

function sheetDataToObjects(sheetName, headerRowIndex) {
  const sheet = getDb().getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRowIndex) return [];
  const data = sheet.getRange(headerRowIndex, 1, lastRow - headerRowIndex + 1, lastCol).getValues();
  const headers = data[0];
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    let isEmptyRow = true;
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        const headerKey = headers[j].toString().trim();
        obj[headerKey] = row[j];
        if (row[j] !== '') isEmptyRow = false;
      }
    }
    if (!isEmptyRow) results.push(obj);
  }
  return results;
}

function formatGoogleDate(dateObj) {
  if (!dateObj || !(dateObj instanceof Date)) return dateObj || '';
  const d = dateObj.getDate().toString().padStart(2, '0');
  const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

// ==========================================
// 3. READ DATA FUNCTIONS
// ==========================================

function getSetupData() {
  try {
    const sheet = getDb().getSheetByName(SHEET_NAMES.SETUP);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 2) return [];
    const data = sheet.getRange(1, 2, lastRow, lastCol - 1).getValues();
    const headers = data[0];
    const catalogs = [];
    for (let colIndex = 0; colIndex < headers.length; colIndex += 2) {
      const type = headers[colIndex];
      if (type) {
        for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
          const value = data[rowIndex][colIndex];
          if (value) {
            catalogs.push({ Type: type, Value: value.toString() });
          }
        }
      }
    }
    return catalogs;
  } catch (error) {
    throw new Error("Không thể tải danh mục: " + error.toString());
  }
}

function getStaffList() {
  try {
    const rawData = sheetDataToObjects(SHEET_NAMES.STAFF, 1);
    return rawData.map(row => ({
      Staff_ID: row['Mã CB'] || '',
      Full_Name: row['Họ và tên'] || '',
      Photo_URL: row['Đường dẫn ảnh'] || '',
      Role: row['Chức vụ'] || '',
      Department: row['Đơn vị/Tổ công tác'] || '',
      Phone: row['Số điện thoại'] || '',
      Email: row['Email'] || '',
      Direct_Manager: row['Lãnh đạo trực tiếp'] || '',
      Status: row['Trạng thái công tác'] || '',
      Notes: row['Ghi chú'] || ''
    }));
  } catch (error) { return []; }
}

function getIncomingDocs() {
  try {
    const rawData = sheetDataToObjects(SHEET_NAMES.INCOMING, 1);
    return rawData.map(row => ({
      Doc_ID: row['Mã VB đến'] || '',
      Sign_Number: row['Số/Ký hiệu văn bản'] || '',
      Receive_Date: formatGoogleDate(row['Ngày đến']),
      Draft_Date: formatGoogleDate(row['Ngày văn bản']),
      Summary: row['Trích yếu / nội dung chính'] || '',
      Issuer: row['Cơ quan ban hành'] || '',
      Doc_Type: row['Loại văn bản'] || '',
      Category: row['Lĩnh vực'] || '',
      Urgency: row['Độ khẩn'] || '',
      Security: row['Độ mật'] || '',
      Assigner: row['Lãnh đạo giao xử lý'] || '',
      Lead_Department: row['Đơn vị chủ trì'] || '',
      Lead_Assignee: row['Cán bộ chủ trì'] || '',
      Co_Assignee: row['Cán bộ phối hợp'] || '',
      Deadline: formatGoogleDate(row['Hạn xử lý']),
      Status: row['Trạng thái xử lý'] || 'Mới tiếp nhận',
      Result: row['Kết quả xử lý'] || '',
      Related_Task: row['Mã việc liên quan'] || '',
      Related_Outgoing_Doc: row['Số/Ký hiệu VB đi trả lời'] || '',
      Notes: row['Ghi chú'] || '',
      History: row['Lịch sử chỉnh sửa'] || '',
      File_URL: row['Đường dẫn file'] || '',
      File_Name: row['Tên file'] || '',
      Created_By: row['Người tạo'] || ''
    }));
  } catch (error) { return []; }
}

function getOutgoingDocs() {
  try {
    const rawData = sheetDataToObjects(SHEET_NAMES.OUTGOING, 1);
    return rawData.map(row => ({
      Doc_ID: row['Mã VB đi'] || '',
      Sign_Number: row['Số/Ký hiệu văn bản đi'] || '',
      Release_Date: formatGoogleDate(row['Ngày ký/ban hành']),
      Draft_Date: formatGoogleDate(row['Ngày soạn']),
      Release_Deadline: formatGoogleDate(row['Hạn phát hành']),
      Summary: row['Trích yếu / nội dung chính'] || '',
      Signer: row['Người ký'] || '',
      Doc_Type: row['Loại văn bản'] || '',
      Category: row['Lĩnh vực'] || '',
      Recipient: row['Nơi nhận / đơn vị nhận'] || '',
      Issuer_Department: row['Đơn vị ban hành / chủ trì'] || '',
      Urgency: row['Độ khẩn'] || '',
      Security: row['Độ mật'] || '',
      Related_Incoming_Doc: row['Mã VB đến liên quan'] || '',
      Drafter: row['Cán bộ soạn thảo'] || '',
      Co_Drafter: row['Cán bộ phối hợp'] || '',
      Status: row['Trạng thái phát hành'] || 'Dự thảo',
      Send_Method: row['Hình thức gửi'] || '',
      Send_Date: formatGoogleDate(row['Ngày gửi / hoàn thành']),
      Notes: row['Ghi chú'] || '',
      History: row['Lịch sử chỉnh sửa'] || '',
      File_URL: row['Đường dẫn file'] || '',
      File_Name: row['Tên file'] || '',
      Created_By: row['Người tạo'] || ''
    }));
  } catch (error) { return []; }
}

function getTasks() {
  try {
    const rawData = sheetDataToObjects(SHEET_NAMES.TASKS, 1);
    return rawData.map(row => ({
      Task_ID: row['Mã việc'] || '',
      Source: row['Nguồn việc'] || '',
      Linked_Doc_ID: row['Số/Ký hiệu VB liên quan'] || row['Mã VB liên quan'] || '',
      Content: row['Nội dung công việc phải làm'] || '',
      Category: row['Lĩnh vực'] || '',
      Priority: row['Mức độ ưu tiên'] || 'Bình thường',
      Assigner: row['Lãnh đạo giao việc'] || '',
      Lead_Department: row['Đơn vị chủ trì'] || '',
      Lead_Assignee: row['Cán bộ chủ trì'] || '',
      Co_Assignee: row['Cán bộ phối hợp'] || '',
      Assign_Date: formatGoogleDate(row['Ngày giao']),
      Deadline: formatGoogleDate(row['Hạn hoàn thành']),
      Actual_Complete_Date: formatGoogleDate(row['Ngày hoàn thành thực tế']),
      Progress_Percentage: row['% hoàn thành'] ? parseInt(row['% hoàn thành']) : 0,
      Status: row['Trạng thái công việc'] || 'Mới tiếp nhận',
      Result_Output: row['Kết quả đầu ra'] || '',
      Related_Outgoing_Doc: row['Số/Ký hiệu VB trả lời'] || '',
      Extension_Date: formatGoogleDate(row['Ngày xin gia hạn']),
      Extension_Reason: row['Lý do gia hạn'] || '',
      Notes: row['Ghi chú'] || '',
      History: row['Lịch sử chỉnh sửa'] || '',
      File_URL: row['Đường dẫn file'] || '',
      File_Name: row['Tên file'] || '',
      Result_File_URL: row['Đường dẫn file kết quả'] || '',
      Result_File_Name: row['Tên file kết quả'] || '',
      Created_By: row['Người tạo'] || ''
    }));
  } catch (error) { return []; }
}

function getUsers() {
  try {
    return sheetDataToObjects(SHEET_NAMES.USERS, 1);
  } catch (error) { return []; }
}

// ==========================================
// 4. WRITE DATA FUNCTIONS (CRUD)
// ==========================================

function createStaff(data) {
  try {
    let fileInfo = { fileId: '', fileUrl: '', fileSize: 0 };
    if (data.fileBase64) {
      const uploadRes = uploadFileToDrive(data.fileBase64, data.fileName, data.fileMimeType);
      if (uploadRes.success) {
        fileInfo = uploadRes;
      }
    }

    const sheet = getDb().getSheetByName(SHEET_NAMES.STAFF);
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const newId = `CB-${(lastRow).toString().padStart(3, '0')}`;

    const rowData = {
      'Mã CB': newId,
      'Họ và tên': data.fullName || '',
      'Tên file ảnh': data.fileName || '',
      'Loại file ảnh': data.fileMimeType || '',
      'Dung lượng ảnh': fileInfo.fileSize || '',
      'ID file ảnh': fileInfo.fileId || '',
      'Đường dẫn ảnh': fileInfo.fileUrl || '',
      'Chức vụ': data.role || '',
      'Đơn vị/Tổ công tác': data.department || '',
      'Số điện thoại': data.phone || '',
      'Email': data.email || '',
      'Lãnh đạo trực tiếp': data.manager || '',
      'Trạng thái công tác': data.status || 'Đang công tác',
      'Ghi chú': data.notes || ''
    };

    appendDataByHeader(SHEET_NAMES.STAFF, 1, rowData);
    return { success: true, message: 'Đã thêm cán bộ', id: newId };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function createIncomingDoc(data) {
  try {
    let fileInfo = { ids: '', urls: '', sizes: '', names: '', types: '' };
    if (data.files && data.files.length > 0) {
      const processed = processMultipleFiles(data.files);
      if (processed) fileInfo = processed;
    }

    const sheet = getDb().getSheetByName(SHEET_NAMES.INCOMING);
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const newId = `DEN-${(lastRow).toString().padStart(4, '0')}`;

    const rowData = {
      'STT': lastRow,
      'Mã VB đến': newId,
      'Số/Ký hiệu văn bản': data.signNumber || '',
      'Tên file': fileInfo.names || '',
      'Loại file': fileInfo.types || '',
      'Dung lượng file': fileInfo.sizes || '',
      'ID file': fileInfo.ids || '',
      'Đường dẫn file': fileInfo.urls || '',
      'Ngày văn bản': _formatDateToVN(data.docDate) || '',
      'Ngày đến': _formatDateToVN(data.receiveDate) || new Date().toLocaleDateString('en-GB'),
      'Trích yếu / nội dung chính': data.summary || '',
      'Cơ quan ban hành': data.issuer || '',
      'Loại văn bản': data.docType || '',
      'Lĩnh vực': data.category || '',
      'Độ khẩn': data.urgency || '',
      'Độ mật': data.security || '',
      'Lãnh đạo giao xử lý': data.assigner || '',
      'Đơn vị chủ trì': data.leadDepartment || '',
      'Cán bộ chủ trì': data.leadAssignee || '',
      'Cán bộ phối hợp': data.coAssignee || '',
      'Hạn xử lý': _formatDateToVN(data.deadline) || '',
      'Trạng thái xử lý': data.status || 'Mới tiếp nhận',
      'Kết quả xử lý': data.result || '',
      'Mã việc liên quan': data.relatedTask || '',
      'Số/Ký hiệu VB đi trả lời': data.relatedOutgoingDoc || '',
      'Ghi chú': data.notes || '',
      'Người tạo': data.createdBy || ''
    };

    appendDataByHeader(SHEET_NAMES.INCOMING, 1, rowData);
    _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.issuer);
    return { success: true, message: 'Đã lưu văn bản đến', id: newId };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function createOutgoingDoc(data) {
  try {
    let fileInfo = { ids: '', urls: '', sizes: '', names: '', types: '' };
    if (data.files && data.files.length > 0) {
      const processed = processMultipleFiles(data.files);
      if (processed) fileInfo = processed;
    }

    const sheet = getDb().getSheetByName(SHEET_NAMES.OUTGOING);
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const newId = `DI-${(lastRow).toString().padStart(4, '0')}`;
    
    const rowData = {
      'STT': lastRow,
      'Mã VB đi': newId,
      'Số/Ký hiệu văn bản đi': data.signNumber || '',
      'Tên file': fileInfo.names || '',
      'Loại file': fileInfo.types || '',
      'Dung lượng file': fileInfo.sizes || '',
      'ID file': fileInfo.ids || '',
      'Đường dẫn file': fileInfo.urls || '',
      'Ngày soạn': data.draftDate || new Date().toLocaleDateString('en-GB'),
      'Hạn phát hành': data.releaseDeadline || '',
      'Ngày ký/ban hành': data.releaseDate || '',
      'Trích yếu / nội dung chính': data.summary || '',
      'Loại văn bản': data.docType || '',
      'Lĩnh vực': data.category || '',
      'Nơi nhận / đơn vị nhận': data.receiver || '',
      'Đơn vị ban hành / chủ trì': data.issuerDepartment || '',
      'Người ký': data.signer || '',
      'Độ khẩn': data.urgency || '',
      'Độ mật': data.security || '',
      'Mã VB đến liên quan': data.relatedIncomingDoc || '',
      'Cán bộ soạn thảo': data.drafter || '',
      'Cán bộ phối hợp': data.coAssignee || '',
      'Trạng thái phát hành': data.status || 'Dự thảo',
      'Hình thức gửi': data.sendMethod || '',
      'Ngày gửi / hoàn thành': _formatDateToVN(data.sendDate) || '',
      'Ghi chú': data.notes || '',
      'Người tạo': data.createdBy || ''
    };
    appendDataByHeader(SHEET_NAMES.OUTGOING, 1, rowData);
    _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.recipient);
    return { success: true, message: 'Đã lưu văn bản đi', id: newId };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function createTask(data) {
  try {
    let fileInfo = { ids: '', urls: '', sizes: '', names: '', types: '' };
    if (data.existingFiles && data.existingFiles.urls) {
      fileInfo = {
        ids: data.existingFiles.ids || '',
        urls: data.existingFiles.urls || '',
        sizes: data.existingFiles.sizes || '',
        names: data.existingFiles.names || '',
        types: data.existingFiles.types || ''
      };
    }
    
    if (data.files && data.files.length > 0) {
      const processed = processMultipleFiles(data.files);
      if (processed) {
        if (fileInfo.urls) {
          fileInfo.ids += '\n' + processed.ids;
          fileInfo.urls += '\n' + processed.urls;
          fileInfo.sizes += '\n' + processed.sizes;
          fileInfo.names += '\n' + processed.names;
          fileInfo.types += '\n' + processed.types;
        } else {
          fileInfo = processed;
        }
      }
    }
    
    let resultFileInfo = { ids: '', urls: '', sizes: '', names: '', types: '' };
    if (data.resultFiles && data.resultFiles.length > 0) {
      const processed = processMultipleFiles(data.resultFiles);
      if (processed) resultFileInfo = processed;
    }

    const sheet = getDb().getSheetByName(SHEET_NAMES.TASKS);
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const newId = `CV-${(lastRow).toString().padStart(4, '0')}`;
    
    const rowData = {
      'STT': lastRow,
      'Mã việc': newId,
      'Nguồn việc': data.source || '',
      'Mã VB liên quan': data.relatedDoc || '',
      'Nội dung công việc phải làm': data.content || '',
      'Lĩnh vực': data.category || '',
      'Mức độ ưu tiên': data.priority || 'Bình thường',
      'Lãnh đạo giao việc': data.assigner || '',
      'Đơn vị chủ trì': data.leadDepartment || '',
      'Cán bộ chủ trì': data.leadAssignee || '',
      'Cán bộ phối hợp': data.coAssignee || '',
      'Ngày giao': _formatDateToVN(data.assignDate) || new Date().toLocaleDateString('en-GB'),
      'Hạn hoàn thành': _formatDateToVN(data.deadline) || '',
      'Ngày hoàn thành thực tế': _formatDateToVN(data.actualCompleteDate) || '',
      '% hoàn thành': data.progressPercentage || '0%',
      'Trạng thái công việc': data.status || 'Mới tiếp nhận',
      'Kết quả đầu ra': data.resultOutput || '',
      'Số/Ký hiệu VB trả lời': data.relatedOutgoingDoc || '',
      'Ngày xin gia hạn': _formatDateToVN(data.extensionDate) || '',
      'Lý do gia hạn': data.extensionReason || '',
      'Ghi chú': data.notes || '',
      'Tên file': fileInfo.names || '',
      'Loại file': fileInfo.types || '',
      'Dung lượng file': fileInfo.sizes || '',
      'ID file': fileInfo.ids || '',
      'Đường dẫn file': fileInfo.urls || '',
      'Tên file kết quả': resultFileInfo.names || '',
      'Loại file kết quả': resultFileInfo.types || '',
      'Dung lượng kết quả': resultFileInfo.sizes || '',
      'ID file kết quả': resultFileInfo.ids || '',
      'Đường dẫn file kết quả': resultFileInfo.urls || '',
      'Người tạo': data.createdBy || ''
    };
    appendDataByHeader(SHEET_NAMES.TASKS, 1, rowData);
    _notifyZaloOnNewTask(data);
    return { success: true, message: 'Đã tạo công việc', id: newId };
  } catch (error) { return { success: false, message: error.toString() }; }
}

// --- STAFF ---
function updateStaff(id, data) {
  try {
    const rowData = {
      'Họ và tên': data.fullName,
      'Chức vụ': data.role,
      'Đơn vị/Tổ công tác': data.department,
      'Số điện thoại': data.phone,
      'Email': data.email,
      'Lãnh đạo trực tiếp': data.manager,
      'Trạng thái công tác': data.status,
      'Ghi chú': data.notes
    };
    if (data.fileBase64) {
      const uploadRes = uploadFileToDrive(data.fileBase64, data.fileName, data.fileMimeType);
      if (uploadRes.success) {
        rowData['Tên file ảnh'] = data.fileName;
        rowData['Loại file ảnh'] = data.fileMimeType;
        rowData['Dung lượng ảnh'] = uploadRes.fileSize;
        rowData['ID file ảnh'] = uploadRes.fileId;
        rowData['Đường dẫn ảnh'] = uploadRes.fileUrl;
      }
    }
    Object.keys(rowData).forEach(key => rowData[key] === undefined && delete rowData[key]);
    updateDataByHeader(SHEET_NAMES.STAFF, 'Mã CB', id, 1, rowData);
    return { success: true, message: 'Cập nhật thành công' };
  } catch (error) { return { success: false, message: error.toString() }; }
}
function deleteStaff(id) {
  try { deleteDataByHeader(SHEET_NAMES.STAFF, 'Mã CB', id, 1); return { success: true }; }
  catch (error) { return { success: false, message: error.toString() }; }
}

// --- INCOMING DOCS ---
function updateIncomingDoc(id, data) {
  try {
    const rowData = {
      'Số/Ký hiệu văn bản': data.signNumber,
      'Ngày văn bản': _formatDateToVN(data.docDate),
      'Ngày đến': _formatDateToVN(data.receiveDate),
      'Trích yếu / nội dung chính': data.summary,
      'Cơ quan ban hành': data.issuer,
      'Loại văn bản': data.docType,
      'Lĩnh vực': data.category,
      'Độ khẩn': data.urgency,
      'Độ mật': data.security,
      'Lãnh đạo giao xử lý': data.assigner,
      'Đơn vị chủ trì': data.leadDepartment,
      'Cán bộ chủ trì': data.leadAssignee,
      'Cán bộ phối hợp': data.coAssignee,
      'Hạn xử lý': _formatDateToVN(data.deadline),
      'Trạng thái xử lý': data.status,
      'Kết quả xử lý': data.result,
      'Mã việc liên quan': data.relatedTask,
      'Số/Ký hiệu VB đi trả lời': data.relatedOutgoingDoc,
      'Ghi chú': data.notes
    };
    if (data.files && data.files.length > 0) {
      const processed = processMultipleFiles(data.files);
      if (processed) {
        rowData['Tên file'] = processed.names;
        rowData['Loại file'] = processed.types;
        rowData['Dung lượng file'] = processed.sizes;
        rowData['ID file'] = processed.ids;
        rowData['Đường dẫn file'] = processed.urls;
      }
    }
    if (data.auditLog) {
      const oldData = sheetDataToObjects(SHEET_NAMES.INCOMING, 1).find(r => r['Mã VB đến'] === id);
      const oldLog = oldData ? (oldData['Lịch sử chỉnh sửa'] || '') : '';
      rowData['Lịch sử chỉnh sửa'] = data.auditLog + (oldLog ? '\n\n' + oldLog : '');
    }
    if (data.createdBy) {
      rowData['Người tạo'] = data.createdBy;
    }
    Object.keys(rowData).forEach(key => rowData[key] === undefined && delete rowData[key]);
    updateDataByHeader(SHEET_NAMES.INCOMING, 'Mã VB đến', id, 1, rowData);
    if (data.issuer) _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.issuer);
    return { success: true, message: 'Cập nhật thành công' };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function _deleteFilesAssociatedWithRecord(sheetName, idColumnName, idValue) {
  try {
    const sheet = getDb().getSheetByName(sheetName);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return;
    
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const idColIndex = headers.indexOf(idColumnName);
    
    // Tìm cột lưu ID file (Tùy sheet, có thể là 'ID file', 'File đính kèm', hoặc 'Ảnh 3x4' v.v.)
    // Nhưng chuẩn của chúng ta là 'ID file' (cho VB và Task)
    let fileIdColIndex = headers.indexOf('ID file');
    if (fileIdColIndex === -1) fileIdColIndex = headers.indexOf('Avatar_ID'); // staff fallback
    
    if (idColIndex === -1 || fileIdColIndex === -1) return;
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const data = dataRange.getValues();
    
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][idColIndex]) === String(idValue)) {
        const fileIdsStr = data[i][fileIdColIndex];
        if (fileIdsStr) {
          const ids = String(fileIdsStr).split(',').map(s => s.trim()).filter(s => s);
          ids.forEach(fId => {
            try { DriveApp.getFileById(fId).setTrashed(true); } catch(e) {}
          });
        }
        break;
      }
    }
  } catch(e) {}
}

function deleteIncomingDoc(id) {
  try { _deleteFilesAssociatedWithRecord(SHEET_NAMES.INCOMING, 'Mã VB đến', id); deleteDataByHeader(SHEET_NAMES.INCOMING, 'Mã VB đến', id, 1); return { success: true }; }
  catch (error) { return { success: false, message: error.toString() }; }
}

// --- OUTGOING DOCS ---
function updateOutgoingDoc(id, data) {
  try {
    const rowData = {
      'Số/Ký hiệu văn bản đi': data.signNumber,
      'Ngày soạn': data.draftDate,
      'Hạn phát hành': data.releaseDeadline,
      'Ngày ký/ban hành': data.releaseDate,
      'Trích yếu / nội dung chính': data.summary,
      'Loại văn bản': data.docType,
      'Lĩnh vực': data.category,
      'Nơi nhận / đơn vị nhận': data.receiver,
      'Đơn vị ban hành / chủ trì': data.issuerDepartment,
      'Người ký': data.signer,
      'Độ khẩn': data.urgency,
      'Độ mật': data.security,
      'Mã VB đến liên quan': data.relatedIncomingDoc,
      'Cán bộ soạn thảo': data.drafter,
      'Cán bộ phối hợp': data.coAssignee,
      'Trạng thái phát hành': data.status,
      'Hình thức gửi': data.sendMethod,
      'Ngày gửi / hoàn thành': _formatDateToVN(data.sendDate),
      'Ghi chú': data.notes
    };
    if (data.files && data.files.length > 0) {
      const processed = processMultipleFiles(data.files);
      if (processed) {
        rowData['Tên file'] = processed.names;
        rowData['Loại file'] = processed.types;
        rowData['Dung lượng file'] = processed.sizes;
        rowData['ID file'] = processed.ids;
        rowData['Đường dẫn file'] = processed.urls;
      }
    }
    if (data.auditLog) {
      const oldData = sheetDataToObjects(SHEET_NAMES.OUTGOING, 1).find(r => r['Mã VB đi'] === id);
      const oldLog = oldData ? (oldData['Lịch sử chỉnh sửa'] || '') : '';
      rowData['Lịch sử chỉnh sửa'] = data.auditLog + (oldLog ? '\n\n' + oldLog : '');
    }
    if (data.createdBy) {
      rowData['Người tạo'] = data.createdBy;
    }
    Object.keys(rowData).forEach(key => rowData[key] === undefined && delete rowData[key]);
    updateDataByHeader(SHEET_NAMES.OUTGOING, 'Mã VB đi', id, 1, rowData);
    if (data.recipient) _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.recipient);
    return { success: true, message: 'Cập nhật thành công' };
  } catch (error) { return { success: false, message: error.toString() }; }
}
function deleteOutgoingDoc(id) {
  try { deleteDataByHeader(SHEET_NAMES.OUTGOING, 'Mã VB đi', id, 1); return { success: true }; }
  catch (error) { return { success: false, message: error.toString() }; }
}

// --- TASKS ---
function updateTask(id, data) {
  try {
    const rowData = {
      'Nguồn việc': data.source,
      'Mã VB liên quan': data.relatedDoc,
      'Nội dung công việc phải làm': data.content,
      'Lĩnh vực': data.category,
      'Mức độ ưu tiên': data.priority,
      'Lãnh đạo giao việc': data.assigner,
      'Đơn vị chủ trì': data.leadDepartment,
      'Cán bộ chủ trì': data.leadAssignee,
      'Cán bộ phối hợp': data.coAssignee,
      'Ngày giao': _formatDateToVN(data.assignDate),
      'Hạn hoàn thành': _formatDateToVN(data.deadline),
      'Ngày hoàn thành thực tế': _formatDateToVN(data.actualCompleteDate),
      '% hoàn thành': data.progressPercentage,
      'Trạng thái công việc': data.status,
      'Kết quả đầu ra': data.resultOutput,
      'Số/Ký hiệu VB trả lời': data.relatedOutgoingDoc,
      'Ngày xin gia hạn': _formatDateToVN(data.extensionDate),
      'Lý do gia hạn': data.extensionReason,
      'Ghi chú': data.notes
    };
    if (data.files && data.files.length > 0) {
      const processed = processMultipleFiles(data.files);
      if (processed) {
        rowData['Tên file'] = processed.names;
        rowData['Loại file'] = processed.types;
        rowData['Dung lượng file'] = processed.sizes;
        rowData['ID file'] = processed.ids;
        rowData['Đường dẫn file'] = processed.urls;
      }
    }
    if (data.resultFiles && data.resultFiles.length > 0) {
      const processed = processMultipleFiles(data.resultFiles);
      if (processed) {
        rowData['Tên file kết quả'] = processed.names;
        rowData['Loại file kết quả'] = processed.types;
        rowData['Dung lượng kết quả'] = processed.sizes;
        rowData['ID file kết quả'] = processed.ids;
        rowData['Đường dẫn file kết quả'] = processed.urls;
      }
    }
    if (data.auditLog) {
      const oldData = sheetDataToObjects(SHEET_NAMES.TASKS, 1).find(r => r['Mã việc'] === id);
      const oldLog = oldData ? (oldData['Lịch sử chỉnh sửa'] || '') : '';
      rowData['Lịch sử chỉnh sửa'] = data.auditLog + (oldLog ? '\n\n' + oldLog : '');
    }
    if (data.createdBy) {
      rowData['Người tạo'] = data.createdBy;
    }
    Object.keys(rowData).forEach(key => rowData[key] === undefined && delete rowData[key]);
    updateDataByHeader(SHEET_NAMES.TASKS, 'Mã việc', id, 1, rowData);
    
    // Auto-sync logic: Đóng văn bản đến nếu tất cả việc con đã xong
    try {
      if (rowData['Trạng thái công việc'] === 'Hoàn thành') {
        const allTasks = sheetDataToObjects(SHEET_NAMES.TASKS, 1);
        const updatedTask = allTasks.find(t => String(t['Mã việc']) === String(id));
        const linkedDocId = updatedTask ? updatedTask['Mã VB liên quan'] || updatedTask['Số/Ký hiệu VB liên quan'] : null;
        
        if (linkedDocId) {
          // Lọc các task thuộc cùng văn bản
          const sisterTasks = allTasks.filter(t => (t['Mã VB liên quan'] === linkedDocId || t['Số/Ký hiệu VB liên quan'] === linkedDocId) && t['Mã việc']);
          const allDone = sisterTasks.length > 0 && sisterTasks.every(t => t['Trạng thái công việc'] === 'Hoàn thành');
          if (allDone) {
             updateDataByHeader(SHEET_NAMES.INCOMING, 'Mã VB đến', linkedDocId, 1, { 'Trạng thái xử lý': 'Hoàn thành' });
          }
        }
      }
    } catch (e) {
      console.log('Lỗi auto-sync:', e);
    }

    return { success: true, message: 'Cập nhật thành công' };
  } catch (error) { return { success: false, message: error.toString() }; }
}
function deleteTask(id) {
  try { deleteDataByHeader(SHEET_NAMES.TASKS, 'Mã việc', id, 1); return { success: true }; }
  catch (error) { return { success: false, message: error.toString() }; }
}

// --- USERS ---
function createUser(data) {
  try {
    const sheet = getDb().getSheetByName(SHEET_NAMES.USERS);
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const newId = `USER-${(lastRow).toString().padStart(4, '0')}`;
    const rowData = {
      'Mã người dùng': newId,
      'Tên đăng nhập': data.username || '',
      'Mật khẩu': data.password || '',
      'Mã cán bộ': data.staffId || '',
      'Họ tên cán bộ': data.fullName || '',
      'Tên người dùng': data.displayName || '',
      'Phạm vi dữ liệu': data.dataScope || '',
      'Phân quyền': data.role || ''
    };
    appendDataByHeader(SHEET_NAMES.USERS, 1, rowData);
    return { success: true, message: 'Đã tạo người dùng', id: newId };
  } catch (error) { return { success: false, message: error.toString() }; }
}
function updateUser(id, data) {
  try {
    const rowData = {
      'Tên đăng nhập': data.username,
      'Mật khẩu': data.password,
      'Mã cán bộ': data.staffId,
      'Họ tên cán bộ': data.fullName,
      'Tên người dùng': data.displayName,
      'Phạm vi dữ liệu': data.dataScope,
      'Phân quyền': data.role
    };
    Object.keys(rowData).forEach(key => rowData[key] === undefined && delete rowData[key]);
    updateDataByHeader(SHEET_NAMES.USERS, 'Mã người dùng', id, 1, rowData);
    return { success: true, message: 'Cập nhật thành công' };
  } catch (error) { return { success: false, message: error.toString() }; }
}
function deleteUser(id) {
  try { deleteDataByHeader(SHEET_NAMES.USERS, 'Mã người dùng', id, 1); return { success: true }; }
  catch (error) { return { success: false, message: error.toString() }; }
}

// ==========================================
// SETUP / CATALOG CRUD
// ==========================================

function _getSetupColumnIndex(sheet, type) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 2) return -1;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  // Note: the headers in initDatabase start from Col 2, 4, 6...
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === String(type).toLowerCase()) return i + 1;
  }
  return -1;
}



function _formatDateToVN(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  if (dateStr.includes('-')) {
    const parts = dateStr.trim().split(' ');
    const datePart = parts[0];
    const timePart = parts.length > 1 ? ' ' + parts.slice(1).join(' ') : '';
    
    const dParts = datePart.split('-');
    if (dParts.length === 3) {
      return `${dParts[2]}/${dParts[1]}/${dParts[0]}${timePart}`;
    }
  }
  return dateStr;
}

function _autoAddSetupIfMissing(type, value) {
  if (!type || !value) return;
  try {
    const sheet = getDb().getSheetByName(SHEET_NAMES.SETUP);
    if (!sheet) return;
    const colIdx = _getSetupColumnIndex(sheet, type);
    if (colIdx === -1) return;
    
    const numRows = Math.max(1, sheet.getLastRow() - 1);
    const colValues = sheet.getRange(2, colIdx, numRows, 1).getValues();
    let insertRow = 2;
    let found = false;
    for (let i = 0; i < colValues.length; i++) {
      const cellVal = String(colValues[i][0]).trim();
      if (cellVal.toLowerCase() === String(value).trim().toLowerCase()) {
        found = true;
        break;
      }
      if (!cellVal) {
        insertRow = i + 2;
        break;
      }
      insertRow = i + 3;
    }
    if (!found) {
      sheet.getRange(insertRow, colIdx).setValue(String(value).trim());
    }
  } catch (e) {
    console.log('Error auto add setup', e);
  }
}

function addSetupData(data) {
  try {
    const { type, value } = data;
    if (!type || !value) return { success: false, message: 'Thiếu dữ liệu' };
    const sheet = getDb().getSheetByName(SHEET_NAMES.SETUP);
    const colIdx = _getSetupColumnIndex(sheet, type);
    if (colIdx === -1) return { success: false, message: 'Không tìm thấy loại danh mục này' };
    
    // Find last empty row in that column
    const colValues = sheet.getRange(2, colIdx, Math.max(1, sheet.getLastRow() - 1), 1).getValues();
    let insertRow = 2;
    for (let i = 0; i < colValues.length; i++) {
      if (!colValues[i][0]) {
        insertRow = i + 2;
        break;
      }
      insertRow = i + 3; // next row
    }
    
    sheet.getRange(insertRow, colIdx).setValue(value);
    return { success: true, message: 'Đã thêm danh mục' };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function updateSetupData(data) {
  try {
    const { type, oldValue, newValue } = data;
    if (!type || !oldValue || !newValue) return { success: false, message: 'Thiếu dữ liệu' };
    const sheet = getDb().getSheetByName(SHEET_NAMES.SETUP);
    const colIdx = _getSetupColumnIndex(sheet, type);
    if (colIdx === -1) return { success: false, message: 'Không tìm thấy loại danh mục này' };
    
    const colValues = sheet.getRange(2, colIdx, Math.max(1, sheet.getLastRow() - 1), 1).getValues();
    let targetRow = -1;
    for (let i = 0; i < colValues.length; i++) {
      if (String(colValues[i][0]) === String(oldValue)) {
        targetRow = i + 2;
        break;
      }
    }
    
    if (targetRow === -1) return { success: false, message: 'Không tìm thấy giá trị cũ' };
    sheet.getRange(targetRow, colIdx).setValue(newValue);
    return { success: true, message: 'Đã cập nhật danh mục' };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function deleteSetupData(data) {
  try {
    const { type, value } = data;
    if (!type || !value) return { success: false, message: 'Thiếu dữ liệu' };
    const sheet = getDb().getSheetByName(SHEET_NAMES.SETUP);
    const colIdx = _getSetupColumnIndex(sheet, type);
    if (colIdx === -1) return { success: false, message: 'Không tìm thấy loại danh mục này' };
    
    const numRows = Math.max(1, sheet.getLastRow() - 1);
    const colValues = sheet.getRange(2, colIdx, numRows, 1).getValues();
    let targetRowIndex = -1;
    for (let i = 0; i < colValues.length; i++) {
      if (String(colValues[i][0]) === String(value)) {
        targetRowIndex = i;
        break;
      }
    }
    
    if (targetRowIndex === -1) return { success: false, message: 'Không tìm thấy giá trị cần xóa' };
    
    // Xóa value và đẩy mảng lên
    colValues.splice(targetRowIndex, 1);
    colValues.push(['']); // pad end
    sheet.getRange(2, colIdx, numRows, 1).setValues(colValues);
    
    return { success: true, message: 'Đã xóa danh mục' };
  } catch (error) { return { success: false, message: error.toString() }; }
}

// ==========================================
// 5. GENERIC REQUEST HANDLER
// ==========================================
function handleRequest(action, payload) {
  try {
    if (action === 'LOGIN') {
      const users = sheetDataToObjects(SHEET_NAMES.USERS, 1);
      const user = users.find(u => 
        (u['Tên đăng nhập'] || '').toString().trim().toLowerCase() === (payload.username || '').toString().trim().toLowerCase() && 
        (u['Mật khẩu'] || '').toString().trim() === (payload.password || '').toString().trim()
      );
      if (user) {
        return {
          success: true,
          user: { 
            Username: user['Tên đăng nhập'], 
            Linked_Staff_ID: user['Mã cán bộ'], 
            Data_Scope: user['Phạm vi dữ liệu'], 
            Role: user['Phân quyền'],
            FullName: user['Họ tên cán bộ']
          }
        };
      }
      return { success: false, error: 'Sai thông tin đăng nhập' };
    }
    if (action === 'SYNC_DONG_NAI') {
      return syncDongNaiToSheet(payload);
    }
    
    return { success: false, error: 'Unknown action: ' + action };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==========================================
// 6. MODULE ĐỒNG BỘ ĐỒNG NAI (CRAWLER)
// ==========================================

const DONGNAI_CONFIG = {
  LOGIN_URL: "https://qlvb-snnmt.dongnai.gov.vn/HeThong/pDangNhap.aspx",
  LIST_URL: "https://qlvb-snnmt.dongnai.gov.vn/VanBanDen/pDanhSachVanBanDenNew.aspx"
};

/**
 * Hàm phân tích và bóc tách input type hidden
 */
function extractHiddenFields(html) {
  const fields = {};
  const regex = /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    fields[match[1]] = match[2];
  }
  return fields;
}

/**
 * Giả lập đăng nhập để lấy Cookie
 */
function loginSnnmtBot(username, password) {
  // Hàm trích xuất Cookie bất chấp GAS nối chuỗi hay mảng
  function extractImportantCookies(headersObj, existingDict) {
    const dict = existingDict || {};
    const text = JSON.stringify(headersObj);
    const regex = /(ASP\.NET_SessionId|LoginToken|cookiesession1)=([^;",\s}]+)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      dict[match[1]] = match[2];
    }
    return dict;
  }

  // 1. GET để lấy ViewState
  const loginPageRes = UrlFetchApp.fetch(DONGNAI_CONFIG.LOGIN_URL, { 
    muteHttpExceptions: true,
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  const html = loginPageRes.getContentText();
  const hiddenFields = extractHiddenFields(html);
  
  // Lấy các Cookie ban đầu bằng Regex
  let cookieDict = extractImportantCookies(loginPageRes.getHeaders(), {});
  const initialCookieStr = Object.keys(cookieDict).map(k => k + '=' + cookieDict[k]).join('; ');

  // 2. Chuẩn bị POST Payload
  const payloadObj = {
    ...hiddenFields,
    '__EVENTTARGET': 'lnkDangnhap',
    '__EVENTARGUMENT': '',
    'txtTenDangNhap': username,
    'txtMatKhau': password,
    'txtTenDangNhapUQ': '' // Required empty field
  };
  const payloadStr = Object.keys(payloadObj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(payloadObj[k])).join('&');

  const options = {
    method: 'post',
    payload: payloadStr,
    headers: { 
      'Cookie': initialCookieStr,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Referer': DONGNAI_CONFIG.LOGIN_URL,
      'Origin': 'https://qlvb-snnmt.dongnai.gov.vn'
    },
    followRedirects: false, // Bắt buộc false để lấy headers 302
    muteHttpExceptions: true
  };

  const postRes = UrlFetchApp.fetch(DONGNAI_CONFIG.LOGIN_URL, options);
  if (postRes.getResponseCode() === 200) {
     throw new Error("Đăng nhập thất bại (Server trả về 200 thay vì 302). Xem lại Tài khoản. Ck: " + initialCookieStr);
  }
  
  // 3. Cập nhật Auth Cookie (Đè lên Session cũ nếu có) bằng Regex
  cookieDict = extractImportantCookies(postRes.getHeaders(), cookieDict);
  
  const finalCookie = Object.keys(cookieDict).map(k => k + '=' + cookieDict[k]).join('; ');
  return finalCookie;
}

/**
 * Crawler và bóc tách dữ liệu văn bản
 */
function scrapeIncomingDocs(cookie) {
  const options = {
    method: 'get',
    headers: { 
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Referer': DONGNAI_CONFIG.LOGIN_URL
    },
    muteHttpExceptions: true
  };
  const htmlRes = UrlFetchApp.fetch(DONGNAI_CONFIG.LIST_URL, options);
  const html = htmlRes.getContentText();
  
  // Cắt tới bảng văn bản
  const tableMatch = html.match(/<table[^>]*id="[^"]*grdVanBan[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
     throw new Error("Lỗi Server trả về Trang trống hoặc từ chối Session. Độ dài: " + html.length + ". Cookie gửi đi: " + cookie);
  }
  
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(tableMatch[1])) !== null) {
    const trHtml = trMatch[1];
    if (trHtml.includes('<th')) continue; // Bỏ qua header
    
    // Tìm các thẻ td
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    let files = []; // Chuyển ra ngoài để dùng được sau vòng lặp
    while ((tdMatch = tdRegex.exec(trHtml)) !== null) {
      // Phân tích lấy file đính kèm
      let tdHtml = tdMatch[1]; // Cột có thể chứa file
      const fileRegex = /href='([^']+fdownload=1&FileDownload=\d+)'[^>]*>.*?<\/a><a href='[^']*'[^>]*>([^<]+)<\/a>/gi;
      let fMatch;
      while ((fMatch = fileRegex.exec(tdHtml)) !== null) {
         let url = fMatch[1];
         let fName = fMatch[2].trim();
         if (!url.startsWith('http')) {
            url = 'https://qlvb-snnmt.dongnai.gov.vn' + (url.startsWith('/') ? '' : '/') + url;
         }
         files.push({ url: url.replace(/&amp;/g, '&'), fileName: fName });
      }

      let text = tdHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      text = text.replace(/\s+/g, ' '); // Xóa khoảng trắng thừa
      tds.push(text);
    }
    
    if (tds.length >= 6) {
      // Ví dụ: tds[3] = '3864/VPĐK-PHCTH _ 28/04/2026 Văn phòng Đăng ký...'
      let signNum = tds[3].split('_')[0].trim();
      let issuerRaw = tds[3].split('_')[1] || ''; 
      let issuer = issuerRaw.replace(/\d{2}\/\d{2}\/\d{4}/, '').trim(); 
      
      // Ví dụ: tds[2] = '29/04/2026 10:15:45 Chưa xử lý Xin ý kiến'
      let receiveDateMatch = tds[2].match(/\d{2}\/\d{2}\/\d{4}/);
      let receiveDate = receiveDateMatch ? receiveDateMatch[0] : tds[2];
      
      rows.push({
        Sign_Number: signNum || 'Chưa rõ',
        Receive_Date: receiveDate || '',
        Summary: tds[4] || '',
        Issuer: issuer || '',
        Files: files
      });
    }
  }
  
  return rows;
}

/**
 * API Gọi từ Front-end để tiến hành đồng bộ
 */
function syncDongNaiToSheet(credentials) {
  try {
    const cookie = loginSnnmtBot(credentials.username, credentials.password);
    const docs = scrapeIncomingDocs(cookie);
    
    if (docs.length === 0) return { success: true, message: 'Không có dữ liệu mới hoặc không cào được.', count: 0 };
    
    const sheet = getDb().getSheetByName('Văn bản đến');
    const existingIds = sheet.getRange(2, 3, Math.max(1, sheet.getLastRow() - 1), 1).getValues().flat().map(String);
    
    let addedCount = 0;
    docs.forEach(doc => {
      // Lọc trùng theo Số ký hiệu (Sign_Number)
      if (!existingIds.includes(String(doc.Sign_Number))) {
        
        // --- Xử lý tải File đính kèm về Google Drive ---
        let fileNames = [];
        let fileUrls = [];
        let fileIds = [];

        if (doc.Files && doc.Files.length > 0) {
           doc.Files.forEach(f => {
              try {
                 let response = UrlFetchApp.fetch(f.url, { headers: { 'Cookie': cookie }, muteHttpExceptions: true });
                 if (response.getResponseCode() === 200) {
                   let blob = response.getBlob();
                   blob.setName(f.fileName);
                   let uploaded = uploadBlobToDrive(blob);
                   if (uploaded.success) {
                     fileNames.push(uploaded.fileName);
                     fileUrls.push(uploaded.fileUrl);
                     fileIds.push(uploaded.fileId);
                   }
                 }
              } catch (e) {
                 Logger.log('Lỗi tải file: ' + e);
              }
           });
        }

        const rowData = {
          'Mã VB đến': `DEN-${new Date().getTime()}`,
          'Số/Ký hiệu văn bản': doc.Sign_Number,
          'Ngày đến': doc.Receive_Date,
          'Trích yếu / nội dung chính': doc.Summary,
          'Cơ quan ban hành': doc.Issuer,
          'Lãnh đạo giao xử lý': '', // Đã bỏ theo yêu cầu
          'Trạng thái xử lý': 'Mới tiếp nhận',
          'Tên file': fileNames.join(', '),
          'Đường dẫn file': fileUrls.join('\n'),
          'ID file': fileIds.join(', '),
          'Người tạo': 'Bot Đồng Nai'
        };
        appendDataByHeader('Văn bản đến', 1, rowData);
        addedCount++;
      }
    });
    
    return { success: true, message: `Đồng bộ thành công! Đã thêm ${addedCount} văn bản mới.`, count: addedCount };
  } catch (error) {
    return { success: false, message: 'Lỗi đồng bộ: ' + error.toString() };
  }
}

// ==========================================
// 6. DATABASE SETUP UTILITY
// ==========================================
/**
 * Chạy hàm này 1 lần duy nhất từ Apps Script Editor để tự động tạo các Sheet và tiêu đề cột giống hệt bản gốc!
 */
function initDatabase() {
  const ss = getDb();
  
  const sheetsConfig = [
    {
      name: 'Người dùng',
      row: 1,
      headers: ['Mã người dùng', 'Tên đăng nhập', 'Mật khẩu', 'Mã cán bộ', 'Họ tên cán bộ', 'Tên người dùng', 'Phạm vi dữ liệu', 'Phân quyền']
    },
    {
      name: 'Danh sách cán bộ',
      row: 1,
      headers: ['Mã CB', 'Họ và tên', 'Tên file ảnh', 'Loại file ảnh', 'Dung lượng ảnh', 'ID file ảnh', 'Đường dẫn ảnh', 'Chức vụ', 'Đơn vị/Tổ công tác', 'Số điện thoại', 'Email', 'Lãnh đạo trực tiếp', 'Trạng thái công tác', 'Ghi chú']
    },
    {
      name: 'Văn bản đến',
      row: 1,
      headers: ['STT', 'Mã VB đến', 'Số/Ký hiệu văn bản', 'Tên file', 'Loại file', 'Dung lượng file', 'ID file', 'Đường dẫn file', 'Ngày văn bản', 'Ngày đến', 'Trích yếu / nội dung chính', 'Cơ quan ban hành', 'Loại văn bản', 'Lĩnh vực', 'Độ khẩn', 'Độ mật', 'Lãnh đạo giao xử lý', 'Đơn vị chủ trì', 'Cán bộ chủ trì', 'Cán bộ phối hợp', 'Hạn xử lý', 'Trạng thái xử lý', 'Kết quả xử lý', 'Mã việc liên quan', 'Số/Ký hiệu VB đi trả lời', 'Ghi chú', 'Cảnh báo hạn', 'Số ngày còn lại', 'Lịch sử chỉnh sửa', 'Người tạo']
    },
    {
      name: 'Văn bản đi',
      row: 1,
      headers: ['STT', 'Mã VB đi', 'Số/Ký hiệu văn bản đi', 'Tên file', 'Loại file', 'Dung lượng file', 'ID file', 'Đường dẫn file', 'Ngày soạn', 'Hạn phát hành', 'Ngày ký/ban hành', 'Trích yếu / nội dung chính', 'Loại văn bản', 'Lĩnh vực', 'Nơi nhận / đơn vị nhận', 'Đơn vị ban hành / chủ trì', 'Người ký', 'Độ khẩn', 'Độ mật', 'Mã VB đến liên quan', 'Cán bộ soạn thảo', 'Cán bộ phối hợp', 'Trạng thái phát hành', 'Hình thức gửi', 'Ngày gửi / hoàn thành', 'Ghi chú', 'Cảnh báo tiến độ', 'Số ngày còn lại', 'Lịch sử chỉnh sửa', 'Người tạo']
    },
    {
      name: 'Quản lý công việc',
      row: 1,
      headers: ['STT', 'Mã việc', 'Nguồn việc', 'Mã VB liên quan', 'Số/Ký hiệu VB liên quan', 'Trích yếu VB liên quan', 'Nội dung công việc phải làm', 'Lĩnh vực', 'Mức độ ưu tiên', 'Lãnh đạo giao việc', 'Đơn vị chủ trì', 'Cán bộ chủ trì', 'Cán bộ phối hợp', 'Ngày giao', 'Hạn hoàn thành', 'Ngày hoàn thành thực tế', '% hoàn thành', 'Trạng thái công việc', 'Kết quả đầu ra', 'Số/Ký hiệu VB trả lời', 'Ghi chú', 'Cảnh báo tiến độ', 'Tên file', 'Loại file', 'Dung lượng file', 'ID file', 'Đường dẫn file', 'Tên file kết quả', 'Loại file kết quả', 'Dung lượng kết quả', 'ID file kết quả', 'Đường dẫn file kết quả', 'Lịch sử chỉnh sửa', 'Người tạo']
    }
  ];

  sheetsConfig.forEach(config => {
    let sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
    }
    // Xóa header cũ nếu có
    sheet.getRange(config.row, 1, 1, 50).clearContent().clearFormat();
    // Đặt header mới
    sheet.getRange(config.row, 1, 1, config.headers.length).setValues([config.headers])
         .setFontWeight('bold').setBackground('#004d40').setFontColor('white');
    sheet.setFrozenRows(config.row);
  });
  
  // SETUP
  let catalogSheet = ss.getSheetByName('SETUP');
  if (!catalogSheet) catalogSheet = ss.insertSheet('SETUP');
  
  const catalogHeaders = [
    'Trạng thái VB đến', 'Trạng thái VB đi', 'Nguồn việc', 'Loại văn bản', 
    'Trạng thái công tác', 'Độ khẩn/Ưu tiên', 'Độ mật', 'Vai trò hệ thống', 
    'Hình thức gửi', 'Trạng thái công việc', 'Lĩnh vực', 'Chức vụ', 
    'Đơn vị/Tổ công tác', 'Cơ quan ban hành/nhận', 'Lãnh đạo giao việc',
    'Kết quả xử lý/đầu ra', 'Phạm vi dữ liệu', 'Phân quyền', 
    'Mức độ ưu tiên', 'Cảnh báo tiến độ', 'Cảnh báo hạn'
  ];
  
  catalogSheet.getRange(1, 1, 1, catalogHeaders.length * 2).clearContent().clearFormat();
  for(let i=0; i<catalogHeaders.length; i++) {
    catalogSheet.getRange(1, (i*2) + 2).setValue(catalogHeaders[i])
                .setFontWeight('bold').setBackground('#004d40').setFontColor('white');
  }
  catalogSheet.setFrozenRows(1);
  
  // Dữ liệu mẫu phong phú cho SETUP
  const setupData = {
    'Trạng thái VB đến': ['Mới tiếp nhận', 'Đang xử lý', 'Chờ duyệt', 'Đã lưu kho', 'Quá hạn', 'Hoàn thành', 'Trả lại'],
    'Trạng thái VB đi': ['Dự thảo', 'Chờ duyệt', 'Chờ ký', 'Đã phát hành', 'Đã gửi', 'Trả lại', 'Hủy bỏ'],
    'Nguồn việc': ['Theo văn bản đến', 'Theo văn bản đi', 'Kế hoạch năm', 'Kế hoạch tháng/quý', 'Giao việc đột xuất', 'Ý kiến chỉ đạo', 'Họp giao ban'],
    'Loại văn bản': ['Báo cáo', 'Bản ghi nhớ', 'Bản thỏa thuận', 'Chỉ thị', 'Chương trình', 'Công điện', 'Công văn', 'Dự án', 'Đề án', 'Giấy giới thiệu', 'Giấy mời', 'Giấy nghỉ phép', 'Giấy ủy quyền', 'Hợp đồng', 'Hướng dẫn', 'Kế hoạch', 'Nghị quyết', 'Phiếu báo', 'Phiếu chuyển', 'Phiếu gửi', 'Phương án', 'Quy chế', 'Quy định', 'Quyết định', 'Thông báo', 'Thông cáo', 'Thư công', 'Tờ trình'],
    'Trạng thái công tác': ['Đang công tác', 'Tạm hoãn', 'Nghỉ hưu', 'Nghỉ việc', 'Chuyển công tác'],
    'Độ khẩn/Ưu tiên': ['Thấp', 'Bình thường', 'Trung bình', 'Cao', 'Khẩn', 'Hỏa tốc'],
    'Độ mật': ['Thường', 'Mật', 'Tối mật', 'Tuyệt mật'],
    'Vai trò hệ thống': ['Admin', 'Lãnh đạo', 'Văn thư', 'Chuyên viên'],
    'Hình thức gửi': ['Trực tiếp', 'Email công vụ', 'Hệ thống QLVB', 'Bưu điện', 'Zalo/nhóm công việc', 'Khác'],
    'Trạng thái công việc': ['Mới tiếp nhận', 'Đã phân công', 'Đang xử lý', 'Chờ phối hợp', 'Chờ duyệt', 'Tạm dừng', 'Hoàn thành', 'Quá hạn'],
    'Lĩnh vực': ['Tổng hợp', 'Chỉ đạo điều hành', 'Văn phòng', 'Tổ chức cán bộ', 'Nhân sự', 'Thi đua khen thưởng', 'Cải cách hành chính', 'Chuyển đổi số', 'Công nghệ thông tin', 'An toàn thông tin', 'Pháp chế', 'Thanh tra', 'Tiếp công dân', 'Khiếu nại tố cáo', 'Quốc phòng', 'An ninh trật tự', 'Tài chính - ngân sách', 'Đất đai - xây dựng', 'Văn hóa - xã hội', 'Tư pháp - hộ tịch', 'Lao động - TBXH', 'Giáo dục'],
    'Chức vụ': ['Bí thư Đảng ủy', 'Phó Bí thư Thường trực', 'Chủ tịch UBND', 'Phó Chủ tịch UBND', 'Chủ tịch HĐND', 'Phó Chủ tịch HĐND', 'Công chức Văn phòng - Thống kê', 'Công chức Tư pháp - Hộ tịch', 'Công chức Tài chính - Kế toán', 'Công chức Địa chính - Xây dựng', 'Công chức Văn hóa - Xã hội', 'Trưởng Công an xã', 'Chỉ huy trưởng Quân sự', 'Chủ tịch MTTQ', 'Bí thư Đoàn Thanh niên', 'Chủ tịch Hội Phụ nữ', 'Chủ tịch Hội Nông dân', 'Cán bộ Một cửa', 'Văn thư - Lưu trữ'],
    'Đơn vị/Tổ công tác': ['Văn phòng HĐND-UBND', 'Đảng ủy xã', 'HĐND xã', 'UBND xã', 'Công an xã', 'Ban CHQS xã', 'Tư pháp - Hộ tịch', 'Tài chính - Kế toán', 'Địa chính - Xây dựng', 'Văn hóa - Xã hội', 'Bộ phận Một cửa', 'MTTQ và đoàn thể', 'Nông nghiệp - Môi trường', 'Y tế xã', 'Trường học trên địa bàn'],
    'Cơ quan ban hành/nhận': ['UBND tỉnh', 'UBND huyện', 'HĐND huyện', 'Huyện ủy', 'Đảng ủy xã', 'UBND xã', 'Phòng Nội vụ', 'Phòng Tài chính - Kế hoạch', 'Phòng Tư pháp', 'Phòng Văn hóa - Thông tin', 'Phòng Tài nguyên và Môi trường', 'Thanh tra huyện', 'Công an huyện', 'Ban CHQS huyện', 'Sở Nội vụ', 'Sở Tư pháp', 'Sở Tài chính', 'Văn phòng HĐND-UBND huyện', 'MTTQ huyện', 'Các thôn/ấp/khu phố'],
    'Lãnh đạo giao việc': ['Bí thư', 'Phó Bí thư Thường trực', 'Chủ tịch UBND', 'Phó Chủ tịch UBND', 'Chủ tịch HĐND', 'Phó Chủ tịch HĐND', 'Chánh Văn phòng', 'Phó Chánh Văn phòng', 'Người đứng đầu đơn vị', 'Lãnh đạo phụ trách lĩnh vực'],
    'Kết quả xử lý/đầu ra': ['Báo cáo', 'Tờ trình', 'Công văn trả lời', 'Quyết định', 'Kế hoạch', 'Thông báo', 'Biên bản', 'Đã tham mưu xong', 'Không thuộc thẩm quyền', 'Chuyển đơn vị khác', 'Lưu theo dõi'],
    'Phạm vi dữ liệu': ['Toàn hệ thống', 'Toàn đơn vị', 'Phòng ban', 'Cá nhân'],
    'Phân quyền': ['Quản trị viên', 'Lãnh đạo', 'Văn thư', 'Chuyên viên'],
    'Mức độ ưu tiên': ['Thấp', 'Bình thường', 'Cao', 'Khẩn'],
    'Cảnh báo tiến độ': ['Chưa thực hiện', 'Đang thực hiện', 'Quá hạn', 'Hoàn thành'],
    'Cảnh báo hạn': ['Sắp đến hạn', 'Đã trễ hạn', 'Đang xử lý', 'Đã xong']
  };

  for(let i=0; i<catalogHeaders.length; i++) {
    const header = catalogHeaders[i];
    if (setupData[header]) {
      const colData = setupData[header].map(item => [item]);
      catalogSheet.getRange(2, (i*2) + 2, colData.length, 1).setValues(colData);
    }
  }
  
  // =====================================
  // SEED DATA - DỮ LIỆU MẪU CLONE TỪ ẢNH
  // =====================================
  
  // 1. Dữ liệu Người dùng
  const userSheet = ss.getSheetByName('Người dùng');
  if (userSheet.getLastRow() <= 1) {
     userSheet.getRange(2, 1, 1, 8).setValues([
       ['ND-001', 'Admin', '123@123Vn', 'CB-004', 'Nguyễn Văn An', 'Nguyễn Văn An', 'Toàn đơn vị', 'Admin']
     ]);
  }
  
  // 2. Dữ liệu Văn bản đến
  const incomingSheet = ss.getSheetByName('Văn bản đến');
  if (incomingSheet.getLastRow() <= 1) {
    const incomingData = [
      [1, 'DEN-0001', '123/CV-UBND', '', '', '', '', '', '01/03/2026', '02/03/2026', 'Tham mưu báo cáo rà soát hiện trạng hạ tầng số, đề xuất nhu cầu đầu tư', 'Sở Thông tin và Truyền thông', 'Công văn', 'Chuyển đổi số', 'Cao', 'Thường', 'Chủ tịch UBND', 'Văn phòng HĐND-UBND', 'Nguyễn Văn An', 'Nguyễn Văn An, Bùi Thị Ngọc', '20/03/2026', 'Đang xử lý', 'Báo cáo rà soát', 'CV-0001', '15/CV-UBND', 'Đã giao việc cho cán bộ đầu mối', 'Đang xử lý', '-2'],
      [2, 'DEN-0002', '88/QĐ-UBND', '', '', '', '', '', '05/03/2026', '06/03/2026', 'Kiểm tra hồ sơ đất đai tồn đọng và tổng hợp danh sách cần xử lý', 'Sở Tài nguyên và Môi trường', 'Quyết định', 'Đất đai - xây dựng', 'Khẩn', 'Thường', 'Phó Chủ tịch UBND', 'Địa chính - Xây dựng', 'Bùi Thị Ngọc', 'Lê Minh Tuấn', '14/03/2026', 'Quá hạn', '', 'CV-0002', '', 'Cần hoàn thành trước cuộc họp', 'Quá hạn', '-4'],
      [3, 'DEN-0003', '45/TB-UBND', '', '', '', '', '', '10/03/2026', '11/03/2026', 'Chuẩn bị nội dung họp giao ban tuần', 'UBND huyện', 'Thông báo', 'Tổng hợp', 'Trung bình', 'Thường', 'Chủ tịch UBND', 'Văn phòng HĐND-UBND', 'Đỗ Minh Khôi', 'Trần Thị Mai', '18/03/2026', 'Đã phân công', '', 'CV-0003', '', 'Cập nhật báo cáo KT-XH', 'Đã trễ hạn', '1'],
      [4, 'DEN-0004', '12/HD-UBND', '', '', '', '', '', '02/03/2026', '03/03/2026', 'Lưu hồ sơ và theo dõi phản hồi của UBND huyện', 'UBND huyện', 'Hướng dẫn', 'Chuyển đổi số', 'Thấp', 'Thường', 'Chủ tịch UBND', 'Văn phòng HĐND-UBND', 'Nguyễn Văn An', 'Nguyễn Văn An', '09/03/2026', 'Hoàn thành', 'Đã lưu kho', 'CV-0004', '', 'Văn bản chỉ đạo chung', 'Đã xong', '-3']
    ];
    incomingSheet.getRange(2, 1, incomingData.length, incomingData[0].length).setValues(incomingData);
  }

  // 3. Dữ liệu Văn bản đi
  const outgoingSheet = ss.getSheetByName('Văn bản đi');
  if (outgoingSheet.getLastRow() <= 1) {
    const outgoingData = [
      [1, 'DI-0001', '15/CV-UBND', '', '', '', '', '', '08/03/2026', '10/03/2026', '', 'Tham mưu báo cáo rà soát hiện trạng hạ tầng số...', 'Công văn', 'Chuyển đổi số', 'UBND huyện', 'UBND xã', 'Chủ tịch UBND', 'Cao', 'Thường', 'DEN-0001', 'Trần Thị Mai', 'Nguyễn Văn An', 'Đã gửi', 'Email công vụ', '08/03/2026', 'Văn bản trả lời cho VB đến về chuyển đổi số', 'Đã xong', ''],
      [2, 'DI-0002', '16/BC-UBND', '', '', '', '', '', '12/03/2026', '15/03/2026', '', 'Báo cáo tình hình tiếp nhận hồ sơ quý 1', 'Báo cáo', 'Cải cách hành chính', 'UBND huyện', 'UBND xã', 'Chủ tịch UBND', 'Trung bình', 'Thường', '', 'Nguyễn Văn An', 'Bùi Thị Ngọc', 'Chờ ký', 'Hệ thống QLVB', '', 'Chờ lãnh đạo xem xét ký', 'QUÁ HẠN', '-3'],
      [3, 'DI-0003', '17/TB-UBND', '', '', '', '', '', '15/03/2026', '16/03/2026', '', 'Thông báo lịch kiểm tra công vụ các ấp', 'Thông báo', 'Nội vụ', 'Các thôn/ấp/khu phố', 'UBND xã', 'Phó Chủ tịch UBND', 'Trung bình', 'Thường', 'DEN-0002', 'Ngô Thị Hà', 'Đỗ Minh Khôi', 'Dự thảo', 'Zalo/nhóm công việc', '', 'Cần rà soát kỹ nội dung lịch kiểm tra', 'QUÁ HẠN', '-2']
    ];
    outgoingSheet.getRange(2, 1, outgoingData.length, outgoingData[0].length).setValues(outgoingData);
  }

  // 4. Dữ liệu Quản lý công việc
  const taskSheet = ss.getSheetByName('Quản lý công việc');
  if (taskSheet.getLastRow() <= 1) {
    const taskData = [
      [1, 'CV-0001', 'Theo văn bản đến', 'DEN-0001', '123/CV-UBND', 'Tham mưu báo cáo rà soát hiện trạng hạ tầng số...', 'Tham mưu báo cáo rà soát hiện trạng hạ tầng số...', 'Chuyển đổi số', 'Cao', 'Chủ tịch UBND', 'Văn phòng HĐND-UBND', 'Nguyễn Văn An', 'Nguyễn Văn An, Bùi Thị Ngọc', '03/03/2026', '20/03/2026', '', '60%', 'Đang xử lý', 'Báo cáo', '15/CV-UBND', 'Cần đẩy nhanh tiến độ', 'Đang xử lý', '', '', '', '', ''],
      [2, 'CV-0002', 'Theo văn bản đến', 'DEN-0002', '88/QĐ-UBND', 'Kiểm tra hồ sơ đất đai tồn đọng...', 'Kiểm tra hồ sơ đất đai tồn đọng...', 'Đất đai - xây dựng', 'Khẩn', 'Phó Chủ tịch UBND', 'Địa chính - Xây dựng', 'Bùi Thị Ngọc', 'Lê Minh Tuấn', '11/03/2026', '14/03/2026', '', '40%', 'Quá hạn', 'Báo cáo', '', 'Vướng mắc quy định đền bù', 'Quá hạn', '', '', '', '', ''],
      [3, 'CV-0003', 'Giao việc đột xuất', '', '', '', 'Chuẩn bị nội dung họp giao ban tuần', 'Tổng hợp', 'Trung bình', 'Chủ tịch UBND', 'Văn phòng HĐND-UBND', 'Đỗ Minh Khôi', 'Trần Thị Mai', '16/03/2026', '18/03/2026', '', '20%', 'Đã phân công', 'Biên bản', '', 'Chuẩn bị thêm máy chiếu', 'Đã phân công', '', '', '', '', ''],
      [4, 'CV-0004', 'Theo văn bản đến', 'DEN-0004', '12/HD-UBND', 'Lưu hồ sơ và theo dõi...', 'Lưu hồ sơ và theo dõi...', 'Chuyển đổi số', 'Thấp', 'Chủ tịch UBND', 'Văn phòng HĐND-UBND', 'Nguyễn Văn An', 'Nguyễn Văn An', '08/03/2026', '09/03/2026', '09/03/2026', '100%', 'Hoàn thành', 'Lưu theo dõi', '', 'Đã đưa vào kho lưu trữ', 'Hoàn thành', '', '', '', '', '']
    ];
    taskSheet.getRange(2, 1, taskData.length, taskData[0].length).setValues(taskData);
  }
  
  return "Database Setup Complete! Đã tạo bảng và đổ dữ liệu mẫu từ ảnh!";
}




// ==========================================
// ZALO MODULE: QUẢN LÝ GỬI THÔNG BÁO
// ==========================================

/**
 * Hàm lấy Số điện thoại của cán bộ từ tên
 */

function _handleZaloWebhook(data) {
  try {
    const senderId = data.sender.id;
    const textMsg = String(data.message.text).trim();
    
    // Cú pháp: "DK 0912345678"
    if (textMsg.toUpperCase().startsWith('DK ')) {
      const phoneParam = textMsg.substring(3).trim();
      let normalizedPhone = phoneParam.replace(/[^0-9]/g, '');
      
      const sheet = getDb().getSheetByName(SHEET_NAMES.STAFF);
      if (!sheet) return ContentService.createTextOutput("Sheet STAFF not found");
      
      const sheetData = sheet.getDataRange().getValues();
      const headers = sheetData[0];
      const phoneIdx = headers.indexOf('Số điện thoại');
      let zaloIdIdx = headers.indexOf('Zalo_ID');
      
      if (phoneIdx === -1) return ContentService.createTextOutput("Phone column not found");
      
      // Nếu chưa có cột Zalo_ID, tự động tạo
      if (zaloIdIdx === -1) {
        zaloIdIdx = headers.length;
        sheet.getRange(1, zaloIdIdx + 1).setValue('Zalo_ID');
      }
      
      let found = false;
      for (let i = 1; i < sheetData.length; i++) {
        let staffPhone = String(sheetData[i][phoneIdx] || '').replace(/[^0-9]/g, '');
        // So sánh 9 số cuối
        if (staffPhone && normalizedPhone && staffPhone.endsWith(normalizedPhone.substring(normalizedPhone.length > 9 ? normalizedPhone.length - 9 : 0))) {
          sheet.getRange(i + 1, zaloIdIdx + 1).setValue(senderId);
          found = true;
          break;
        }
      }
      
      if (found) {
        sendZaloOA_ByUserId(senderId, "✅ Đăng ký nhận thông báo QLVB thành công!");
      } else {
        sendZaloOA_ByUserId(senderId, "❌ Không tìm thấy cán bộ có Số điện thoại: " + phoneParam);
      }
    }
  } catch(e) {}
  
  return ContentService.createTextOutput("OK");
}

function sendZaloOA_ByUserId(userId, messageText) {
  if (!ZALO_CONFIG.ENABLE_ZALO || !ZALO_CONFIG.ACCESS_TOKEN) return;
  if (!userId) return;
  
  const payload = {
    "recipient": { "user_id": userId },
    "message": { "text": messageText }
  };
  
  const options = {
    "method": "POST",
    "headers": {
      "access_token": ZALO_CONFIG.ACCESS_TOKEN,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    const response = UrlFetchApp.fetch(ZALO_CONFIG.OA_ENDPOINT, options);
    Logger.log("Zalo OA UserID Response: " + response.getContentText());
  } catch (e) {
    Logger.log("Zalo OA UserID Error: " + e.toString());
  }
}

function _getStaffZaloInfo(fullName) {
  let result = { phone: null, zaloId: null };
  if (!fullName) return result;
  try {
    const sheet = getDb().getSheetByName(SHEET_NAMES.STAFF);
    if (!sheet) return result;
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    const nameIdx = headers.indexOf('Họ và tên');
    const phoneIdx = headers.indexOf('Số điện thoại');
    const zaloIdIdx = headers.indexOf('Zalo_ID'); 
    
    if (nameIdx === -1 || phoneIdx === -1) return result;
    
    for (let i = 1; i < sheetData.length; i++) {
      if (String(sheetData[i][nameIdx]).trim().toLowerCase() === String(fullName).trim().toLowerCase()) {
        result.phone = sheetData[i][phoneIdx] ? String(sheetData[i][phoneIdx]).trim() : null;
        if (zaloIdIdx !== -1) {
          result.zaloId = sheetData[i][zaloIdIdx] ? String(sheetData[i][zaloIdIdx]).trim() : null;
        }
        break;
      }
    }
  } catch(e) {}
  return result;
}

// Bỏ hàm _getStaffPhone cũ
/*
function _getStaffPhone(fullName) {
  if (!fullName) return null;
  try {
    const sheet = getDb().getSheetByName(SHEET_NAMES.STAFF);
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const nameIdx = headers.indexOf('Họ và tên');
    const phoneIdx = headers.indexOf('Số điện thoại');
    if (nameIdx === -1 || phoneIdx === -1) return null;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][nameIdx]).trim().toLowerCase() === String(fullName).trim().toLowerCase()) {
        const phone = data[i][phoneIdx];
        return phone ? String(phone).trim() : null;
      }
    }
  } catch(e) {}
  return null;
}

/**
 * Gửi tin nhắn ZNS (Zalo Notification Service)
 */
function sendZaloOA(phone, messageText) {
  if (!ZALO_CONFIG.ENABLE_ZALO || !ZALO_CONFIG.ACCESS_TOKEN) return;
  if (!phone) return;
  
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '84' + formattedPhone.substring(1);
  
  const payload = {
    "recipient": { "phone": formattedPhone },
    "message": { "text": messageText }
  };
  
  const options = {
    "method": "POST",
    "headers": {
      "access_token": ZALO_CONFIG.ACCESS_TOKEN,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    const response = UrlFetchApp.fetch(ZALO_CONFIG.OA_ENDPOINT, options);
    Logger.log("Zalo OA Response: " + response.getContentText());
  } catch (e) {
    Logger.log("Zalo OA Error: " + e.toString());
  }
}

function sendZaloZNS(phone, templateId, templateData) {
  if (!ZALO_CONFIG.ENABLE_ZALO || !ZALO_CONFIG.ACCESS_TOKEN) return;
  if (!phone) return;
  
  // Chuẩn hóa Số điện thoại (Chuyển 09... thành 849...)
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '84' + formattedPhone.substring(1);
  }
  
  const payload = {
    "phone": formattedPhone,
    "template_id": templateId,
    "template_data": templateData
  };
  
  const options = {
    "method": "POST",
    "headers": {
      "access_token": ZALO_CONFIG.ACCESS_TOKEN,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    const response = UrlFetchApp.fetch(ZALO_CONFIG.ZNS_ENDPOINT, options);
    Logger.log("Zalo ZNS Response: " + response.getContentText());
  } catch (e) {
    Logger.log("Zalo ZNS Error: " + e.toString());
  }
}

/**
 * Bắn thông báo khi giao việc mới
 */
function _notifyZaloOnNewTask(data) {
  if (!ZALO_CONFIG.ENABLE_ZALO) return;
  const zaloInfo = _getStaffZaloInfo(data.leadAssignee);
  const phone = zaloInfo.phone;
  const zaloId = zaloInfo.zaloId;
  if (!phone) return;
  
  const deadlineStr = _formatDateToVN(data.deadline) || "Không thời hạn";
  
  if (ZALO_CONFIG.MODE === 'OA') {
    const msg = `Có công việc mới được phân công:
- Việc: ${data.taskName}
- Hạn xử lý: ${deadlineStr}
Đề nghị đ/c ${data.leadAssignee} vào hệ thống kiểm tra và thực hiện.`;
    if (zaloId) { sendZaloOA_ByUserId(zaloId, msg); } else { sendZaloOA(phone, msg); }
  } else if (ZALO_CONFIG.MODE === 'ZNS' && ZALO_CONFIG.TEMPLATE_ID_NEW_TASK) {
    const templateData = {
      "assignee_name": data.leadAssignee,
      "task_content": data.taskName,
      "deadline": deadlineStr
    };
    sendZaloZNS(phone, ZALO_CONFIG.TEMPLATE_ID_NEW_TASK, templateData);
  }
}

/**
 * Hàm chạy định kỳ (Trigger hàng ngày lúc 8h sáng) để quét và nhắc Deadline
 */
function checkAndNotifyDeadlines() {
  if (!ZALO_CONFIG.ENABLE_ZALO) return;
  const sheet = getDb().getSheetByName(SHEET_NAMES.TASKS);
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  
  const headers = data[0];
  const statusIdx = headers.indexOf('Trạng thái công việc');
  const deadlineIdx = headers.indexOf('Hạn hoàn thành');
  const assigneeIdx = headers.indexOf('Cán bộ chủ trì');
  const taskNameIdx = headers.indexOf('Nội dung / Tên công việc');
  
  if ([statusIdx, deadlineIdx, assigneeIdx, taskNameIdx].includes(-1)) return;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusIdx];
    // Nếu chưa hoàn thành
    if (status !== 'Hoàn thành' && status !== 'Đã đóng') {
      const deadlineStr = data[i][deadlineIdx];
      if (deadlineStr) {
        // Chuyển chuỗi dd/mm/yyyy thành Date object để so sánh
        const parts = String(deadlineStr).split(' ')[0].split('/');
        if (parts.length === 3) {
          const deadlineDate = new Date(parts[2], parts[1] - 1, parts[0]);
          deadlineDate.setHours(0,0,0,0);
          
          const timeDiff = deadlineDate.getTime() - today.getTime();
          const daysDiff = timeDiff / (1000 * 3600 * 24);
          
          // Nhắc nếu hôm nay là hạn chót (0), hoặc sắp đến hạn (1 ngày), hoặc đã trễ hạn (< 0)
          if (daysDiff === 1 || daysDiff === 0 || daysDiff < 0) {
            const assignee = data[i][assigneeIdx];
            const zaloInfo = _getStaffZaloInfo(assignee);
  const phone = zaloInfo.phone;
  const zaloId = zaloInfo.zaloId;
            if (phone) {
              const statusText = daysDiff < 0 ? "ĐÃ TRỄ HẠN" : (daysDiff === 0 ? "HÔM NAY" : "SẮP ĐẾN HẠN");
              
              if (ZALO_CONFIG.MODE === 'OA') {
                const msg = `[CẢNH BÁO TIẾN ĐỘ]
Đ/c ${assignee} lưu ý: Công việc "${data[i][taskNameIdx]}"
- Tình trạng: ${statusText}
- Hạn xử lý: ${deadlineStr}
Đề nghị đ/c báo cáo tiến độ và xử lý gấp!`;
                if (zaloId) { sendZaloOA_ByUserId(zaloId, msg); } else { sendZaloOA(phone, msg); }
              } else if (ZALO_CONFIG.MODE === 'ZNS' && ZALO_CONFIG.TEMPLATE_ID_REMINDER) {
                const templateData = {
                  "assignee_name": assignee,
                  "task_content": data[i][taskNameIdx],
                  "status_text": statusText,
                  "deadline": deadlineStr
                };
                sendZaloZNS(phone, ZALO_CONFIG.TEMPLATE_ID_REMINDER, templateData);
              }
            }
          }
        }
      }
    }
  }
}
