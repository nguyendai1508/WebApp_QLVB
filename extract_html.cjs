const fs = require('fs');
const lines = fs.readFileSync('C:/Users/NguyenDai/.gemini/antigravity-ide/brain/632fbad9-da8b-4f39-bdb9-19d4febe7a6a/.system_generated/logs/transcript.jsonl', 'utf-8').split('\n');
for (const line of lines) {
    if (line.includes('var s0="<style>')) {
        const obj = JSON.parse(line);
        fs.writeFileSync('log_html.txt', obj.content);
        break;
    }
}
