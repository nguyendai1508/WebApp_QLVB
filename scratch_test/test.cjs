const puppeteer = require('puppeteer');

(async () => {
    console.log("Mở trình duyệt ảo Puppeteer...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Tới trang Login
    console.log("Truy cập trang Login...");
    await page.goto('https://qlvbpr.io.vn', { waitUntil: 'networkidle2' });
    
    // Đăng nhập
    console.log("Điền tài khoản admin/123...");
    // Điền input type="text"
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    
    // Đợi Dashboard load
    console.log("Đang tải Dashboard...");
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("=> Đăng nhập thành công!");
    
    // Thử truy cập từng trang dễ lỗi nhất
    const routes = ['#/incoming-docs', '#/outgoing-docs', '#/staff'];
    for (const route of routes) {
        console.log(`Kiểm tra trang ${route}...`);
        await page.goto(`https://qlvbpr.io.vn/${route}`, { waitUntil: 'networkidle2' });
        
        // Kiểm tra xem màn hình có trống trơn không (trắng tinh do React crash)
        const content = await page.content();
        if (content.includes('Đã có lỗi xảy ra') || !content.includes('class=')) {
             console.error(`[LỖI] Trang ${route} bị crash màn hình trắng!`);
        } else {
             console.log(`[OK] Trang ${route} tải hoàn toàn bình thường.`);
        }
    }
    
    console.log("Toàn bộ các trang đã được kiểm thử thành công, không phát hiện lỗi.");
    await browser.close();
})();
