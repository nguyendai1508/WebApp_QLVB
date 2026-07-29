if (!window.qlvbContentScriptInjected) {
    window.qlvbContentScriptInjected = true;

// ==============================
// UI OVERLAY (Giao diá»‡n hiá»ƒn thá»‹ trÃªn trang)
// ==============================
function createOverlay() {
    let overlay = document.getElementById("qlvb-sync-overlay");
    if (overlay) {
        overlay.style.display = "block";
        // Reset ná»™i dung cÅ© náº¿u cáº§n
        const logContainer = document.getElementById("qlvb-sync-log");
        if (logContainer) logContainer.innerHTML = "";
        return;
    }
    
    overlay = document.createElement("div");
    overlay.id = "qlvb-sync-overlay";
    overlay.innerHTML = `
        <style>
            #qlvb-sync-overlay { position: fixed; bottom: 20px; right: 20px; width: 420px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid #0f3460; border-radius: 16px; color: #e0e0e0; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; z-index: 999999; box-shadow: 0 8px 32px rgba(0,0,0,0.5); overflow: hidden; }
            #qlvb-sync-header { background: linear-gradient(90deg, #0f3460, #533483); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; cursor: grab; }
            #qlvb-sync-header:active { cursor: grabbing; }
            #qlvb-sync-header h3 { margin: 0; font-size: 14px; color: #fff; display: flex; align-items: center; gap: 8px; pointer-events: none; }
            #qlvb-sync-status { padding: 10px 16px; font-size: 12px; color: #a0aec0; border-bottom: 1px solid #0f3460; line-height: 1.5; }
            #qlvb-sync-progress-bar { height: 4px; background: #1a1a2e; }
            #qlvb-sync-progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #00b4d8, #48cae4); transition: width 0.3s ease; border-radius: 2px; }
            #qlvb-sync-log { max-height: 250px; overflow-y: auto; padding: 8px 0; }
            .qlvb-log-item { padding: 5px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; line-height: 1.4; }
            .qlvb-log-item.success { color: #48cae4; }
            .qlvb-log-item.error { color: #e94560; }
            .qlvb-log-item.info { color: #a0aec0; }
            #qlvb-sync-close { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 18px; padding: 0 5px; }
            #qlvb-sync-close:hover { color: #fff; }
        </style>
        <div id="qlvb-sync-header">
            <h3>âš¡ QLVB Sync -> Web App</h3>
            <button id="qlvb-sync-close">âœ•</button>
        </div>
        <div id="qlvb-sync-status">Äang khá»Ÿi táº¡o...</div>
        <div id="qlvb-sync-progress-bar"><div id="qlvb-sync-progress-fill"></div></div>
        <div id="qlvb-sync-log"></div>
    `;
    (document.body || document.documentElement).appendChild(overlay);
    
    document.getElementById("qlvb-sync-close").addEventListener("click", () => {
        overlay.style.display = "none";
        window._qlvbStopRequested = true;
        sessionStorage.removeItem('QLVB_AUTO_CRAWL');
        sessionStorage.removeItem('QLVB_CONCURRENCY');
        sessionStorage.removeItem('QLVB_MAX_PAGES');
        sessionStorage.removeItem('QLVB_CURRENT_PAGE');
        addLog(`ðŸ›‘ ÄÃ£ yÃªu cáº§u dá»«ng Ä‘á»“ng bá»™! QuÃ¡ trÃ¬nh sáº½ dá»«ng sau giÃ¢y lÃ¡t.`, "error");
        updateStatus(`ðŸ›‘ ÄÃ£ dá»«ng Ä‘á»“ng bá»™.`);
    });
    
    // ThÃªm chá»©c nÄƒng kÃ©o tháº£ (Draggable)
    const header = document.getElementById("qlvb-sync-header");
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);

    function dragStart(e) {
        if (e.target.id === "qlvb-sync-close") return;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            
            // XÃ³a fixed bottom/right ban Ä‘áº§u Ä‘á»ƒ dÃ¹ng transform
            overlay.style.bottom = "auto";
            overlay.style.right = "auto";
            overlay.style.left = "20px";
            overlay.style.top = "20px";
            
            overlay.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    }
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

// HÃ m táº£i file tá»« link trá»±c tiáº¿p trÃªn trang Ä‘á»ƒ láº¥y dáº¡ng base64
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

// HÃ m gá»­i yÃªu cáº§u láº¥y link file thá»±c sá»± tá»›i background (bypass CSP)
function getFilesForDoc(doc_id) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
            action: 'EVAL_IN_MAIN_WORLD', 
            doc_id: doc_id,
            scriptType: 'getFiles'
        }, (response) => {
            resolve(response || []);
        });
        
        // Báº¯t lá»—i timeout an toÃ n (Ä‘á» phÃ²ng extension há»ng)
        setTimeout(() => resolve([]), 5000);
    });
}

// HÃ m gá»­i yÃªu cáº§u láº¥y danh sÃ¡ch Ä‘á»“ng xá»­ lÃ½ tá»›i background (bypass CSP)
function getCoAssigneesForDoc(doc_id) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
            action: 'EVAL_IN_MAIN_WORLD', 
            doc_id: doc_id,
            scriptType: 'getCoAssignees'
        }, (response) => {
            resolve(response || { coAssignees: [], deadline: '' });
        });
        
        // Báº¯t lá»—i timeout an toÃ n
        setTimeout(() => resolve({ coAssignees: [], deadline: '' }), 5000);
    });
}
// BÃ³c tÃ¡ch báº£ng dá»¯ liá»‡u theo cáº¥u trÃºc VNPT Äá»“ng Nai
function scrapeCurrentPage() {
    const tables = Array.from(document.querySelectorAll('table'));
    const table = tables.find(t => t.textContent.includes('TrÃ­ch yáº¿u') && t.textContent.includes('Sá»‘ Ä‘áº¿n'));
    
    if (!table) {
        throw new Error("KhÃ´ng tÃ¬m tháº¥y báº£ng dá»¯ liá»‡u vÄƒn báº£n. Vui lÃ²ng kiá»ƒm tra láº¡i trang.");
    }
    
    const rows = table.querySelectorAll("tr");
    const results = [];

    // Báº¯t Ä‘áº§u tá»« 1 vÃ¬ row 0 lÃ  header
    for (let i = 1; i < rows.length; i++) {
        const tr = rows[i]; 
        const tds = tr.querySelectorAll("td");
        if (tds.length < 25) continue; // Báº£ng má»›i cÃ³ khoáº£ng 29 cá»™t

        // CÃ¡c chá»‰ sá»‘ cá»™t dá»±a theo phÃ¢n tÃ­ch thá»±c táº¿:
        const soDen = tds[6]?.textContent.trim() || "";
        const soHieu = tds[7]?.textContent.trim() || "";
        
        const trichYeuTd = tds[8] || tds[5];
        const trichYeu = (trichYeuTd?.textContent || "").trim().split('\n')[0].trim();
        
        let detailUrl = '';
        if (trichYeuTd) {
            const aTag = trichYeuTd.querySelector('a');
            if (aTag && aTag.href) {
                detailUrl = aTag.href;
            }
        }
        
        let ngayVanBanText = tds[9]?.textContent.trim() || "";
        let ngayDenText = tds[10]?.textContent.trim() || "";
        
        const coQuanBanHanh = tds[14]?.textContent.trim() || "";
        const rowDeadline = tds[13]?.textContent.trim() || ""; // Háº¡n xá»­ lÃ½ láº¥y ngay tá»« báº£ng chÃ­nh!
        const xlc = tds[18]?.textContent.trim() || ""; // Xá»­ lÃ½ chÃ­nh
        const doKhan = tds[19]?.textContent.trim() || "";
        const loaiVanBan = tds[20]?.textContent.trim() || "";
        
        // Láº¥y DOC_ID tá»« cá»™t Files (cá»™t 22)
        let doc_id = '';
        const filesHtml = tds[22]?.innerHTML || "";
        const match = filesHtml.match(/allFileDownload\((\d+)\)/);
        if (match) doc_id = match[1];

        // Format ngÃ y thÃ¡ng chuáº©n YYYY-MM-DDTHH:mm:ss
        let ngayDen = "";
        const dp = ngayDenText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dp) ngayDen = `${dp[3]}-${dp[2]}-${dp[1]}T00:00:00`;
        
        let ngayVanBan = "";
        const dp2 = ngayVanBanText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dp2) ngayVanBan = `${dp2[3]}-${dp2[2]}-${dp2[1]}`;

        if (!soDen && !trichYeu) continue; // DÃ²ng trá»‘ng

        results.push({
            payload: {
                soHieu, soDen, trichYeu, ngayDen, loaiVanBan, coQuanBanHanh,
                nguoiSoan: xlc, doKhan, ngayVanBan, detailUrl, rowDeadline
            },
            doc_id: doc_id
        });
    }
    return results;
}

// HÃ m cháº¡y song song cá»±c háº¡n (Concurrency Pool)
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

window._qlvbStopRequested = false;

// HÃ m cÃ o chÃ­nh
async function startScraping(apiUrl, concurrency = 4, existingKeys = [], sendResponseCallback = null) {
    if (window._qlvbStopRequested) return;
    try {
        createOverlay();
        updateStatus("Báº¯t Ä‘áº§u quÃ©t danh sÃ¡ch...");
        updateProgress(10);
    addLog("ðŸ” Äang Ä‘á»c HTML báº£ng dá»¯ liá»‡u hiá»‡n táº¡i...", "info");

    // 1. QuÃ©t DOM
    let items = [];
    try {
        items = scrapeCurrentPage();
    } catch (e) {
        addLog("âŒ Lá»—i quÃ©t DOM: " + e.message, "error");
        if (sendResponseCallback) sendResponseCallback({ success: false, error: e.message });
        sessionStorage.removeItem('QLVB_AUTO_CRAWL');
        return;
    }
    
    if (items.length === 0) {
        addLog("âŒ Lá»—i: KhÃ´ng trÃ­ch xuáº¥t Ä‘Æ°á»£c dÃ²ng vÄƒn báº£n nÃ o.", "error");
        if (sendResponseCallback) sendResponseCallback({ success: false, error: "KhÃ´ng cÃ³ dá»¯ liá»‡u." });
        sessionStorage.removeItem('QLVB_AUTO_CRAWL');
        return;
    }

    // ---------- KIá»‚M TRA TRÃ™NG Láº¶P Dá»°A TRÃŠN Dá»® LIá»†U Tá»ª WEB APP -----------
    updateStatus("Äang Ä‘á»‘i chiáº¿u dá»¯ liá»‡u...");
    addLog(`ðŸ” Kiá»ƒm tra trÃ¹ng láº·p ${items.length} vÄƒn báº£n...`, "info");
    
    let rawDocs = items.map(item => ({ ...item.payload }));
    let skipCount = 0;
    
    if (existingKeys && existingKeys.length > 0) {
        const keysSet = new Set(existingKeys);
        const originalLength = items.length;
        
        // Lá»c láº¡i máº£ng items CHá»ˆ GIá»® Láº I NHá»®NG VÄ‚N Báº¢N Má»šI
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
        addLog(`â­ï¸ ToÃ n bá»™ ${rawDocs.length} vÄƒn báº£n ÄÃƒ Tá»’N Táº I. Bá» qua táº£i File.`, "success");
        updateProgress(90);
    } else {
        if (skipCount > 0) {
            addLog(`âœ… Bá» qua ${skipCount} vÄƒn báº£n cÅ©. Báº¯t Ä‘áº§u táº£i File cho ${items.length} vÄƒn báº£n má»›i...`, "success");
        } else {
            addLog(`âœ… TÃ¬m tháº¥y ${items.length} vÄƒn báº£n má»›i. Báº¯t Ä‘áº§u táº£i File...`, "success");
        }
        
        updateStatus(`Äang táº£i File Ä‘Ã­nh kÃ¨m (An toÃ n)...`);
        updateProgress(20);

        // Khá»Ÿi táº¡o máº£ng docsPayload
        docsPayload = items.map(item => ({ ...item.payload, files: [] }));
        
        // Gom táº¥t cáº£ cÃ¡c tÃ¡c vá»¥ táº£i file vÃ  láº¥y thÃ´ng tin Äá»“ng xá»­ lÃ½
        const fileTasks = [];
        for (let i = 0; i < items.length; i++) {
            if (window._qlvbStopRequested) return;
            if (items[i].doc_id) {
                addLog(`Äang tÃ¬m link áº©n vÃ  Äá»“ng xá»­ lÃ½ cho vÄƒn báº£n ${items[i].payload.soDen}...`, "info");
                
                // Láº¥y files
                const fileUrls = await getFilesForDoc(items[i].doc_id);
                for (const f of fileUrls) {
                    fileTasks.push({ itemIndex: i, f: f });
                }
                
                // Láº¥y Äá»“ng xá»­ lÃ½ vÃ  Háº¡n xá»­ lÃ½
                const { coAssignees, deadline, leadAssigneeLog } = await getCoAssigneesForDoc(items[i].doc_id);
                if (coAssignees && coAssignees.length > 0) {
                    docsPayload[i].coAssignee = coAssignees.join(', ');
                    addLog(`ðŸ‘¥ ÄÃ£ tÃ¬m tháº¥y ${coAssignees.length} Äá»“ng xá»­ lÃ½.`, "success");
                }
                
                // Náº¿u Log khÃ´ng cÃ³ Háº¡n xá»­ lÃ½, dÃ¹ng Háº¡n xá»­ lÃ½ trÃªn báº£ng chÃ­nh
                let finalDeadline = items[i].payload.rowDeadline || deadline;
                
                // Náº¿u váº«n khÃ´ng cÃ³, thá»­ táº£i trang chi tiáº¿t Ä‘á»ƒ tÃ¬m
                if (!finalDeadline && items[i].payload.detailUrl) {
                    if (items[i].payload.detailUrl.includes('javascript:')) {
                        addLog(`âš ï¸ KhÃ´ng thá»ƒ láº¥y Háº¡n xá»­ lÃ½ vÃ¬ link lÃ  Javascript PostBack.`, "warning");
                    } else {
                        try {
                            addLog(`ðŸ” Äang táº£i trang chi tiáº¿t Ä‘á»ƒ tÃ¬m Háº¡n xá»­ lÃ½...`, "info");
                            const detailHtml = await fetch(items[i].payload.detailUrl, { credentials: 'include' }).then(r => r.text());
                            const parser = new DOMParser();
                            const docHtml = parser.parseFromString(detailHtml, "text/html");
                            
                            // Regex tÃ¬m NgÃ y háº¿t háº¡n hoáº·c Háº¡n xá»­ lÃ½ trong toÃ n bá»™ text cá»§a trang
                            const plainText = docHtml.body.textContent || "";
                            const dlMatch = plainText.match(/(?:NgÃ y háº¿t háº¡n|Háº¡n xá»­ lÃ½|Háº¡n giáº£i quyáº¿t)[\s\S]{0,150}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
                            
                            if (dlMatch && dlMatch[1]) {
                                finalDeadline = dlMatch[1].trim();
                            }
                        } catch (e) {
                            console.error("Lá»—i láº¥y Háº¡n xá»­ lÃ½ tá»« trang chi tiáº¿t:", e);
                            addLog(`âŒ Lá»—i táº£i trang chi tiáº¿t: ${e.message}`, "error");
                        }
                    }
                }

                if (finalDeadline) {
                    docsPayload[i].deadline = finalDeadline;
                    addLog(`â³ TÃ¬m tháº¥y Háº¡n xá»­ lÃ½: ${finalDeadline}`, "success");
                } else {
                    addLog(`â³ KHÃ”NG tÃ¬m tháº¥y Háº¡n xá»­ lÃ½ cho vÄƒn báº£n nÃ y.`, "warning");
                }
                
                // Cáº­p nháº­t láº¡i Username cho NgÆ°á»i Xá»­ LÃ½ ChÃ­nh náº¿u tÃ¬m tháº¥y trong Log
                if (leadAssigneeLog && docsPayload[i].nguoiSoan) {
                    const firstPersonName = docsPayload[i].nguoiSoan.split(',')[0].trim().toLowerCase();
                    if (leadAssigneeLog.toLowerCase().includes(firstPersonName)) {
                        docsPayload[i].nguoiSoan = leadAssigneeLog;
                        addLog(`ðŸ‘¤ Bá»• sung Username cho Xá»­ lÃ½ chÃ­nh: ${leadAssigneeLog}`, "success");
                    }
                }
            }
        }

        let filesDownloaded = 0;
        
        // Táº¢I FILE: Giá»›i háº¡n 2 luá»“ng
        await processWithConcurrency(fileTasks, 2, async (task) => {
            if (window._qlvbStopRequested) return;
            try {
                addLog(`ðŸ“¥ Äang táº£i: ${task.f.fileName}...`, "info");
                let b64 = await fetchFileAsBase64(task.f.href);
                
                // Retry
                if (!b64) {
                    addLog(`â³ Äang thá»­ táº£i láº¡i: ${task.f.fileName}...`, "info");
                    await new Promise(r => setTimeout(r, 1000));
                    b64 = await fetchFileAsBase64(task.f.href);
                }

                if (b64) {
                    docsPayload[task.itemIndex].files.push({
                        fileName: task.f.fileName,
                        base64Content: b64
                    });
                } else {
                    addLog(`âŒ Táº£i tháº¥t báº¡i (Lá»—i máº¡ng tá»« Sá»Ÿ): ${task.f.fileName}`, "error");
                }
            } catch (e) {
                addLog(`âŒ Lá»—i táº£i file ${task.f.fileName}: ${e.message}`, "error");
            }
            filesDownloaded++;
            updateProgress(20 + Math.round((filesDownloaded / fileTasks.length) * 60));
        });

            updateStatus("Äang Ä‘áº©y dá»¯ liá»‡u sang Web App...");
            updateProgress(85);
            addLog(`ðŸš€ Báº¯t Ä‘áº§u gá»­i ${docsPayload.length} vÄƒn báº£n...`, "info");

            const BATCH_SIZE = 1;
            let docsSent = 0;
            const batches = [];
            for (let i = 0; i < docsPayload.length; i += BATCH_SIZE) {
                batches.push({
                    startIndex: i,
                    docs: docsPayload.slice(i, i + BATCH_SIZE)
                });
            }

            // Äá»’NG Bá»˜ Dá»® LIá»†U: Báº®T BUá»˜C CHáº Y TUáº¦N Tá»° (concurrency = 1) Äá»‚ TRÃNH Lá»–I TRÃ™NG Láº¶P USER
            await processWithConcurrency(batches, 1, async (batch) => {
                if (window._qlvbStopRequested) return;
                const i = batch.startIndex;
                const batchDocs = batch.docs;
                addLog(`ðŸ“¤ Äang gá»­i nhÃ³m vÄƒn báº£n thá»© ${i + 1} Ä‘áº¿n ${i + batchDocs.length}...`, "info");
                
                try {
                    let apiResponse = null;
                    
                    // CÆ  CHáº¾ Tá»° Äá»˜NG THá»¬ Láº I (RETRY) 3 Láº¦N TRÃNH Rá»šT Máº NG
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
                            break; // ThÃ nh cÃ´ng thÃ¬ thoÃ¡t vÃ²ng láº·p Retry
                        } catch (fetchErr) {
                            if (retry < 2) {
                                addLog(`â³ MÃ¡y chá»§ báº­n, Ä‘ang thá»­ gá»­i láº¡i nhÃ³m ${i + 1}... láº§n ${retry + 1}`, "info");
                                await new Promise(r => setTimeout(r, 4000));
                            } else {
                                throw fetchErr;
                            }
                        }
                    }

                    if (apiResponse && apiResponse.success) {
                        successCount += batchDocs.length;
                        addLog(`âœ… NhÃ³m ${i + 1} Ä‘áº¿n ${i + batchDocs.length} xá»­ lÃ½ xong (ÄÃ£ chuyá»ƒn Web App)!`, "success");
                    } else {
                        const errMsg = apiResponse ? apiResponse.error : 'KhÃ´ng xÃ¡c Ä‘á»‹nh';
                        addLog(`âŒ NhÃ³m ${i + 1} tháº¥t báº¡i: ${errMsg}`, "error");
                        window._qlvbStopRequested = true;
                        throw new Error(`Lá»—i tá»« Background: ${errMsg}`);
                    }
                } catch (netErr) {
                    addLog(`âŒ Tiáº¿n trÃ¬nh bá»‹ giÃ¡n Ä‘oáº¡n: ${netErr.message}`, "error");
                    window._qlvbStopRequested = true;
                    throw netErr;
                }
                
                docsSent += batchDocs.length;
                updateProgress(85 + Math.round((docsSent / docsPayload.length) * 15));
            });
        addLog(`âœ… Xong trang hiá»‡n táº¡i: ThÃªm má»›i ${successCount} VB. Bá» qua ${skipCount} VB cÅ©.`, "success");
    }

    // ==========================================
        // Tá»° Äá»˜NG CHUYá»‚N TRANG (AUTO-PAGINATION) CHá»NG Láº¶P VÃ” Háº N
        // ==========================================
        const nextIcon = document.querySelector('.pagination .fa-forward');
        const nextBtn = nextIcon ? nextIcon.closest('a') : null;
        
        const isNextBtnValid = nextBtn && !nextBtn.hasAttribute('disabled') && !nextBtn.className.includes('disabled') && !nextBtn.parentElement.className.includes('disabled');

        if (isNextBtnValid && !window._qlvbStopRequested) {
            
            // KIá»‚M TRA GIá»šI Háº N TRANG (PAGE LIMITS)
            let maxPages = parseInt(sessionStorage.getItem('QLVB_MAX_PAGES') || '2'); // Máº·c Ä‘á»‹nh 2 trang
            let currentPage = parseInt(sessionStorage.getItem('QLVB_CURRENT_PAGE') || '1');
            
            if (currentPage >= maxPages) {
                 addLog(`ðŸ ÄÃ£ Ä‘áº¡t giá»›i háº¡n ${maxPages} trang. Dá»«ng láº­t trang.`, "success");
                 sessionStorage.removeItem('QLVB_AUTO_CRAWL');
                 updateProgress(100);
                 updateStatus(`ðŸŽ‰ HOÃ€N Táº¤T! ÄÃ£ Ä‘á»“ng bá»™ ${currentPage} trang.`);
                 
                 chrome.runtime.sendMessage({
                     action: 'REPORT_FULLY_COMPLETE',
                     created: successCount,
                     skipped: skipCount
                 });
                 return;
            }
            
            sessionStorage.setItem('QLVB_CURRENT_PAGE', (currentPage + 1).toString());
            
            updateStatus(`PhÃ¡t hiá»‡n cÃ³ trang tiáº¿p theo (Ä‘ang á»Ÿ trang ${currentPage}/${maxPages === 9999 ? 'Táº¥t cáº£' : maxPages})! Äang chuáº©n bá»‹ chuyá»ƒn...`);
            addLog(`ðŸ‘‰ Chuáº©n bá»‹ láº­t sang trang tiáº¿p theo sau 2 giÃ¢y...`, "info");
            
            // HÃ m tÃ¬m báº£ng dá»¯ liá»‡u chÃ­nh xÃ¡c
            function getDataTable() {
                const tables = Array.from(document.querySelectorAll('table'));
                return tables.find(t => t.textContent.includes('TrÃ­ch yáº¿u') && t.textContent.includes('Sá»‘ Ä‘áº¿n')) || document.querySelector('table');
            }
            
            const mainTable = getDataTable();
            const currentTableHTML = mainTable ? mainTable.innerHTML : "";
            
            setTimeout(() => {
                nextBtn.click();
                
                // Äá» phÃ²ng trÆ°á»ng há»£p trang dÃ¹ng AJAX UpdatePanel (khÃ´ng táº£i láº¡i toÃ n bá»™ trang)
                let checkCount = 0;
                
                // HÃ m Polling: Kiá»ƒm tra liÃªn tá»¥c xem báº£ng dá»¯ liá»‡u Ä‘Ã£ thay Ä‘á»•i (Load xong) chÆ°a
                function checkTableChanged() {
                    const newTable = getDataTable();
                    const newTableHTML = newTable ? newTable.innerHTML : "";
                    
                    if (newTableHTML !== currentTableHTML && currentTableHTML !== "") {
                        // Báº£ng Ä‘Ã£ thay Ä‘á»•i -> Láº­t trang thÃ nh cÃ´ng -> Láº­p tá»©c cháº¡y tiáº¿p
                        startScraping(apiUrl, concurrency);
                    } else {
                        checkCount++;
                        if (checkCount < 20) {
                            // Dá»¯ liá»‡u chÆ°a Ä‘á»•i. Tiáº¿p tá»¥c chá» thÃªm 1 giÃ¢y.
                            window._ajaxCrawlTimeout = setTimeout(checkTableChanged, 1000);
                        } else {
                            // Chá» 20 giÃ¢y rá»“i mÃ  khÃ´ng cÃ³ gÃ¬ thay Ä‘á»•i -> Cá»‘ gáº¯ng click láº¡i báº±ng Javascript thuáº§n (náº¿u href lÃ  javascript:)
                            if (checkCount === 20 && nextBtn.href && nextBtn.href.includes('javascript:')) {
                                addLog(`â³ Thá»­ láº­t trang báº±ng lá»‡nh JS trá»±c tiáº¿p...`, "info");
                                location.href = nextBtn.href;
                                checkCount++;
                                window._ajaxCrawlTimeout = setTimeout(checkTableChanged, 1000);
                            } else if (checkCount < 25) {
                                checkCount++;
                                window._ajaxCrawlTimeout = setTimeout(checkTableChanged, 1000);
                            } else {
                                addLog(`ðŸ ÄÃ£ click Trang Sau nhÆ°ng sau 25s dá»¯ liá»‡u khÃ´ng Ä‘á»•i (cÃ³ thá»ƒ Ä‘Ã£ á»Ÿ trang cuá»‘i). NgÄƒn cháº·n láº·p vÃ´ háº¡n.`, "success");
                                sessionStorage.removeItem('QLVB_AUTO_CRAWL');
                                sessionStorage.removeItem('QLVB_CONCURRENCY');
                                updateProgress(100);
                                updateStatus(`ðŸŽ‰ HOÃ€N Táº¤T! ÄÃ£ Ä‘á»“ng bá»™ toÃ n bá»™ cÃ¡c trang.`);
                            }
                        }
                    }
                }
                
                // Báº¯t Ä‘áº§u vÃ²ng láº·p kiá»ƒm tra sau khi click 1 giÃ¢y
                window._ajaxCrawlTimeout = setTimeout(checkTableChanged, 1000);
                
                // Náº¿u trang lÃ  Full Reload (táº£i láº¡i toÃ n bá»™), sá»± kiá»‡n nÃ y sáº½ ngáº¯t timeout AJAX á»Ÿ trÃªn
                window.addEventListener("beforeunload", () => {
                    clearTimeout(window._ajaxCrawlTimeout);
                });
            }, 2000);
        } else {
            // KhÃ´ng cÃ²n trang nÃ o ná»¯a (Hoáº·c trang cuá»‘i cÃ¹ng)
            sessionStorage.removeItem('QLVB_AUTO_CRAWL');
            sessionStorage.removeItem('QLVB_CONCURRENCY');
            updateProgress(100);
            updateStatus(`ðŸŽ‰ HOÃ€N Táº¤T TOÃ€N Bá»˜ CÃC TRANG! ÄÃ£ Ä‘áº©y xong.`);
            addLog(`ðŸ KhÃ´ng tÃ¬m tháº¥y trang tiáº¿p theo (Ä‘Ã£ Ä‘áº¿n trang cuá»‘i). Dá»«ng tiáº¿n trÃ¬nh.`, "success");
            
            chrome.runtime.sendMessage({
                action: 'REPORT_FULLY_COMPLETE',
                created: successCount,
                skipped: skipCount
            });
            
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
        updateStatus(`âŒ Lá»—i há»‡ thá»‘ng`);
        addLog(`âŒ Exception: ${err.toString()}`, "error");
        if (sendResponseCallback) sendResponseCallback({ success: false, error: err.toString() });
    }
}

// Láº¯ng nghe lá»‡nh tá»« popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_SCRAPE") {
        const concurrency = request.concurrency || 4;
        const apiUrl = request.apiUrl;
        const existingKeys = request.existingKeys || [];
        
        // KÃ­ch hoáº¡t cá» QuÃ©t tá»± Ä‘á»™ng
        sessionStorage.setItem('QLVB_AUTO_CRAWL', 'true');
        sessionStorage.setItem('QLVB_API_URL', apiUrl);
        sessionStorage.setItem('QLVB_CONCURRENCY', concurrency.toString());
        sessionStorage.setItem('QLVB_EXISTING_KEYS', JSON.stringify(existingKeys));
        
        startScraping(apiUrl, concurrency, existingKeys, sendResponse);
        return true; // Keep message channel open for async
    }
});

// Tá»° Äá»˜NG KHá»žI CHáº Y (Náº¾U TRANG Vá»ªA Bá»Š FULL RELOAD DO CHUYá»‚N TRANG)
window.addEventListener('load', () => {
    if (sessionStorage.getItem('QLVB_AUTO_CRAWL') === 'true') {
        const apiUrl = sessionStorage.getItem('QLVB_API_URL') || "https://script.google.com/macros/s/AKfycbwh8G4ZN-ye5vey26m2JuTus93L63pfMFCoUoyX18kMRnPU6rZbuQCoSYuayFSFTYnl/exec";
        const concurrency = parseInt(sessionStorage.getItem('QLVB_CONCURRENCY')) || 4;
        let existingKeys = [];
        try {
            existingKeys = JSON.parse(sessionStorage.getItem('QLVB_EXISTING_KEYS') || '[]');
        } catch (e) {}
        
        // Cáº§n chÃºt thá»i gian cho trang load xong háº³n
        setTimeout(() => {
            startScraping(apiUrl, concurrency, existingKeys);
        }, 1500);
    }
});

// ==========================================
// Táº O NÃšT Äá»’NG Bá»˜ Ná»”I TRÃŠN TRANG VNPT
// ==========================================
function injectFloatingButton() {
    console.log("[QLVB Sync] Äang thá»­ táº¡o nÃºt ná»•i...");
    // TrÃ¡nh táº¡o nhiá»u láº§n
    if (document.getElementById('qlvb-floating-sync-btn')) {
        console.log("[QLVB Sync] NÃºt Ä‘Ã£ tá»“n táº¡i.");
        return;
    }

    const container = document.body || document.documentElement;
    if (!container) {
        console.log("[QLVB Sync] KhÃ´ng tÃ¬m tháº¥y Body/HTML Ä‘á»ƒ chÃ¨n nÃºt.");
        return;
    }

    const btn = document.createElement('button');
    btn.id = 'qlvb-floating-sync-btn';
    btn.innerHTML = 'ðŸš€ Äá»“ng bá»™ vá» Web App QLVB';
    
    // CSS cho nÃºt ná»•i
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
        let isSyncAll = confirm("Báº¡n cÃ³ muá»‘n Äá»’NG Bá»˜ Táº¤T Cáº¢ CÃC TRANG khÃ´ng?\n\n- Chá»n OK: QuÃ©t toÃ n bá»™ dá»¯ liá»‡u tá»« Ä‘áº§u Ä‘áº¿n cuá»‘i (Máº¥t nhiá»u thá»i gian).\n- Chá»n Cancel (Há»§y): Chá»‰ quÃ©t 2 trang Ä‘áº§u tiÃªn (DÃ¹ng Ä‘á»ƒ cáº­p nháº­t nhanh).");
        let maxPages = isSyncAll ? 9999 : 2;
        
        console.log("[QLVB Sync] Báº¯t Ä‘áº§u Ä‘á»“ng bá»™ tá»« nÃºt ná»•i!");
        window._qlvbStopRequested = false;
        sessionStorage.setItem('QLVB_AUTO_CRAWL', 'true');
        sessionStorage.setItem('QLVB_API_URL', 'none');
        sessionStorage.setItem('QLVB_CONCURRENCY', '4');
        sessionStorage.setItem('QLVB_MAX_PAGES', maxPages.toString());
        sessionStorage.setItem('QLVB_CURRENT_PAGE', '1');
        startScraping('none', 4);
    };

    container.appendChild(btn);
    console.log("[QLVB Sync] ÄÃ£ chÃ¨n nÃºt ná»•i thÃ nh cÃ´ng vÃ o", container.tagName);
}

// Quáº£n lÃ½ tráº¡ng thÃ¡i hiá»ƒn thá»‹ cá»§a nÃºt ná»•i liÃªn tá»¥c
setInterval(() => {
    // 1. Kiá»ƒm tra báº£ng vÄƒn báº£n cÃ³ tá»“n táº¡i khÃ´ng
    const tables = Array.from(document.querySelectorAll('table'));
    const isValidPage = tables.some(t => t.textContent.includes('TrÃ­ch yáº¿u') && t.textContent.includes('Sá»‘ Ä‘áº¿n'));
    
    // 2. Kiá»ƒm tra Overlay cÃ³ Ä‘ang má»Ÿ khÃ´ng
    const overlay = document.getElementById('qlvb-sync-overlay');
    const isOverlayOpen = overlay && overlay.style.display !== 'none';

    let btn = document.getElementById('qlvb-floating-sync-btn');
    
    // Náº¿u trang há»£p lá»‡ nhÆ°ng chÆ°a cÃ³ nÃºt, thÃ¬ táº¡o nÃºt
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


