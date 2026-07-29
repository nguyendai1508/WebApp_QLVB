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
    
    if (request.action === 'REPORT_FULLY_COMPLETE') {
        broadcastProgress('SYNC_COMPLETE', `✅ HOÀN TẤT TẤT CẢ! Đã thêm: ${request.created}, Bỏ qua: ${request.skipped}`);
    }
    
    // Nhận dữ liệu cào được và xử lý TRỰC TIẾP LƯU VÀO FIREBASE
    if (request.action === 'SYNC_DATA') {
        const batchDocs = request.data;
        const FIREBASE_URL = 'https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app';
        
        (async () => {
            try {
                // Lấy danh sách văn bản và nhân viên hiện tại
                const [docsRes, staffRes, usersRes] = await Promise.all([
                    fetch(`${FIREBASE_URL}/incomingDocs.json`, { cache: 'no-store' }).then(r => r.json()),
                    fetch(`${FIREBASE_URL}/staff.json`, { cache: 'no-store' }).then(r => r.json()),
                    fetch(`${FIREBASE_URL}/users.json`, { cache: 'no-store' }).then(r => r.json())
                ]);
                
                const existingDocs = docsRes ? Object.values(docsRes) : [];
                const staffList = staffRes ? Object.keys(staffRes).map(k => ({ id: k, ...staffRes[k] })) : [];
                const usersList = usersRes ? Object.keys(usersRes).map(k => ({ id: k, ...usersRes[k] })) : [];

                const removeAccents = (str) => {
                    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
                };

                const generateUsername = (fullName) => {
                    let base = removeAccents(fullName).toLowerCase().replace(/\s+/g, '');
                    let username = base;
                    let count = 1;
                    while (usersList.some(u => u.username === username || u['Tên đăng nhập'] === username)) {
                        username = base + count;
                        count++;
                    }
                    return username;
                };

                const getStaffId = async (nameRaw) => {
                    if (!nameRaw) return '';
                    
                    let cleanName = nameRaw.split('(')[0].trim();
                    let explicitUsername = null;
                    
                    const usernameMatch = nameRaw.match(/\(([^)]+)\)/);
                    if (usernameMatch && usernameMatch[1]) {
                        explicitUsername = usernameMatch[1].trim();
                    }
                    
                    // Ưu tiên kiểm tra trùng lặp bằng Username (chính xác 100%)
                    if (explicitUsername) {
                        const existingUser = usersList.find(u => u.username === explicitUsername || u['Tên đăng nhập'] === explicitUsername);
                        if (existingUser) {
                            const staffIdToFind = existingUser.staffId || existingUser['Mã cán bộ'];
                            const existingStaff = staffList.find(s => s.Staff_ID === staffIdToFind || s.id === staffIdToFind);
                            if (existingStaff) {
                                return existingStaff.id;
                            }
                        }
                    } else {
                        // Theo yêu cầu: KHÔNG dò bằng chuẩn mã Unicode của Họ tên nữa vì không chuẩn.
                        // Nếu không lấy được Username thì báo lỗi thẳng ra màn hình.
                        throw new Error(`KHÔNG THỂ LẤY USERNAME TỪ: "${nameRaw}". Vui lòng kiểm tra lại trên VNPT!`);
                    }
                    
                    // Nếu chưa có (Nhưng ĐÃ lấy được Username) -> Tự động tạo Cán bộ và Người dùng
                    const newStaffId = `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    const username = explicitUsername;
                    
                    const newStaff = {
                        Full_Name: cleanName,
                        Staff_ID: newStaffId,
                        Department: '',
                        Role: 'Chuyên viên'
                    };

                    const newUser = {
                        "Mã cán bộ": newStaffId,
                        "Mã người dùng": newStaffId,
                        "Mật khẩu": "123456",
                        "Phạm vi dữ liệu": "Tất cả",
                        "Phân quyền": "Chuyên viên",
                        "Tên người dùng": cleanName,
                        "Tên đăng nhập": username,
                        "username": username,
                        "password": "123456",
                        "fullName": cleanName,
                        "role": "Chuyên viên",
                        "staffId": newStaffId
                    };
                    
                    try {
                        const staffResData = await fetch(`${FIREBASE_URL}/staff.json`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newStaff)
                        }).then(r => r.json());
                        
                        const newFirebaseStaffId = staffResData.name;

                        await fetch(`${FIREBASE_URL}/users.json`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newUser)
                        });

                        // Cập nhật mảng local để không bị tạo trùng nếu vòng lặp tiếp theo gặp lại người này
                        staffList.push({ id: newFirebaseStaffId, ...newStaff });
                        usersList.push({ id: newStaffId, ...newUser });
                        
                        return newFirebaseStaffId;
                    } catch (err) {
                        console.error('Lỗi khi tự động tạo cán bộ/người dùng', err);
                        return cleanName;
                    }
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
                                } else {
                                    broadcastProgress('SYNC_ERROR', `Lỗi tải file ${f.fileName}: ${uploadRes ? uploadRes.error || JSON.stringify(uploadRes) : 'Không có phản hồi'}`);
                                }
                            } catch (err) {
                                broadcastProgress('SYNC_ERROR', `Lỗi kết nối tải file ${f.fileName}: ${err.message}`);
                            }
                        }
                    }

                    // Xử lý list ID cho Lead_Assignee (vì có thể có nhiều người)
                    const leadIdList = [];
                    if (doc.nguoiSoan) {
                        const leadArr = doc.nguoiSoan.split(',').filter(x => x.trim() !== '');
                        for (const leadName of leadArr) {
                            const lId = await getStaffId(leadName.trim());
                            if (lId) leadIdList.push(lId);
                        }
                    }
                    const assigneeId = leadIdList.join(', ');

                    // Xử lý list ID cho Co_Assignee
                    const coIdList = [];
                    if (doc.coAssignee) {
                        const coAssigneesArr = doc.coAssignee.split(',').filter(x => x.trim() !== '');
                        for (const coName of coAssigneesArr) {
                            const coId = await getStaffId(coName.trim());
                            if (coId) coIdList.push(coId);
                        }
                    }

                    // Lưu văn bản vào Firebase
                    const newDoc = {
                        Doc_ID: doc.doc_id || '',
                        Sign_Number: doc.soHieu || doc.soDen || '',
                        Draft_Date: doc.ngayVanBan || '',
                        Receive_Date: doc.ngayDen || '',
                        Summary: doc.trichYeu || '',
                        Issuer: doc.coQuanBanHanh || '',
                        Lead_Assignee: assigneeId,
                        Deadline: doc.deadline || '',
                        Status: 'Đang xử lý',
                        Note: doc.loaiVanBan ? `Loại VB: ${doc.loaiVanBan}` : '',
                        Co_Assignee: coIdList.join(', '),
                        File_URL: fileUrls.join('\n'),
                        createdAt: new Date().toISOString()
                    };

                    const docSaveRes = await fetch(`${FIREBASE_URL}/incomingDocs.json`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newDoc)
                    }).then(r => r.json());
                    
                    const newDocId = docSaveRes.name;

                    // Tạo Task chủ trì cho từng người
                    for (const lId of leadIdList) {
                        if (lId) {
                            await fetch(`${FIREBASE_URL}/tasks.json`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    Source: 'Văn bản đến', Linked_Doc_ID: newDocId, Category: 'Văn bản chỉ đạo', Priority: doc.doKhan || 'Bình thường', Status: 'Đang xử lý', Lead_Assignee: lId, Role: 'Chủ trì', Deadline: doc.deadline || '', createdAt: new Date().toISOString()
                                })
                            });
                        }
                    }

                    // Tạo Task phối hợp
                    for (const coId of coIdList) {
                        if (coId && coId !== assigneeId) {
                            await fetch(`${FIREBASE_URL}/tasks.json`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    Source: 'Văn bản đến', Linked_Doc_ID: newDocId, Category: 'Văn bản chỉ đạo', Priority: doc.doKhan || 'Bình thường', Status: 'Đang xử lý', Lead_Assignee: coId, Role: 'Phối hợp', Deadline: doc.deadline || '', createdAt: new Date().toISOString()
                                })
                            });
                        }
                    }
                }
                
                // Dữ liệu đã lưu Firebase. Web App sẽ tự động cập nhật qua Realtime Database Listener!
                // Không gửi SYNC_COMPLETE ở đây nữa vì sẽ làm tắt thanh progress quá sớm (khi mới xong batch 1).
                
                sendResponse({ success: true, message: 'Đã xử lý lưu vào Firebase' });
                
            } catch (err) {
                console.error("Lỗi khi lưu Firebase trực tiếp từ Extension:", err);
                sendResponse({ success: false, error: err.toString() });
            }
        })();
        
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
                                    let deadline = '';
                                    let leadAssigneeLog = '';
                                    if (htmlData) {
                                        const txt = document.createElement("textarea");
                                        txt.innerHTML = htmlData;
                                        const decodedHtml = txt.value;
                                        
                                        // Tìm Người Xử Lý Chính (Chuyển tới) để lấy username
                                        const leadMatch = decodedHtml.match(/Chuyển tới\s*:\s*(.*?)<\/p>/i);
                                        if (leadMatch && leadMatch[1]) {
                                            let cleanLead = leadMatch[1].replace(/<[^>]+>/g, '').trim();
                                            cleanLead = cleanLead.replace(/\.$/, '');
                                            leadAssigneeLog = cleanLead;
                                        }

                                        // Tìm TẤT CẢ Đồng xử lý trong toàn bộ lịch sử (bỏ qua Đồng gửi vì thường gửi toàn cơ quan)
                                        const coAssigneeRegex = /(?:Đồng xử lý)\s*:\s*(.*?)<\/p>/gi;
                                        let allCoAssignees = [];
                                        let matchResult;
                                        while ((matchResult = coAssigneeRegex.exec(decodedHtml)) !== null) {
                                            if (matchResult[1]) {
                                                const namesHtml = matchResult[1];
                                                let cleanNames = namesHtml.replace(/<[^>]+>/g, '').trim();
                                                cleanNames = cleanNames.replace(/\.$/, ''); // Xóa dấu chấm cuối câu
                                                const arr = cleanNames.split(/,\s*|(?<=\))\s*\.\s*/).map(s => s.trim()).filter(s => s !== '');
                                                allCoAssignees = allCoAssignees.concat(arr);
                                            }
                                        }
                                        // Lọc bỏ các giá trị trùng lặp
                                        coAssignees = [...new Set(allCoAssignees)];

                                        // Tìm Ngày hết hạn bằng cách xóa sạch thẻ HTML trước
                                        const plainText = decodedHtml.replace(/<[^>]+>/g, ' ');
                                        const deadlineMatch = plainText.match(/(?:Ngày hết hạn|Hạn xử lý|đến ngày)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
                                        if (deadlineMatch && deadlineMatch[1]) {
                                            deadline = deadlineMatch[1].trim();
                                        }
                                    }
                                    resolve({ coAssignees, deadline, leadAssigneeLog });
                                });
                            } else {
                                resolve({ coAssignees: [], deadline: '', leadAssigneeLog: '' });
                            }
                        } catch(e) {
                            resolve({ coAssignees: [], deadline: '', leadAssigneeLog: '' });
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
