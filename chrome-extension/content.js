if (!window.qlvbContentScriptInjected) {
    window.qlvbContentScriptInjected = true;

// ==============================
// UI OVERLAY (Giao diện hiển thị trên trang)
// ==============================
function createOverlay() {
    if (document.getElementById("qlvb-sync-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "qlvb-sync-overlay";
    overlay.innerHTML = `
        <style>
            #qlvb-sync-overlay { position: fixed; bottom: 20px; right: 20px; width: 420px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid #0f3460; border-radius: 16px; color: #e0e0e0; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; z-index: 999999; box-shadow: 0 8px 32px rgba(0,0,0,0.5); overflow: hidden; }
            #qlvb-sync-header { background: linear-gradient(90deg, #0f3460, #533483); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
            #qlvb-sync-header h3 { margin: 0; font-size: 14px; color: #fff; display: flex; align-items: center; gap: 8px; }
            #qlvb-sync-status { padding: 10px 16px; font-size: 12px; color: #a0aec0; border-bottom: 1px solid #0f3460; line-height: 1.5; }
            #qlvb-sync-progress-bar { height: 4px; background: #1a1a2e; }
            #qlvb-sync-progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #00b4d8, #48cae4); transition: width 0.3s ease; border-radius: 2px; }
            #qlvb-sync-log { max-height: 250px; overflow-y: auto; padding: 8px 0; }
            .qlvb-log-item { padding: 5px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; line-height: 1.4; }
            .qlvb-log-item.success { color: #48cae4; }
            .qlvb-log-item.error { color: #e94560; }
            .qlvb-log-item.info { color: #a0aec0; }
            #qlvb-sync-close { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 18px; }
        </style>
        <div id="qlvb-sync-header">
            <h3>⚡ QLVB Sync -> Google Sheets</h3>
            <button id="qlvb-sync-close">✕</button>
        </div>
        <div id="qlvb-sync-status">Đang khởi tạo...</div>
        <div id="qlvb-sync-progress-bar"><div id="qlvb-sync-progress-fill"></div></div>
        <div id="qlvb-sync-log"></div>
    `;
    (document.body || document.documentElement).appendChild(overlay);
    document.getElementById("qlvb-sync-close").addEventListener("click", () => overlay.style.display = "none");
}

function updateStatus(text) { 
    const el = document.getElementById("qlvb-sync-status"); 
    if (el) el.innerHTML = text; 
    try { chrome.runtime.sendMessage({ action: 'REPORT_PROGRESS', message: text, logType: 'status' }); } catch(e){}
}
function updateProgress(pct) { 
    const f = document.getElementById("qlvb-sync-progress-fill"); 
    if (f) f.style.width = `${pct}%`; 
    try { chrome.runtime.sendMessage({ action: 'REPORT_PROGRESS', percent: pct, logType: 'progress' }); } catch(e){}
}
function addLog(text, type = "info") {
    const log = document.getElementById("qlvb-sync-log");
    if (!log) return;
    const item = document.createElement("div");
    item.className = `qlvb-log-item ${type}`;
    item.innerHTML = text;
    log.insertBefore(item, log.firstChild);
    while (log.children.length > 50) log.removeChild(log.lastChild);
    try { chrome.runtime.sendMessage({ action: 'REPORT_PROGRESS', message: text, logType: 'log' }); } catch(e){}
}

// Hàm tải file từ link trực tiếp trên trang để lấy dạng base64
async function fetchFileAsBase64(url) {
    try {
        const response = await fetch(url, { credentials: "include", redirect: "follow" });
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

// Hàm gửi yêu cầu lấy link file thực sự tới background (bypass CSP)
function getFilesForDoc(doc_id) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
            action: 'EVAL_IN_MAIN_WORLD', 
            doc_id: doc_id,
            scriptType: 'getFiles'
        }, (response) => {
            resolve(response || []);
        });
        
        // Bắt lỗi timeout an toàn (đề phòng extension hỏng)
        setTimeout(() => resolve([]), 5000);
    });
}

// Hàm gửi yêu cầu lấy danh sách đồng xử lý tới background (bypass CSP)
function getCoAssigneesForDoc(doc_id) {
    return new Promise((resolve) => {


// Bóc tách bảng dữ liệu theo cấu trúc VNPT Đồng Nai
function scrapeCurrentPage() {
    const tables = Array.from(document.querySelectorAll('table'));
    const table = tables.find(t => t.innerText.includes('Trích yếu') && t.innerText.includes('Số đến'));
    
    if (!table) {
        throw new Error("Không tìm thấy bảng dữ liệu văn bản. Vui lòng kiểm tra lại trang.");
    }
    
    const rows = table.querySelectorAll("tr");
    const results = [];

    // Bắt đầu từ 1 vì row 0 là header
    for (let i = 1; i < rows.length; i++) {
        const tr = rows[i]; 
        const tds = tr.querySelectorAll("td");
        if (tds.length < 25) continue; // Bảng mới có khoảng 29 cột

        // Các chỉ số cột dựa theo phân tích thực tế:
        const soDen = tds[6]?.innerText.trim() || "";
        const soHieu = tds[7]?.innerText.trim() || "";
        const trichYeu = (tds[8]?.innerText || tds[5]?.innerText || "").trim().split('\\n')[0].trim();
        
        let ngayVanBanText = tds[9]?.innerText.trim() || "";
        let ngayDenText = tds[10]?.innerText.trim() || "";
        
        const coQuanBanHanh = tds[14]?.innerText.trim() || "";
        const xlc = tds[18]?.innerText.trim() || ""; // Xử lý chính
        const doKhan = tds[19]?.innerText.trim() || "";
        const loaiVanBan = tds[20]?.innerText.trim() || "";
        
        // Lấy DOC_ID từ cột Files (cột 22)
        let doc_id = '';
        const filesHtml = tds[22]?.innerHTML || "";
        const match = filesHtml.match(/allFileDownload\((\d+)\)/);
        if (match) doc_id = match[1];

        // Format ngày tháng chuẩn YYYY-MM-DDTHH:mm:ss
        let ngayDen = "";
        const dp = ngayDenText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dp) ngayDen = `${dp[3]}-${dp[2]}-${dp[1]}T00:00:00`;
        
        let ngayVanBan = "";
        const dp2 = ngayVanBanText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dp2) ngayVanBan = `${dp2[3]}-${dp2[2]}-${dp2[1]}`;

        if (!soDen && !trichYeu) continue; // Dòng trống

        results.push({
            payload: {
                soHieu, soDen, trichYeu, ngayDen, loaiVanBan, coQuanBanHanh,
                nguoiSoan: xlc, doKhan, ngayVanBan
            },
            doc_id: doc_id
        });
    }
    return results;
}

// Hàm chạy song song cực hạn (Concurrency Pool)
async function processWithConcurrency(items, limit, asyncFn) {
    const results = [];
    const executing = [];
    for (const item of items) {
        const p = Promise.resolve().then(() => asyncFn(item));
        results.push(p);
        if (limit <= items.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
}

// Hàm thực thi Cào và Đồng bộ
async function startScraping(apiUrl, concurrency = 4, existingKeys = [], sendResponseCallback = null) {
    try {
        createOverlay();
        updateStatus("Bắt đầu quét danh sách...");
        updateProgress(10);
        addLog("🔍 Đang đọc HTML bảng dữ liệu hiện tại...", "info");

        // 1. Quét DOM
        let items = [];
        try {
            items = scrapeCurrentPage();
        } catch (e) {
            addLog("❌ Lỗi quét DOM: " + e.message, "error");
            if (sendResponseCallback) sendResponseCallback({ success: false, error: e.message });
            sessionStorage.removeItem('QLVB_AUTO_CRAWL');
            return;
        }
        
        if (items.length === 0) {
            addLog("❌ Lỗi: Không trích xuất được dòng văn bản nào.", "error");
            if (sendResponseCallback) sendResponseCallback({ success: false, error: "Không có dữ liệu." });
            sessionStorage.removeItem('QLVB_AUTO_CRAWL');
            return;
        }

        // ---------- KIỂM TRA TRÙNG LẶP DỰA TRÊN DỮ LIỆU TỪ WEB APP -----------
        updateStatus("Đang đối chiếu dữ liệu...");
        addLog(`🔍 Kiểm tra trùng lặp ${items.length} văn bản...`, "info");
        
        let rawDocs = items.map(item => ({ ...item.payload }));
        let skipCount = 0;
        
        if (existingKeys && existingKeys.length > 0) {
            const keysSet = new Set(existingKeys);
            const originalLength = items.length;
            
            // Lọc lại mảng items CHỈ GIỮ LẠI NHỮNG VĂN BẢN MỚI
            items = items.filter(item => {
                const d = item.payload;
                const docKey = `${(d.soHieu || d.soDen || '').trim()}|${(d.trichYeu || '').trim()}`;
                return !keysSet.has(docKey);
            });
            skipCount = originalLength - items.length;
        }
        
        let docsPayload = [];
        let successCount = 0;

        if (items.length === 0) {
            addLog(`⏭️ Toàn bộ ${rawDocs.length} văn bản ĐÃ TỒN TẠI. Bỏ qua tải File.`, "success");
            updateProgress(90);
        } else {
            if (skipCount > 0) {
                addLog(`✅ Bỏ qua ${skipCount} văn bản cũ. Bắt đầu tải File cho ${items.length} văn bản mới...`, "success");
            } else {
                addLog(`✅ Tìm thấy ${items.length} văn bản mới. Bắt đầu tải File...`, "success");
            }
            
            updateStatus(`Đang tải File đính kèm (An toàn)...`);
                addLog(`✅ Tìm thấy ${items.length} văn bản mới. Bắt đầu tải File...`, "success");
            }
            
            updateStatus(`Đang tải File đính kèm (An toàn)...`);
            updateProgress(20);

            // Khởi tạo mảng docsPayload
            docsPayload = items.map(item => ({ ...item.payload, files: [] }));
            
            // Gom tất cả các tác vụ tải file và lấy thông tin Đồng xử lý
            const allFileTasks = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].doc_id) {
                    addLog(`Đang tìm link ẩn và Đồng xử lý cho văn bản ${items[i].payload.soDen}...`, "info");
                    
                    // Lấy files
                    const fileUrls = await getFilesForDoc(items[i].doc_id);
                    for (const f of fileUrls) {
                        allFileTasks.push({ itemIndex: i, f: f });
                    }
                    
                    // Lấy Đồng xử lý
                    const coAssignees = await getCoAssigneesForDoc(items[i].doc_id);
                    if (coAssignees && coAssignees.length > 0) {
                        docsPayload[i].coAssignee = coAssignees.join(', ');
                        addLog(`👥 Đã tìm thấy ${coAssignees.length} Đồng xử lý.`, "success");
                    }
                }
            }

            let filesDone = 0;
            
            // TẢI FILE: Giới hạn 3 luồng
            await processWithConcurrency(allFileTasks, 3, async (task) => {
                addLog(`📥 Đang tải: ${task.f.fileName}...`, "info");
                let b64 = await fetchFileAsBase64(task.f.href);
                
                // Retry
                if (!b64) {
                    addLog(`⏳ Đang thử tải lại: ${task.f.fileName}...`, "info");
                    await new Promise(r => setTimeout(r, 1000));
                    b64 = await fetchFileAsBase64(task.f.href);
                }

                if (b64) {
                    docsPayload[task.itemIndex].files.push({
                        fileName: task.f.fileName,
                        base64Content: b64
                    });
                } else {
                    addLog(`❌ Tải thất bại (Lỗi mạng từ Sở): ${task.f.fileName}`, "error");
                }
                filesDone++;
                updateProgress(20 + Math.round((filesDone / allFileTasks.length) * 60));
            });

            updateStatus("Đang đẩy dữ liệu lên Google Sheets...");
            updateProgress(85);
            addLog(`🚀 Bắt đầu gửi ${docsPayload.length} văn bản...`, "info");

            // 3. GỬI POST LÊN GOOGLE APPS SCRIPT (KIẾN TRÚC GỘP NHÓM ĐA LUỒNG - CONCURRENT BATCHING)
            const BATCH_SIZE = 5;
            let docsSent = 0;

            // Tạo danh sách các gói hàng (Batches)
            const batches = [];
            for (let i = 0; i < docsPayload.length; i += BATCH_SIZE) {
                batches.push({
                    startIndex: i,
                    docs: docsPayload.slice(i, i + BATCH_SIZE)
                });
            }

            // Gửi các gói hàng cùng một lúc lên Google (Dựa vào số luồng tùy chỉnh)
            await processWithConcurrency(batches, concurrency, async (batch) => {
                const i = batch.startIndex;
                const batchDocs = batch.docs;
                addLog(`📤 Đang gửi nhóm văn bản thứ ${i + 1} đến ${i + batchDocs.length}...`, "info");
                
                try {
                    let apiResponse = null;
                    
                    // CƠ CHẾ TỰ ĐỘNG THỬ LẠI (RETRY) 3 LẦN TRÁNH RỚT MẠNG
                    for (let retry = 0; retry < 3; retry++) {
                        try {
                            apiResponse = await new Promise((resolve, reject) => {
                                chrome.runtime.sendMessage({ action: 'SYNC_DATA', data: batchDocs }, (response) => {
                                    if (chrome.runtime.lastError) {
                                        reject(new Error(chrome.runtime.lastError.message));
                                    } else {
                                        resolve(response);
                                    }
                                });
                            });
                            break; // Thành công thì thoát vòng lặp Retry
                        } catch (fetchErr) {
                            if (retry < 2) {
                                addLog(`⏳ Máy chủ bận, đang thử gửi lại nhóm ${i + 1}... lần ${retry + 1}`, "info");
                                await new Promise(r => setTimeout(r, 4000));
                            } else {
                                throw fetchErr;
                            }
                        }
                    }

                    if (apiResponse && apiResponse.success) {
                        successCount += batchDocs.length;
                        addLog(`✅ Nhóm ${i + 1} đến ${i + batchDocs.length} xử lý xong (Đã chuyển Web App)!`, "success");
                    } else {
                        addLog(`❌ Gửi Web App thất bại`, "error");
                    }
                } catch (netErr) {
                    addLog(`❌ Lỗi mạng khi gửi nhóm ${i + 1}: ${netErr.message}`, "error");
                }
                
                docsSent += batchDocs.length;
                updateProgress(85 + Math.round((docsSent / docsPayload.length) * 15));
            });
        addLog(`✅ Xong trang hiện tại: Thêm mới ${successCount} VB. Bỏ qua ${skipCount} VB cũ.`, "success");

        // ==========================================
        // TỰ ĐỘNG CHUYỂN TRANG (AUTO-PAGINATION) CHỐNG LẶP VÔ HẠN
        // ==========================================
        const nextIcon = document.querySelector('.pagination .fa-forward');
        const nextBtn = nextIcon ? nextIcon.closest('a') : null;
        
        const isNextBtnValid = nextBtn && !nextBtn.hasAttribute('disabled') && !nextBtn.className.includes('disabled') && !nextBtn.parentElement.className.includes('disabled');

        if (isNextBtnValid) {
            updateStatus("Phát hiện có trang tiếp theo! Đang chuẩn bị chuyển trang...");
            addLog(`👉 Chuẩn bị lật sang trang tiếp theo sau 2 giây...`, "info");
            
            // Lấy mẫu HTML của bảng dữ liệu hiện tại để so sánh. Tránh trường hợp bấm nút Next nhưng trang không thèm load (Lặp vô hạn).
            const mainTable = document.querySelector('.table-hover, table[id*="DataList"], table');
            const currentTableHTML = mainTable ? mainTable.innerHTML : "";
            
            setTimeout(() => {
                nextBtn.click();
                
                // Đề phòng trường hợp trang dùng AJAX UpdatePanel (không tải lại toàn bộ trang)
                let checkCount = 0;
                
                // Hàm Polling: Kiểm tra liên tục xem bảng dữ liệu đã thay đổi (Load xong) chưa
                function checkTableChanged() {
                    const newTable = document.querySelector('.table-hover, table[id*="DataList"], table');
                    const newTableHTML = newTable ? newTable.innerHTML : "";
                    
                    if (newTableHTML !== currentTableHTML && currentTableHTML !== "") {
                        // Bảng đã thay đổi -> Lật trang thành công -> Lập tức chạy tiếp
                        startScraping(apiUrl, concurrency);
                    } else {
                        checkCount++;
                        if (checkCount < 20) {
                            // Dữ liệu chưa đổi (Có thể mạng đang chậm và đang hiện chữ "Vui lòng đợi"). Tiếp tục chờ thêm 1 giây.
                            window._ajaxCrawlTimeout = setTimeout(checkTableChanged, 1000);
                        } else {
                            // Chờ 20 giây rồi mà không có gì thay đổi -> Nút Click không có tác dụng -> Đã ở trang cuối.
                            addLog(`🏁 Đã click Trang Sau nhưng sau 20s dữ liệu không đổi (có thể đã ở trang cuối). Ngăn chặn lặp vô hạn.`, "success");
                            sessionStorage.removeItem('QLVB_AUTO_CRAWL');
                            sessionStorage.removeItem('QLVB_CONCURRENCY');
                            updateProgress(100);
                            updateStatus(`🎉 HOÀN TẤT! Đã đồng bộ toàn bộ các trang.`);
                        }
                    }
                }
                
                // Bắt đầu vòng lặp kiểm tra sau khi click 1 giây
                window._ajaxCrawlTimeout = setTimeout(checkTableChanged, 1000);
                
                // Nếu trang là Full Reload (tải lại toàn bộ), sự kiện này sẽ ngắt timeout AJAX ở trên
                window.addEventListener("beforeunload", () => {
                    clearTimeout(window._ajaxCrawlTimeout);
                });
            }, 2000);
        } else {
            // Không còn trang nào nữa (Hoặc trang cuối cùng)
            sessionStorage.removeItem('QLVB_AUTO_CRAWL');
            sessionStorage.removeItem('QLVB_CONCURRENCY');
            updateProgress(100);
            updateStatus(`🎉 HOÀN TẤT TOÀN BỘ CÁC TRANG! Đã đẩy xong.`);
            addLog(`🏁 Không tìm thấy trang tiếp theo (đã đến trang cuối). Dừng tiến trình.`, "success");
            
            if (sendResponseCallback) {
                sendResponseCallback({ 
                    success: true, 
                    count: docsPayload.length,
                    created: successCount,
                    skipped: skipCount
                });
            }
        }

    } catch (err) {
        sessionStorage.removeItem('QLVB_AUTO_CRAWL');
        sessionStorage.removeItem('QLVB_CONCURRENCY');
        updateStatus(`❌ Lỗi hệ thống`);
        addLog(`❌ Exception: ${err.toString()}`, "error");
        if (sendResponseCallback) sendResponseCallback({ success: false, error: err.toString() });
    }
}

// Lắng nghe lệnh từ popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_SCRAPE") {
        const concurrency = request.concurrency || 4;
        const apiUrl = request.apiUrl;
        const existingKeys = request.existingKeys || [];
        
        // Kích hoạt cờ Quét tự động
        sessionStorage.setItem('QLVB_AUTO_CRAWL', 'true');
        sessionStorage.setItem('QLVB_API_URL', apiUrl);
        sessionStorage.setItem('QLVB_CONCURRENCY', concurrency.toString());
        sessionStorage.setItem('QLVB_EXISTING_KEYS', JSON.stringify(existingKeys));
        
        startScraping(apiUrl, concurrency, existingKeys, sendResponse);
        return true; // Keep message channel open for async
    }
});

// TỰ ĐỘNG KHỞI CHẠY (NẾU TRANG VỪA BỊ FULL RELOAD DO CHUYỂN TRANG)
window.addEventListener('load', () => {
    if (sessionStorage.getItem('QLVB_AUTO_CRAWL') === 'true') {
        const apiUrl = sessionStorage.getItem('QLVB_API_URL') || "https://script.google.com/macros/s/AKfycbwh8G4ZN-ye5vey26m2JuTus93L63pfMFCoUoyX18kMRnPU6rZbuQCoSYuayFSFTYnl/exec";
        const concurrency = parseInt(sessionStorage.getItem('QLVB_CONCURRENCY')) || 4;
        let existingKeys = [];
        try {
            existingKeys = JSON.parse(sessionStorage.getItem('QLVB_EXISTING_KEYS') || '[]');
        } catch (e) {}
        
        // Cần chút thời gian cho trang load xong hẳn
        setTimeout(() => {
            startScraping(apiUrl, concurrency, existingKeys);
        }, 1500);
    }
});

// ==========================================
// TẠO NÚT ĐỒNG BỘ NỔI TRÊN TRANG VNPT
// ==========================================
function injectFloatingButton() {
    console.log("[QLVB Sync] Đang thử tạo nút nổi...");
    // Tránh tạo nhiều lần
    if (document.getElementById('qlvb-floating-sync-btn')) {
        console.log("[QLVB Sync] Nút đã tồn tại.");
        return;
    }

    const container = document.body || document.documentElement;
    if (!container) {
        console.log("[QLVB Sync] Không tìm thấy Body/HTML để chèn nút.");
        return;
    }

    const btn = document.createElement('button');
    btn.id = 'qlvb-floating-sync-btn';
    btn.innerHTML = '🚀 Đồng bộ về Web App QLVB';
    
    // CSS cho nút nổi
    btn.style.cssText = `
        position: fixed !important;
        bottom: 30px !important;
        right: 30px !important;
        z-index: 2147483647 !important;
        background-color: #3b82f6 !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 50px !important;
        padding: 15px 25px !important;
        font-size: 16px !important;
        font-weight: bold !important;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4) !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
    `;

    btn.onmouseover = () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.backgroundColor = '#2563eb';
    };
    btn.onmouseout = () => {
        btn.style.transform = 'scale(1)';
        btn.style.backgroundColor = '#3b82f6';
    };

    btn.onclick = () => {
        console.log("[QLVB Sync] Bắt đầu đồng bộ từ nút nổi!");
        // Gửi lệnh quét ngay lập tức
        sessionStorage.setItem('QLVB_AUTO_CRAWL', 'true');
        sessionStorage.setItem('QLVB_API_URL', 'none');
        sessionStorage.setItem('QLVB_CONCURRENCY', '4');
        startScraping('none', 4);
    };

    container.appendChild(btn);
    console.log("[QLVB Sync] Đã chèn nút nổi thành công vào", container.tagName);
}

// Quản lý trạng thái hiển thị của nút nổi liên tục
setInterval(() => {
    // 1. Kiểm tra bảng văn bản có tồn tại không
    const tables = Array.from(document.querySelectorAll('table'));
    const isValidPage = tables.some(t => t.innerText.includes('Trích yếu') && t.innerText.includes('Số đến'));
    
    // 2. Kiểm tra Overlay có đang mở không
    const overlay = document.getElementById('qlvb-sync-overlay');
    const isOverlayOpen = overlay && overlay.style.display !== 'none';

    let btn = document.getElementById('qlvb-floating-sync-btn');
    
    // Nếu trang hợp lệ nhưng chưa có nút, thì tạo nút
    if (isValidPage && !btn) {
        injectFloatingButton();
        btn = document.getElementById('qlvb-floating-sync-btn');
    }

    if (btn) {
        if (!isValidPage || isOverlayOpen) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'flex';
        }
    }
}, 1000);

} // End of window.qlvbContentScriptInjected check
