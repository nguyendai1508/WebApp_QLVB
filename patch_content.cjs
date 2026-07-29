const fs = require('fs');

// 1. Copy clean file
fs.copyFileSync('C:\\Users\\NguyenDai\\Downloads\\recovered_clean_content.js', 'd:\\Antigravity Code\\WebApp_QLVB\\chrome-extension\\content.js');

const path = 'd:\\Antigravity Code\\WebApp_QLVB\\chrome-extension\\content.js';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: hackScript removal
const hackStr = "// --- HACK SCRIPT TO EXTRACT VNPT API ---";
if (content.includes(hackStr)) {
    content = content.substring(0, content.indexOf(hackStr)) + "} // End of window.qlvbContentScriptInjected check\n";
}

// Fix 2: isValidPage
content = content.replace(
    "const tables = Array.from(document.querySelectorAll('table'));\n    const isValidPage = tables.some(t => t.innerText.includes('Trích yếu') && t.innerText.includes('Số đến'));",
    "const isValidPage = document.querySelectorAll('tr[id^=\"vanban_id_\"]').length > 0;"
);

// Fix 3: table logic
content = content.replace(
    "const tables = Array.from(document.querySelectorAll('table'));\n    const table = tables.find(t => t.innerText.includes('Trích yếu') && t.innerText.includes('Số đến'));\n    \n    if (!table) {\n        throw new Error(\"Không tìm thấy bảng dữ liệu văn bản. Vui lòng kiểm tra lại trang.\");\n    }\n    \n    const rows = table.querySelectorAll(\"tr\");\n    const results = [];\n\n    // Bắt đầu từ 1 vì row 0 là header\n    for (let i = 1; i < rows.length; i++) {\n        const tr = rows[i];",
    "const dataRows = Array.from(document.querySelectorAll('tr[id^=\"vanban_id_\"]'));\n    if (dataRows.length === 0) {\n        throw new Error(\"Không tìm thấy dòng dữ liệu văn bản nào (không có thẻ tr chứa vanban_id). Vui lòng kiểm tra lại trang.\");\n    }\n    \n    const results = [];\n\n    for (let i = 0; i < dataRows.length; i++) {\n        const tr = dataRows[i];"
);

// Fix 4: rowDeadline
content = content.replace(
    "const coQuanBanHanh = tds[14]?.innerText.trim() || \"\";\n        const xlc = tds[18]?.innerText.trim() || \"\"; // Xử lý chính",
    "const coQuanBanHanh = tds[14]?.innerText.trim() || \"\";\n        const rowDeadline = tds[13]?.innerText.trim() || \"\"; // Hạn xử lý lấy ngay từ bảng chính!\n        const xlc = tds[18]?.innerText.trim() || \"\"; // Xử lý chính"
);

content = content.replace(
    "nguoiSoan: xlc, doKhan, ngayVanBan, detailUrl\n            },",
    "nguoiSoan: xlc, doKhan, ngayVanBan, detailUrl, rowDeadline\n            },"
);

content = content.replace(
    "let finalDeadline = deadline;\n                \n                // Nếu Log không có Hạn xử lý, thử tải trang chi tiết để tìm\n                if (!finalDeadline && items[i].payload.detailUrl) {",
    "// Nếu Log không có Hạn xử lý, dùng Hạn xử lý trên bảng chính\n                let finalDeadline = items[i].payload.rowDeadline || deadline;\n                \n                // Nếu vẫn không có, thử tải trang chi tiết để tìm\n                if (!finalDeadline && items[i].payload.detailUrl) {"
);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched successfully!");
