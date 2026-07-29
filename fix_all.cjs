const fs = require('fs');

try {
    const file = 'd:\\Antigravity Code\\WebApp_QLVB\\chrome-extension\\content.js';
    const content = fs.readFileSync(file, 'utf8');
    
    // Reverse double UTF-8 encoding
    const reversed = Buffer.from(content, 'latin1').toString('utf8');
    
    // Check if it restored the log message correctly
    if (reversed.includes('Đang đọc HTML bảng dữ liệu hiện tại')) {
        fs.writeFileSync(file, reversed, 'utf8');
        console.log("Successfully restored Vietnamese characters!");
    } else {
        console.log("Reversing didn't produce the expected Vietnamese words.");
    }
} catch (e) {
    console.error(e.message);
}
