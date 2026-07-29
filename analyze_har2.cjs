const fs = require('fs');

const harPath = 'C:\\Users\\NguyenDai\\Downloads\\dnis.dongnai.gov.vn.har';
try {
    const data = fs.readFileSync(harPath, 'utf8');
    const har = JSON.parse(data);
    
    console.log("Looking for Document ID 2196006...");
    
    for (const entry of har.log.entries) {
        const responseText = entry.response.content && entry.response.content.text ? entry.response.content.text : '';
        
        if (responseText.includes('2196006')) {
            console.log("\n[MATCH URL] " + entry.request.url);
            // Print a snippet around the document ID
            const idx = responseText.indexOf('2196006');
            console.log("Snippet:", responseText.substring(Math.max(0, idx - 100), Math.min(responseText.length, idx + 200)).replace(/\n/g, ' '));
        }
    }
} catch(e) {
    console.error("Error:", e.message);
}
