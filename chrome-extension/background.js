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
                    concurrency: DEFAULT_CONCURRENCY,
                    existingKeys: request.existingKeys || []
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
    
    // Nhận dữ liệu cào được và chuyển về Web App để xử lý lưu vào Firebase
    if (request.action === 'SYNC_DATA') {
        chrome.tabs.query({ url: ["*://qlvb.io.vn/*", "*://qlvbpr.io.vn/*", "*://localhost/*", "*://script.google.com/*", "*://*.script.googleusercontent.com/*"] }, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, { 
                    type: 'SYNC_DATA_PAYLOAD', 
                    data: request.data
                });
            }
        });
        sendResponse({ success: true, message: 'Đã gửi tới Web App' });
        return true;
    }
    if (request.action === 'EVAL_IN_MAIN_WORLD') {
        const tabId = sender.tab.id;
        
        if (request.scriptType === "getFiles") {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: "MAIN",
                func: (doc_id) => {
                    return new Promise((resolve) => {
                        try {
                            if (typeof NEORemoting !== 'undefined' && typeof Base64_Coder !== 'undefined') {
                                NEORemoting.getRSet('qlvb.van_ban_den.getFileAttachLst("' + doc_id + '",0)', function(data) {
                                    let urls = [];
                                    if (data && data !== '[]' && data !== 'null') {
                                        try {
                                            var a = eval(data);
                                            for(var i=0; i<a.length; i++) {
                                                var type = 'vb';
                                                var path = a[i].hdd_file;
                                                var name = a[i].name;
                                                if(!path.includes('upload/')) {
                                                    path = Base64_Coder.encode(path);
                                                }
                                                var url = "/qlvbdh_dnigov/smartoffice/jbm/download.jsp?5E1XCBS.=" + encodeURIComponent(Base64_Coder.encode(name)) + "&5FpXTEW.=" + path + "&TFbm5O..=" + Base64_Coder.encode(type);
                                                urls.push({ fileName: name, href: window.location.origin + url });
                                            }
                                        } catch(e) {}
                                    }
                                    resolve(urls);
                                });
                            } else {
                                resolve([]);
                            }
                        } catch(e) {
                            resolve([]);
                        }
                    });
                },
                args: [request.doc_id]
            }, (results) => {
                sendResponse(results && results[0] ? results[0].result : []);
            });
            return true;
        }
        
        if (request.scriptType === "getCoAssignees") {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: "MAIN",
                func: (doc_id) => {
                    return new Promise((resolve) => {
                        try {
                            if (typeof DataRemoting !== 'undefined') {
                                DataRemoting.getDoc('qlvb.van_ban_den.getDcmTrackActivitiLog("' + doc_id + '","QLVB_DNI_UBXPHURIENG.","","","1","' + doc_id + '")', function(htmlData) {
                                    let coAssignees = [];
                                    if (htmlData) {
                                        const match = htmlData.match(/&#272;&#7891;ng x&#7917; l&#253;: (.*?)<\/p>/);
                                        if (match && match[1]) {
                                            const namesHtml = match[1];
                                            const spanRegex = /<span class="c-blue">([^<]+)<\/span>/g;
                                            let m;
                                            while ((m = spanRegex.exec(namesHtml)) !== null) {
                                                let name = m[1].trim();
                                                name = name.replace(/\s*\([^)]+\)\.?/g, '').trim();
                                                const txt = document.createElement("textarea");
                                                txt.innerHTML = name;
                                                coAssignees.push(txt.value);
                                            }
                                        }
                                    }
                                    resolve(coAssignees);
                                });
                            } else {
                                resolve([]);
                            }
                        } catch(e) {
                            resolve([]);
                        }
                    });
                },
                args: [request.doc_id]
            }, (results) => {
                sendResponse(results && results[0] ? results[0].result : []);
            });
            return true;
        }
    }
});

// Hàm gửi tin nhắn tiến trình tới tất cả các tab Web App đang mở
function broadcastProgress(type, message, percent = 0, logType = 'info') {
    chrome.tabs.query({ url: ["*://qlvb.io.vn/*", "*://qlvbpr.io.vn/*", "*://localhost/*", "*://script.google.com/*", "*://*.script.googleusercontent.com/*"] }, (tabs) => {
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
