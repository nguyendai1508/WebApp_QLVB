const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            const tabs = JSON.parse(data);
            const targetTab = tabs.find(t => t.url && t.url.includes('dongnai.gov.vn') && t.type === 'page');
            
            if (!targetTab) {
                console.log("Could not find a VNPT tab. Please make sure you have the VNPT page open.");
                console.log("Available tabs:");
                tabs.forEach(t => console.log(`- ${t.title} (${t.url})`));
                return;
            }

            console.log(`Found target tab: ${targetTab.title}`);
            const wsUrl = targetTab.webSocketDebuggerUrl;
            
            const ws = new WebSocket(wsUrl);
            ws.on('open', () => {
                const expression = `
                    (function() {
                        try {
                            const keys1 = typeof qlvb !== 'undefined' && qlvb.van_ban_den ? Object.keys(qlvb.van_ban_den) : [];
                            const keys2 = typeof DataRemoting !== 'undefined' ? Object.keys(DataRemoting) : [];
                            return JSON.stringify({ qlvb_van_ban_den: keys1, DataRemoting: keys2 });
                        } catch(e) {
                            return e.message;
                        }
                    })()
                `;
                
                ws.send(JSON.stringify({
                    id: 1,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: expression,
                        returnByValue: true
                    }
                }));
            });

            ws.on('message', (msg) => {
                const response = JSON.parse(msg);
                if (response.id === 1) {
                    if (response.result && response.result.result) {
                        console.log("EVALUATION RESULT:");
                        console.log(response.result.result.value);
                    } else {
                        console.log("FAILED TO EVALUATE:", response);
                    }
                    ws.close();
                }
            });
            
            ws.on('error', (err) => {
                console.error("WebSocket error:", err);
            });

        } catch(e) {
            console.error("Error parsing JSON:", e);
        }
    });
}).on('error', (err) => {
    console.error("Error connecting to Chrome DevTools port 9222:", err.message);
});
