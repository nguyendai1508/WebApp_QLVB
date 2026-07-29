const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching MCP Agent Browser (IFRAME SUPPORT)...");
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const pages = await browser.pages();
    const page = pages[0];
    
    console.log("Browser opened. Please navigate to the VNPT page, login and open a document.");
    console.log("I am continuously scanning all frames for DataRemoting...");

    await page.goto('http://dnis.dongnai.gov.vn/', { waitUntil: 'domcontentloaded' });
    
    // Continuously poll all frames every 3 seconds
    let found = false;
    for (let i = 0; i < 100; i++) { // wait up to 300 seconds
        if (found) break;
        
        try {
            const frames = page.frames();
            for (const frame of frames) {
                const data = await frame.evaluate(() => {
                    try {
                        const hasDr = typeof DataRemoting !== 'undefined';
                        const hasQlvb = typeof qlvb !== 'undefined' && qlvb.van_ban_den;
                        
                        if (!hasDr && !hasQlvb) return null;
                        
                        const apis = [];
                        for (let k in window) {
                            if (k.toLowerCase().includes('qlvb') || k.toLowerCase().includes('dataremoting')) {
                                apis.push(k);
                            }
                        }
                        
                        return {
                            url: window.location.href,
                            apis: apis,
                            dataRemoting: hasDr ? Object.keys(DataRemoting) : [],
                            van_ban_den: hasQlvb ? Object.keys(qlvb.van_ban_den) : []
                        };
                    } catch(e) { return null; }
                });
                
                if (data) {
                    console.log("✅ VNPT SYSTEM DETECTED IN FRAME: " + data.url);
                    console.log("================= MCP EXTRACTION SUCCESS =================");
                    console.log(JSON.stringify(data, null, 2));
                    console.log("==========================================================");
                    found = true;
                    break;
                }
            }
        } catch(e) {}
        
        if (!found) {
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    
    if (!found) {
        console.log("❌ Scan finished but couldn't find DataRemoting. Did you open the document?");
    }
    
    console.log("You can close this browser now.");
})();
