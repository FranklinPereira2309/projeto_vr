import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => logs.push(`LOG: ${msg.text()}`));
    page.on('pageerror', error => logs.push(`ERROR: ${error.message}`));

    await page.goto('http://localhost:3001/');
    await new Promise(r => setTimeout(r, 4000));

    await page.screenshot({ path: 'screenshot.png' });
    const html = await page.content();

    fs.writeFileSync('test_output.txt', logs.join('\n') + '\n\nHTML:\n' + html.substring(0, 1000));
    await browser.close();
})();
