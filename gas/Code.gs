/**
 * WEBHOOK LƯU TRỮ FILE - GOOGLE DRIVE
 * Sử dụng làm Microservice cho hệ thống QLVB Firebase
 */

const FOLDER_NAME = 'QLVB_Attachments';

// ==========================================
// CẤU HÌNH ZALO NOTIFICATION (ZNS / OA)
// (Chuyển tính năng Zalo từ Sheet sang đây để tận dụng Webhook)
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

function setupFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  return folder.getId();
}

function getFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

// Hỗ trợ CORS cho API
function setCORS(response) {
  return response
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Xử lý Preflight request
function doOptions(e) {
  return setCORS(ContentService.createTextOutput("OK"));
}

function doGet(e) {
  return setCORS(ContentService.createTextOutput(JSON.stringify({ status: "Webhook is running" })).setMimeType(ContentService.MimeType.JSON));
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    // 1. CHỨC NĂNG UPLOAD FILE LÊN GOOGLE DRIVE
    if (action === 'upload_file') {
      const fileName = postData.fileName;
      const mimeType = postData.mimeType;
      const fileData = postData.fileData; // base64 string

      const folder = getFolder();
      const decodedData = Utilities.base64Decode(fileData);
      const blob = Utilities.newBlob(decodedData, mimeType, fileName);
      const file = folder.createFile(blob);
      
      const fileUrl = file.getUrl();
      
      return setCORS(ContentService.createTextOutput(JSON.stringify({
        success: true,
        url: fileUrl,
        id: file.getId()
      })).setMimeType(ContentService.MimeType.JSON));
    }
    
    // 2. CHỨC NĂNG GỬI ZALO (WEBHOOK TỪ FIREBASE)
    if (action === 'send_zalo') {
      const phone = postData.phone;
      const message = postData.message;
      const type = postData.type || 'task'; // task, reminder
      
      if (!ZALO_CONFIG.ENABLE_ZALO) {
        return setCORS(ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Zalo is disabled' })).setMimeType(ContentService.MimeType.JSON));
      }
      
      // ... logic gửi Zalo tương tự bản cũ
      let result = null;
      if (ZALO_CONFIG.MODE === 'ZNS') {
         // Logic ZNS...
      } else {
         const payload = {
           recipient: { user_id: phone }, // Trong OA mode phone thường là user_id
           message: { text: message }
         };
         
         const options = {
            method: 'post',
            contentType: 'application/json',
            headers: { 'access_token': ZALO_CONFIG.ACCESS_TOKEN },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
         };
         
         const response = UrlFetchApp.fetch(ZALO_CONFIG.OA_ENDPOINT, options);
         result = JSON.parse(response.getContentText());
      }
      
      return setCORS(ContentService.createTextOutput(JSON.stringify({
        success: true,
        result: result
      })).setMimeType(ContentService.MimeType.JSON));
    }

    return setCORS(ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON));

  } catch (error) {
    return setCORS(ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON));
  }
}
