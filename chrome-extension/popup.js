document.addEventListener('DOMContentLoaded', () => {
    // Tự động load URL API và cài đặt luồng từ storage
    chrome.storage.local.get(['googleApiUrl', 'concurrencySetting'], function(result) {
        if (result.googleApiUrl) {
            document.getElementById('apiUrl').value = result.googleApiUrl;
        }
        if (result.concurrencySetting) {
            document.getElementById('concurrency').value = result.concurrencySetting;
        }
    });

    // Tính năng Dán (Paste) URL nhanh
    document.getElementById('pasteBtn').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                document.getElementById('apiUrl').value = text.trim();
            }
        } catch (err) {
            alert('Không thể truy cập Clipboard. Vui lòng bấm Ctrl+V để dán.');
        }
    });

    document.getElementById('syncBtn').addEventListener('click', async () => {
        const apiUrl = document.getElementById('apiUrl').value.trim();
        const statusEl = document.getElementById('status');
        const btn = document.getElementById('syncBtn');

        if (!apiUrl) {
            statusEl.textContent = "Vui lòng nhập Google Web App URL!";
            statusEl.className = "error";
            return;
        }

        // Đọc cấu hình
        let concurrency = parseInt(document.getElementById('concurrency').value, 10);
        if (isNaN(concurrency) || concurrency < 1) concurrency = 1;
        if (concurrency > 6) concurrency = 6;

        // Lưu lại URL và cấu hình
        chrome.storage.local.set({ googleApiUrl: apiUrl, concurrencySetting: concurrency });

        statusEl.textContent = "Đang kiểm tra trang...";
        statusEl.className = "info";
        btn.disabled = true;

        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes("qlvb-snnmt.dongnai.gov.vn")) {
                statusEl.textContent = "Bạn phải mở trang web QLVB Đồng Nai để Đồng bộ!";
                statusEl.className = "error";
                btn.disabled = false;
                return;
            }

            statusEl.textContent = "1. Đang tiêm mã xử lý vào trang...";

            // Bước 1: Chủ động tiêm (Inject) content script vào trang web
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (injectErr) {
                statusEl.textContent = "Lỗi Inject Script: " + injectErr.message;
                statusEl.className = "error";
                btn.disabled = false;
                return;
            }

            statusEl.textContent = "2. Đang đọc bảng và tải File (có thể mất 1-2 phút)...";

            // Bước 2: Bắn lệnh yêu cầu cào dữ liệu
            chrome.tabs.sendMessage(tab.id, { action: "START_SCRAPE", apiUrl: apiUrl, concurrency: concurrency }, (response) => {
                if (chrome.runtime.lastError) {
                    statusEl.textContent = "Lỗi giao tiếp: " + chrome.runtime.lastError.message;
                    statusEl.className = "error";
                    btn.disabled = false;
                    return;
                }

                if (response && response.success) {
                    statusEl.textContent = `✅ XONG! Đã gửi ${response.count} văn bản. Thêm mới: ${response.created}, Bỏ qua: ${response.skipped}`;
                    statusEl.className = "success";
                } else {
                    statusEl.textContent = "❌ Lỗi khi xử lý: " + (response ? response.error : "Không có phản hồi");
                    statusEl.className = "error";
                }
                btn.disabled = false;
            });

        } catch (e) {
            statusEl.textContent = "Lỗi hệ thống: " + e.message;
            statusEl.className = "error";
            btn.disabled = false;
        }
    });
});
