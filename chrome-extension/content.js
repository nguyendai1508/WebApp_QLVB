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
    document.body.appendChild(overlay);
    document.getElementById("qlvb-sync-close").addEventListener("click", () => overlay.style.display = "none");
}

function updateStatus(text) { const el = document.getElementById("qlvb-sync-status"); if (el) el.innerHTML = text; }
function updateProgress(pct) { const f = document.getElementById("qlvb-sync-progress-fill"); if (f) f.style.width = `${pct}%`; }
function addLog(text, type = "info") {
    const log = document.getElementById("qlvb-sync-log");
    if (!log) return;
    const item = document.createElement("div");
    item.className = `qlvb-log-item ${type}`;
    item.innerHTML = text;
    log.insertBefore(item, log.firstChild);
    while (log.children.length > 50) log.removeChild(log.lastChild);
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

// Bóc tách bảng dữ liệu
function scrapeCurrentPage() {
    let table = null;
    let debugInfo = [];
    
    // Tìm tất cả các bảng trên trang
    const tables = document.querySelectorAll("table");
    for (const t of tables) {
        debugInfo.push(t.id || 'no-id');
        // Xóa khoảng trắng để so sánh chính xác hơn
        const text = (t.innerText || '').replace(/\s+/g, '').toLowerCase();
        
        // Bảng danh sách văn bản luôn có cột Số đến và Số hiệu
        if (text.includes("sốđến") && text.includes("sốhiệu") && text.includes("stt")) {
            table = t;
            break; // Tìm thấy bảng xịn
        }
    }
    
    // Nếu tìm bằng text thất bại, fallback tìm bằng ID chứa grdVanBan
    if (!table) {
        table = document.querySelector('table[id*="grdVanBan"]');
    }
    
    if (!table) {
        throw new Error("Không tìm thấy bảng. Các bảng có trên trang: " + debugInfo.join(", "));
    }
    
    const rows = table.querySelectorAll("tr");
    const results = [];

    for (let i = 1; i < rows.length; i++) {
        const tr = rows[i]; const tds = tr.querySelectorAll("td");
        if (tds.length < 5) continue;

        const soDenRaw = tds[1]?.innerText.trim() || "";
        const soDen = soDenRaw.replace(/\[.*?\]/g, "").trim();
        const doKhan = (soDenRaw.match(/\[(.*?)\]/) || [])[1] || "";

        const ngayDenText = tds[2]?.innerText.trim() || "";
        let ngayDen = "";
        const dp = ngayDenText.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2}:\d{2})?/);
        if (dp) ngayDen = `${dp[3]}-${dp[2]}-${dp[1]}T${dp[4] || "00:00:00"}`;

        const td3 = (tds[3]?.innerText.trim() || "").split("\n").map(s => s.trim()).filter(Boolean);
        const td3First = td3[0] || `UNK_${i}`;
        let soHieu = td3First, ngayVanBan = "";
        const si = td3First.indexOf(" _ ");
        if (si > 0) { soHieu = td3First.substring(0, si).trim(); ngayVanBan = td3First.substring(si + 3).trim(); }
        const coQuanBanHanh = td3[1] || "";

        const nd = tds[4]?.innerText.trim() || "";
        const loaiVanBan = (nd.match(/^\[(.*?)\]/) || [])[1] || "";
        const nguoiSoan = (nd.match(/Người soạn:\s*(.+)/i) || [])[1]?.trim() || "";
        
        let trichYeu = nd;
        if (loaiVanBan) trichYeu = trichYeu.substring(trichYeu.indexOf("]") + 1).trim();
        const nsIdx = trichYeu.indexOf("Người soạn:");
        if (nsIdx > 0) trichYeu = trichYeu.substring(0, nsIdx).trim();
        trichYeu = (trichYeu.split("\n").find(l => !/^\s*\d+.*\.pdf|^\s*Tải tất cả/i.test(l)) || trichYeu.split("\n")[0] || "").trim();

        const fileEntries = [];
        for (const a of (tds[4]?.querySelectorAll("a[href]") || [])) {
            const href = a.href;
            if (!href || href.includes("javascript:") || href === "#") continue;
            const fn = a.innerText.trim();
            if (!fn || fn === "Tải tất cả" || fn.length < 3) continue;
            fileEntries.push({ fileName: fn, href });
        }

        results.push({
            payload: {
                soHieu, soDen, trichYeu, ngayDen, loaiVanBan, coQuanBanHanh,
                nguoiSoan, doKhan, ngayVanBan
            },
            fileEntries
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
async function startScraping(apiUrl, concurrency = 4, sendResponseCallback = null) {
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

        // ---------- KIỂM TRA TRÙNG LẶP -----------
        updateStatus("Đang kiểm tra trùng lặp trên Server...");
        addLog(`🔍 Kiểm tra trùng lặp ${items.length} văn bản...`, "info");
        
        let rawDocs = items.map(item => ({ ...item.payload }));
        let skipCount = 0;
        
        try {
            const checkRes = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "check_exists", docs: rawDocs })
            });
            const checkData = await checkRes.json();
            
            if (checkData.success && checkData.newDocs) {
                const newKeys = new Set(checkData.newDocs.map(d => `${(d.soHieu || d.soDen || '').trim()}|${(d.trichYeu || '').trim()}`));
                
                // Lọc lại mảng items CHỈ GIỮ LẠI NHỮNG VĂN BẢN MỚI
                items = items.filter(item => {
                    const d = item.payload;
                    const docKey = `${(d.soHieu || d.soDen || '').trim()}|${(d.trichYeu || '').trim()}`;
                    return newKeys.has(docKey);
                });
                skipCount = checkData.skippedCount;
            }
        } catch (error) {
            addLog(`⚠️ Không thể kiểm tra trùng lặp (Mất kết nối). Tiến hành xử lý tất cả...`, "warning");
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
            updateProgress(20);

            // Khởi tạo mảng docsPayload
            docsPayload = items.map(item => ({ ...item.payload, files: [] }));
            
            // Gom tất cả các tác vụ tải file
            const allFileTasks = [];
            for (let i = 0; i < items.length; i++) {
                for (const f of items[i].fileEntries) {
                    allFileTasks.push({ itemIndex: i, f: f });
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
            addLog(`🚀 Bắt đầu gửi ${docsPayload.length} văn bản lên Server...`, "info");

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
                    const bodyJson = JSON.stringify({ action: "sync_docs", docs: batchDocs });
                    let apiResponse = null;
                    
                    // CƠ CHẾ TỰ ĐỘNG THỬ LẠI (RETRY) 3 LẦN TRÁNH RỚT MẠNG
                    for (let retry = 0; retry < 3; retry++) {
                        try {
                            apiResponse = await fetch(apiUrl, {
                                method: "POST",
                                body: bodyJson,
                                headers: { "Content-Type": "text/plain;charset=utf-8" }
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

                    const responseText = await apiResponse.text();
                    let responseData;
                    try {
                        responseData = JSON.parse(responseText);
                    } catch (parseErr) {
                        addLog(`❌ Lỗi phản hồi từ Google (Không phải JSON)`, "error");
                        return; // Return để processWithConcurrency tiếp tục với nhóm khác
                    }

                    if (responseData.success) {
                        successCount += responseData.created;
                        skipCount += responseData.skipped;
                        addLog(`✅ Nhóm ${i + 1} đến ${i + batchDocs.length} xử lý xong! Đã tạo: ${responseData.created}, Bỏ qua: ${responseData.skipped}`, "success");
                    } else {
                        addLog(`❌ Google Script Error: ${responseData.message}`, "error");
                    }
                } catch (netErr) {
                    addLog(`❌ Lỗi mạng khi gửi nhóm ${i + 1}: ${netErr.message}`, "error");
                }
                
                docsSent += batchDocs.length;
                updateProgress(85 + Math.round((docsSent / docsPayload.length) * 15));
            });
        }

        addLog(`✅ Xong trang hiện tại: Thêm mới ${successCount} VB. Bỏ qua ${skipCount} VB cũ.`, "success");

        // ==========================================
        // TỰ ĐỘNG CHUYỂN TRANG (AUTO-PAGINATION) CHỐNG LẶP VÔ HẠN
        // ==========================================
        const nextBtn = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], a')).find(el => {
            const text = (el.value || el.innerText || "").toLowerCase().replace(/\s+/g, '');
            const isTrangSau = text.includes('trangsau') || text.includes('next');
            if (isTrangSau) {
                // Nếu nút là thẻ <a> nhưng không có link (href) hoặc sự kiện (onclick), tức là nút này đã bị mờ (vô hiệu hóa ở trang cuối)
                if (el.tagName.toLowerCase() === 'a' && !el.getAttribute('href') && !el.getAttribute('onclick')) {
                    return false;
                }
                return true;
            }
            return false;
        });

        // Kiểm tra xem nút Next có tồn tại và không bị vô hiệu hóa
        const isNextBtnValid = nextBtn && !nextBtn.disabled && !nextBtn.className.includes('aspNetDisabled');

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
        // Kích hoạt cờ Quét tự động
        sessionStorage.setItem('QLVB_AUTO_CRAWL', 'true');
        sessionStorage.setItem('QLVB_API_URL', request.apiUrl);
        sessionStorage.setItem('QLVB_CONCURRENCY', request.concurrency ? request.concurrency.toString() : '4');
        
        startScraping(request.apiUrl, request.concurrency, sendResponse);
        return true; // Keep message channel open for async
    }
});

// TỰ ĐỘNG KHỞI CHẠY (NẾU TRANG VỪA BỊ FULL RELOAD DO CHUYỂN TRANG)
if (sessionStorage.getItem('QLVB_AUTO_CRAWL') === 'true') {
    const savedApiUrl = sessionStorage.getItem('QLVB_API_URL');
    const savedConcurrency = parseInt(sessionStorage.getItem('QLVB_CONCURRENCY'), 10) || 4;
    if (savedApiUrl) {
        // Đợi 3 giây cho DOM load an toàn trước khi cào
        setTimeout(() => {
            startScraping(savedApiUrl, savedConcurrency);
        }, 3000);
    }
}

} // End of window.qlvbContentScriptInjected check
