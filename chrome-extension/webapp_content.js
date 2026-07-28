// webapp_content.js
// Chạy trên trang Web App (qlvb.io.vn) để làm cầu nối giao tiếp với Extension

document.addEventListener('DOMContentLoaded', () => {
    // Thêm một div ẩn để Web App nhận diện Extension đã cài đặt
    const marker = document.createElement('div');
    marker.id = 'qlvb-extension-installed';
    marker.style.display = 'none';
    (document.body || document.documentElement).appendChild(marker);
});

// Lắng nghe tín hiệu từ React Web App (qua window.postMessage)
window.addEventListener('message', (event) => {
    // Chỉ nhận tin nhắn từ cùng cửa sổ
    if (event.source !== window) return;

    if (event.data && event.data.type === 'QLVB_TRIGGER_SYNC') {
        // Chuyển tiếp lệnh sang Background Script của Extension
        chrome.runtime.sendMessage({ action: 'START_SYNC_FROM_WEBAPP', existingKeys: event.data.existingKeys || [] });
    }
});

// Lắng nghe tin nhắn từ Extension (background.js) và bắn vào DOM (Window) để React App nhận được
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SYNC_PROGRESS' || request.type === 'SYNC_COMPLETE' || request.type === 'SYNC_ERROR') {
        window.postMessage({
            type: request.type,
            message: request.message,
            percent: request.percent,
            logType: request.logType
        }, "*");
    }
    
    if (request.type === 'SYNC_DATA_PAYLOAD') {
        window.postMessage({
            type: 'SYNC_DOCS_BATCH',
            payload: request.data
        }, "*");
    }
});
