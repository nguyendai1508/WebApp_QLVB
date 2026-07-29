const fs = require('fs');

const logPath = 'C:\\Users\\NguyenDai\\.gemini\\antigravity-ide\\brain\\632fbad9-da8b-4f39-bdb9-19d4febe7a6a\\.system_generated\\logs\\transcript.jsonl';
const log = fs.readFileSync(logPath, 'utf8');

const lines = log.split('\n');
let bestContent = null;
let maxLines = 0;

for (let line of lines) {
    if (!line) continue;
    try {
        const obj = JSON.parse(line);
        // Sometimes it's in content, sometimes in tool_calls, sometimes in something else.
        // Let's just stringify the whole line and check for "qlvb-floating-sync-btn"
        const str = JSON.stringify(obj);
        if (str.includes('qlvb-floating-sync-btn') && str.includes('file:///d:/Antigravity%20Code/WebApp_QLVB/chrome-extension/content.js')) {
            // Find the actual file content which usually has line numbers if it's from view_file.
            // Let's extract it from the raw line if it has "Total Lines: 7"
            if (str.length > maxLines) {
                maxLines = str.length;
                bestContent = str;
            }
        }
    } catch(e) {}
}

if (bestContent) {
    console.log("Found backup! Length: " + bestContent.length);
    fs.writeFileSync('C:\\Users\\NguyenDai\\Downloads\\backup_raw.txt', bestContent, 'utf8');
} else {
    console.log("No backup found in logs.");
}
