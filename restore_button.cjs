const fs = require('fs');

const cleanPath = 'C:\\Users\\NguyenDai\\Downloads\\recovered_clean_content.js';
const targetPath = 'd:\\Antigravity Code\\WebApp_QLVB\\chrome-extension\\content.js';

let cleanContent = fs.readFileSync(cleanPath, 'utf8');
let targetContent = fs.readFileSync(targetPath, 'utf8');

// Extract the floating button code from cleanContent
const startMarker = "// ==========================================\n// TẠO NÚT ĐỒNG BỘ NỔI TRÊN TRANG VNPT";
const endMarker = "} // End of window.qlvbContentScriptInjected check";

if (cleanContent.includes(startMarker)) {
    let buttonCode = cleanContent.substring(cleanContent.indexOf(startMarker));
    
    // Remove the hackScript from the buttonCode just in case
    const hackStr = "// --- HACK SCRIPT TO EXTRACT VNPT API ---";
    if (buttonCode.includes(hackStr)) {
        buttonCode = buttonCode.substring(0, buttonCode.indexOf(hackStr)) + "} // End of window.qlvbContentScriptInjected check\n";
    }

    // Now insert it into targetContent
    if (targetContent.includes(endMarker)) {
        targetContent = targetContent.replace(endMarker, buttonCode);
        fs.writeFileSync(targetPath, targetContent, 'utf8');
        console.log("Restored floating button to content.js");
    }
}
