const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox']});
        const page = await browser.newPage();
        await page.goto('https://dnis.dongnai.gov.vn/');
        await page.type('#userName', 'lamlt.ubxphurieng');
        await page.type('#passWord', 'Lam1983@');
        await Promise.all([page.waitForNavigation(), page.click('#submitBtn')]);
        
        const url = 'https://dnis.dongnai.gov.vn/qlvbdh_dnigov/main?IzL1Dx9w5BxmCEtw5A9c6Bnb=CEt1CzAwJyHx4yjbTq9vCBtuTt9fCcPbUo..&IyLlCc5f5w5fCES.=DBny4Y9aDx9y4B1V4ctkJybk5EA0&CBAkTA9f5o..=m2767&4c9lTFLwDctm=2&6yXl=VAN_BAN_DA_XU_LY&CE9X635XCcHXCW..=1&TFbm5B5xCcLw6B9k=0';
        await page.goto(url);
        
        const rawHtml = await page.evaluate(() => {
            return new Promise(resolve => {
                DataRemoting.getDoc('qlvb.van_ban_den.getDcmTrackActivitiLog("2195820","QLVB_DNI_UBXPHURIENG.","","","1","2195820")', function(data) {
                    resolve(data);
                });
            });
        });
        
        fs.writeFileSync('log.html', rawHtml, 'utf-8');
        console.log("Done writing log.html");
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
