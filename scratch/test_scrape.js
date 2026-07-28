const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log("Starting browser...");
        const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'], defaultViewport: { width: 1366, height: 768 } });
        const page = await browser.newPage();
        
        await page.goto('https://dnis.dongnai.gov.vn/', { waitUntil: 'networkidle2' });
        await page.type('#userName', 'lamlt.ubxphurieng');
        await page.type('#passWord', 'Lam1983@');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('#submitBtn')
        ]);
        
        const targetUrl = 'https://dnis.dongnai.gov.vn/qlvbdh_dnigov/main?IzL1Dx9w5BxmCEtw5A9c6Bnb=CEt1CzAwJyHx4yjbTq9vCBtuTt9fCcPbUo..&IyLlCc5f5w5fCES.=DBny4Y9aDx9y4B1V4ctkJybk5EA0&CBAkTA9f5o..=m2767&4c9lTFLwDctm=2&6yXl=VAN_BAN_DA_XU_LY&CE9X635XCcHXCW..=1&TFbm5B5xCcLw6B9k=0';
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        
        await page.waitForFunction(() => {
            return Array.from(document.querySelectorAll('table')).some(t => t.innerText.includes('Trích yếu') && t.innerText.includes('Số đến'));
        }, { timeout: 15000 }).catch(() => console.log("Table wait timeout"));
        
        const data = await page.evaluate(() => {
            const tables = Array.from(document.querySelectorAll('table'));
            const table = tables.find(t => t.innerText.includes('Trích yếu') && t.innerText.includes('Số đến'));
            
            let fileHtml = '';
            let fileHtmlFull = '';
            
            if (table) {
                const rows = Array.from(table.querySelectorAll('tr'));
                // Tìm header Files
                const headers = Array.from(rows[0].querySelectorAll('th, td')).map(th => th.innerText.trim());
                const fileIndex = headers.indexOf('Files');
                
                if (rows.length > 1 && fileIndex > -1) {
                    const tds = rows[1].querySelectorAll('td');
                    fileHtml = tds[fileIndex] ? tds[fileIndex].innerHTML : 'No files td';
                    fileHtmlFull = tds[fileIndex] ? tds[fileIndex].outerHTML : '';
                }
            }
            
            // Tìm nút next
            const pagination = document.querySelector('.pagination') || document.querySelector('.paginate') || document.querySelector('#dvPaging');
            const paginationHtml = pagination ? pagination.outerHTML : 'No pagination container';
            
            return {
                fileHtml,
                fileHtmlFull,
                paginationHtml
            };
        });
        
        console.log("RESULT JSON:");
        console.log(JSON.stringify(data, null, 2));
        
        await browser.close();
    } catch (err) {
        console.error("Error:", err);
    }
})();
