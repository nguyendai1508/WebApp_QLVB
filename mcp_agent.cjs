const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching MCP Agent Browser...");
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const pages = await browser.pages();
    const page = pages[0];
    
    console.log("Browser opened. Please navigate to the VNPT page and login.");
    console.log("I am waiting for 60 seconds for you to open a document detail page...");

    await page.goto('http://dnis.dongnai.gov.vn/', { waitUntil: 'domcontentloaded' });
    
    // Wait until user navigates to a page where DataRemoting exists, or 60s timeout
    try {
        await page.waitForFunction('typeof qlvb !== "undefined" && qlvb.van_ban_den', { timeout: 300000, polling: 2000 });
        console.log("✅ VNPT SYSTEM DETECTED!");
        
        const data = await page.evaluate(() => {
            const apis = [];
            for (let k in window) {
                if (k.toLowerCase().includes('qlvb') || k.toLowerCase().includes('dataremoting')) {
                    apis.push(k);
                }
            }
            return {
                apis: apis,
                dataRemoting: typeof DataRemoting !== 'undefined' ? Object.keys(DataRemoting) : [],
                van_ban_den: typeof qlvb !== 'undefined' && qlvb.van_ban_den ? Object.keys(qlvb.van_ban_den) : []
            };
        });
        
        console.log("================= MCP EXTRACTION SUCCESS =================");
        console.log(JSON.stringify(data, null, 2));
        console.log("==========================================================");
        
    } catch (e) {
        console.log("❌ Timeout waiting for VNPT system. User did not reach the correct page in time.");
    }
    
    console.log("You can close this browser now.");
    // We intentionally don't close the browser so user can see it
})();
