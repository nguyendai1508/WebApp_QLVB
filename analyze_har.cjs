const fs = require('fs');

const harPath = 'C:\\Users\\NguyenDai\\Downloads\\dnis.dongnai.gov.vn.har';
try {
    const data = fs.readFileSync(harPath, 'utf8');
    const har = JSON.parse(data);
    
    console.log("Total requests:", har.log.entries.length);
    
    let foundDeadline = false;
    let foundDwr = false;
    
    for (const entry of har.log.entries) {
        const url = entry.request.url;
        const responseText = entry.response.content && entry.response.content.text ? entry.response.content.text : '';
        const reqPost = entry.request.postData && entry.request.postData.text ? entry.request.postData.text : '';
        
        // Look for DWR calls (DataRemoting)
        if (url.includes('dwr') || url.includes('DataRemoting')) {
            foundDwr = true;
            console.log("\n[DWR CALL] " + url);
            console.log("Request:", reqPost.substring(0, 200));
            console.log("Response snippet:", responseText.substring(0, 300).replace(/\n/g, ' '));
            
            // Check if deadline is in the response
            if (responseText.match(/30\/0?7\/2026/i) || responseText.match(/hạn xử lý/i) || responseText.match(/hết hạn/i)) {
                console.log("🌟 => FOUND DEADLINE/KEYWORD IN THIS DWR RESPONSE!");
                const m = responseText.match(/.{0,50}(30\/0?7\/2026|hạn xử lý).{0,50}/i);
                if (m) console.log("   Snippet:", m[0].replace(/\n/g, ' '));
                foundDeadline = true;
            }
        }
        
        // General check for the deadline in ANY request
        if (responseText.match(/30\/0?7\/2026/i) || responseText.match(/hạn xử lý/i)) {
            console.log("\n[MATCH IN] " + url);
            const snippet = responseText.match(/.{0,80}(30\/0?7\/2026|hạn xử lý).{0,80}/i);
            if (snippet) console.log("Snippet:", snippet[0].replace(/\n/g, ' '));
            foundDeadline = true;
        }
    }
    
    if (!foundDeadline) {
        console.log("\n❌ Could not find the exact deadline (30/7/2026) in any response.");
    }
    
} catch(e) {
    console.error("Error reading HAR file:", e.message);
}
