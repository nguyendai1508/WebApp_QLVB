const fs = require('fs');

const harPath = 'C:\\Users\\NguyenDai\\Downloads\\dnis.dongnai.gov.vn.har';
try {
    const data = fs.readFileSync(harPath, 'utf8');
    const har = JSON.parse(data);
    
    let htmlOutput = '';
    let count = 0;
    for (const entry of har.log.entries) {
        const url = entry.request.url;
        const responseText = entry.response.content && entry.response.content.text ? entry.response.content.text : '';
        
        if (url.includes('DataRemoting.getDoc') && responseText.includes('<tr') && responseText.includes('2196006')) {
            count++;
            htmlOutput += `\n\n--- MATCH ${count} ---\n`;
            // Unescape the string to render HTML properly
            let html = responseText;
            html = html.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '');
            htmlOutput += html;
        }
    }
    fs.writeFileSync('d:\\Antigravity Code\\WebApp_QLVB\\scratch\\har_output.html', htmlOutput);
    console.log("Saved to har_output.html");
} catch(e) {
    console.error("Error:", e.message);
}
