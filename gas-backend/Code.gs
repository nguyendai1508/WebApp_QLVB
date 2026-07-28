/**
 * QLVB - Document & Task Management App
 * Backend code for Google Apps Script
 */

const CONFIG = {
  FOLDER_NAME: 'QLVB_Uploads',
  SHEETS: {
    USERS: 'Users',
    STAFF: 'Staff',
    INCOMING_DOCS: 'Incoming_Docs',
    OUTGOING_DOCS: 'Outgoing_Docs',
    TASKS: 'Tasks',
    CATALOGS: 'Catalogs',
    AUDIT_LOG: 'Audit_Log'
  }
};

/**
 * Serves the React Application
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Hệ thống Quản lý Văn bản & Công việc')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Initialize the database structure (Run this once manually)
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const structures = {
    [CONFIG.SHEETS.USERS]: ['Username', 'Password', 'Linked_Staff_ID', 'Data_Scope', 'Role'],
    [CONFIG.SHEETS.STAFF]: ['Staff_ID', 'Full_Name', 'Avatar_URL', 'Notes', 'Assigned_Tasks'],
    [CONFIG.SHEETS.INCOMING_DOCS]: ['Doc_ID', 'Sign_Number', 'Draft_Date', 'Category', 'Urgency_Level', 'Deadline', 'Status', 'File_URL', 'Summary', 'Issuer', 'Assignee_ID'],
    [CONFIG.SHEETS.OUTGOING_DOCS]: ['Sign_Number', 'Draft_Date', 'Release_Date', 'Category', 'Status', 'File_URL', 'Summary', 'Signer', 'Deadline'],
    [CONFIG.SHEETS.TASKS]: ['Task_ID', 'Source', 'Linked_Doc_ID', 'Category', 'Priority', 'Assign_Date', 'Expected_Completion_Date', 'Actual_Completion_Date', 'Progress_Percentage', 'Assignee_ID', 'Status', 'Output_Result', 'File_URL', 'Content', 'Task_Master', 'Notes'],
    [CONFIG.SHEETS.CATALOGS]: ['Type', 'Value'],
    [CONFIG.SHEETS.AUDIT_LOG]: ['Timestamp', 'User', 'Action', 'Details']
  };

  for (const [sheetName, headers] of Object.entries(structures)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Set headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e0e0e0');
    }
  }

  // Create default Admin User if not exists
  const userSheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  if (userSheet.getLastRow() === 1) {
    userSheet.appendRow(['admin', 'admin123', '', 'Toàn quyền', 'Admin']);
  }

  // Ensure Upload folder exists
  getOrCreateUploadFolder();

  return 'Database setup completed successfully!';
}

/**
 * Master dispatcher for all client requests
 */
function handleRequest(action, payload) {
  try {
    const user = Session.getActiveUser().getEmail(); // Or pass from client based on login
    
    switch (action) {
      case 'LOGIN':
        return loginUser(payload.username, payload.password);
      case 'GET_INITIAL_DATA':
        return getInitialData(payload.userId, payload.dataScope, payload.linkedStaffId);
      // ... Add other CRUD operations here
      default:
        throw new Error('Unknown action: ' + action);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function loginUser(username, password) {
  const data = getSheetData(CONFIG.SHEETS.USERS);
  const user = data.find(u => u.Username === username && u.Password === password);
  
  if (user) {
    // DO NOT SEND PASSWORD BACK TO CLIENT
    delete user.Password;
    return { success: true, user: user };
  }
  return { success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' };
}

function getInitialData(userId, dataScope, linkedStaffId) {
  const catalogs = getSheetData(CONFIG.SHEETS.CATALOGS);
  const staff = getSheetData(CONFIG.SHEETS.STAFF);
  
  let incomingDocs = getSheetData(CONFIG.SHEETS.INCOMING_DOCS);
  let outgoingDocs = getSheetData(CONFIG.SHEETS.OUTGOING_DOCS);
  let tasks = getSheetData(CONFIG.SHEETS.TASKS);

  // Row-level Security Enforcement
  if (dataScope === 'Cá nhân') {
    incomingDocs = incomingDocs.filter(doc => doc.Assignee_ID === linkedStaffId);
    tasks = tasks.filter(task => task.Assignee_ID === linkedStaffId);
  }

  return {
    success: true,
    data: {
      catalogs,
      staff,
      incomingDocs,
      outgoingDocs,
      tasks
    }
  };
}

/**
 * Utility: Get data as Array of Objects
 */
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * File Upload Logic
 */
function uploadFileToDrive(base64Data, filename, mimeType) {
  try {
    const folder = getOrCreateUploadFolder();
    
    // Remove base64 header if present
    const data = base64Data.split(',')[1] || base64Data;
    const blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, filename);
    
    const file = folder.createFile(blob);
    return { success: true, url: file.getUrl(), fileId: file.getId() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getOrCreateUploadFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(CONFIG.FOLDER_NAME);
  }
}
