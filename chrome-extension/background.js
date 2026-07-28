// background.js

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbw6Eff-tF4pYYi_-KBja5BoS7JHUUfKBIVNzpXmyDz7KqNEIDfp7Wh4Mfb_TtkyRGnMTg/exec";
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
    
    // Nhận dữ liệu cào được và xử lý TRỰC TIẾP LƯU VÀO FIREBASE
    if (request.action === 'SYNC_DATA') {
        const batchDocs = request.data;
        const FIREBASE_URL = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';
        
        (async () => {
            try {
                // Lấy danh sách văn bản và nhân viên hiện tại
                const [docsRes, staffRes] = await Promise.all([
                    fetch(`${FIREBASE_URL}/incomingDocs.json`).then(r => r.json()),
                    fetch(`${FIREBASE_URL}/staff.json`).then(r => r.json())
                ]);
                
                const existingDocs = docsRes ? Object.values(docsRes) : [];
                const staffList = staffRes ? Object.keys(staffRes).map(k => ({ id: k, ...staffRes[k] })) : [];
                
                const getStaffId = (name) => {
                    if (!name) return '';
                    const cleanName = name.split('(')[0].trim().toLowerCase();
                    const staff = staffList.find(s => (s.Full_Name || s.fullName)?.toLowerCase() === cleanName);
                    return staff ? staff.id : name;
                };

                for (const doc of batchDocs) {
                    const signNumber = (doc.soHieu || doc.soDen || '').trim();
                    const summary = (doc.trichYeu || '').trim();

                    const isDuplicate = existingDocs.some(d => 
                        (d.Sign_Number || '').trim() === signNumber && 
                        (d.Summary || '').trim() === summary
                    );

                    if (isDuplicate) continue;

                    // Tải file lên Drive qua Webhook
                    let fileUrls = [];
                    if (doc.files && doc.files.length > 0) {
                        for (const f of doc.files) {
                            try {
                                const uploadRes = await fetch(DEFAULT_API_URL, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                                    body: JSON.stringify({
                                        action: 'upload_file',
                                        fileName: f.fileName,
                                        mimeType: '',
                                        fileData: f.base64Content
                                    })
                                }).then(r => r.json());
                                
                                if (uploadRes && uploadRes.url) {
                                    fileUrls.push(uploadRes.url);
                                }
                            } catch (err) {}
                        }
                    }

                    const assigneeId = getStaffId(doc.coAssignee || doc.nguoiSoan);
                    
                    // Lưu văn bản vào Firebase
                    const newDoc = {
                        Doc_ID: doc.doc_id || '',
                        Sign_Number: doc.soHieu || doc.soDen || '',
                        Draft_Date: doc.ngayVanBan || '',
                        Receive_Date: doc.ngayDen || '',
                        Summary: doc.trichYeu || '',
                        Issuer: doc.coQuanBanHanh || '',
                        Assignee_ID: assigneeId,
                        Deadline: '',
                        Status: 'Đang xử lý',
                        Note: doc.loaiVanBan ? `Loại VB: ${doc.loaiVanBan}` : '',
                        Co_Assignees: doc.coAssignee || '',
                        File_URL: fileUrls.join('\\n'),
                        createdAt: new Date().toISOString()
                    };

                    const docSaveRes = await fetch(`${FIREBASE_URL}/incomingDocs.json`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newDoc)
                    }).then(r => r.json());
                    
                    const newDocId = docSaveRes.name;

                    // Tạo Task chủ trì
                    if (assigneeId) {
                        await fetch(`${FIREBASE_URL}/tasks.json`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                Source: 'Văn bản đến', Linked_Doc_ID: newDocId, Category: 'Văn bản chỉ đạo', Priority: doc.doKhan || 'Bình thường', Status: 'Đang xử lý', Assignee_ID: assigneeId, Role: 'Chủ trì', Deadline: '', createdAt: new Date().toISOString()
                            })
                        });
                    }

                    // Tạo Task phối hợp
                    if (doc.coAssignee) {
                        const coAssigneesArr = doc.coAssignee.split(',').filter(x => x.trim() !== '');
                        for (const coName of coAssigneesArr) {
                            const coId = getStaffId(coName.trim());
                            if (coId && coId !== assigneeId) {
                                await fetch(`${FIREBASE_URL}/tasks.json`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        Source: 'Văn bản đến', Linked_Doc_ID: newDocId, Category: 'Văn bản chỉ đạo', Priority: doc.doKhan || 'Bình thường', Status: 'Đang xử lý', Assignee_ID: coId, Role: 'Phối hợp', Deadline: '', createdAt: new Date().toISOString()
                                    })
                                });
                            }
                        }
                    }
                }
                
                // Đồng bộ xong thì bắn tín hiệu sang các tab Web App đang mở (nếu có) để chúng tự Refresh giao diện
                chrome.tabs.query({ url: ["*://qlvb.io.vn/*", "*://qlvbpr.io.vn/*", "*://localhost/*", "*://script.google.com/*", "*://*.script.googleusercontent.com/*"] }, (tabs) => {
                    for (const tab of tabs) {
                        chrome.tabs.sendMessage(tab.id, { type: 'SYNC_COMPLETE' }).catch(() => {});
                    }
                });
                
            } catch (err) {
                console.error("Lỗi khi lưu Firebase trực tiếp từ Extension:", err);
            }
        })();
        
        sendResponse({ success: true, message: 'Đã xử lý lưu vào Firebase' });
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
                if (chrome.runtime.lastError) {
                    sendResponse([]);
                } else {
                    sendResponse(results && results[0] ? results[0].result : []);
                }
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
                if (chrome.runtime.lastError) {
                    sendResponse([]);
                } else {
                    sendResponse(results && results[0] ? results[0].result : []);
                }
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
            }).catch(() => {});
        }
    });
}
