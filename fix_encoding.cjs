const fs = require('fs');

try {
    const file = 'd:\\Antigravity Code\\WebApp_QLVB\\chrome-extension\\content.js';
    const content = fs.readFileSync(file, 'utf8');
    
    // Reverse double UTF-8 encoding
    // This happens when UTF-8 bytes are read as Latin-1 and saved as UTF-8
    const reversed = Buffer.from(content, 'latin1').toString('utf8');
    
    if (reversed.includes('Trích yếu') || reversed.includes('Hạn xử lý')) {
        fs.writeFileSync(file, reversed, 'utf8');
        console.log("Successfully restored Vietnamese characters!");
    } else {
        console.log("Reversing didn't produce the expected Vietnamese words.");
    }
} catch (e) {
    console.error(e.message);
}
