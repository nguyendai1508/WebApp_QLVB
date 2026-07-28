// webapp_content.js
// Chạy trên trang Web App (qlvb.io.vn) để làm cầu nối giao tiếp với Extension

// Cắm cờ hiệu vào DOM để React Web App biết Extension đã được cài đặt
const marker = document.createElement('div');
marker.id = 'qlvb-extension-installed';
marker.style.display = 'none';
document.body.appendChild(marker);

// Lắng nghe tín hiệu từ React Web App (qua window.postMessage)
window.addEventListener('message', (event) => {
    // Chỉ nhận tin nhắn từ cùng cửa sổ
    if (event.source !== window) return;

    if (event.data && event.data.type === 'QLVB_TRIGGER_SYNC') {
        // Chuyển tiếp lệnh sang Background Script của Extension
        chrome.runtime.sendMessage({ action: 'START_SYNC_FROM_WEBAPP' });
    }
});

// Lắng nghe tín hiệu tiến trình từ Background Script và đẩy xuống React Web App
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SYNC_PROGRESS' || request.type === 'SYNC_COMPLETE' || request.type === 'SYNC_ERROR') {
        window.postMessage(request, '*');
    }
});
