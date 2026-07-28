// background.js

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwh8G4ZN-ye5vey26m2JuTus93L63pfMFCoUoyX18kMRnPU6rZbuQCoSYuayFSFTYnl/exec";
const DEFAULT_CONCURRENCY = 4;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_SYNC_FROM_WEBAPP') {
        // Tìm tab VNPT Đồng Nai
        chrome.tabs.query({ url: "*://*.dongnai.gov.vn/*" }, (tabs) => {
            if (tabs.length > 0) {
                // Focus vào tab đó
                const tab = tabs[0];
                chrome.windows.update(tab.windowId, { focused: true });
                chrome.tabs.update(tab.id, { active: true });
                
                // Gửi lệnh bắt đầu cào dữ liệu cho content.js
                chrome.tabs.sendMessage(tab.id, { 
                    action: "START_SCRAPE", 
                    apiUrl: DEFAULT_API_URL, 
                    concurrency: DEFAULT_CONCURRENCY 
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        broadcastProgress('SYNC_ERROR', "Lỗi kết nối tới tab VNPT. Vui lòng tải lại trang VNPT!");
                        return;
                    }
                    if (response && response.success) {
                        broadcastProgress('SYNC_COMPLETE', `✅ XONG! Thêm mới: ${response.created}, Bỏ qua: ${response.skipped}`);
                    } else {
                        broadcastProgress('SYNC_ERROR', "❌ Lỗi: " + (response ? response.error : "Không xác định"));
                    }
                });
            } else {
                // Không tìm thấy tab VNPT, mở tab mới và thông báo
                chrome.tabs.create({ url: "https://dnis.dongnai.gov.vn/" }, () => {
                    broadcastProgress('SYNC_ERROR', 'Vui lòng đăng nhập VNPT Đồng Nai, sau đó bấm Đồng bộ lại!');
                });
            }
        });
    }

    // Nhận thông điệp tiến trình từ content.js (trang VNPT) và chuyển tiếp tới Web App
    if (request.action === 'REPORT_PROGRESS') {
        broadcastProgress('SYNC_PROGRESS', request.message, request.percent, request.logType);
    }
});

// Hàm gửi tin nhắn tiến trình tới tất cả các tab Web App đang mở
function broadcastProgress(type, message, percent = 0, logType = 'info') {
    chrome.tabs.query({ url: ["*://qlvb.io.vn/*", "*://qlvbpr.io.vn/*", "*://localhost/*", "*://script.google.com/*"] }, (tabs) => {
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { 
                type: type, 
                message: message,
                percent: percent,
                logType: logType
            });
        }
    });
}
