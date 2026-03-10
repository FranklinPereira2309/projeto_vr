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

    // Try to find the test lip sync button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Testar Lip-Sync')) {
            console.log('Found button, clicking it...');
            await btn.click();
            break;
        }
    }

    // wait to see if an error is thrown in console
    await new Promise(r => setTimeout(r, 5000));

    fs.writeFileSync('test_audio_output.txt', logs.join('\n'));
    await browser.close();
    console.log('Done!');
})();
