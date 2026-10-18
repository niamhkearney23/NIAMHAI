const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [, , html, out = 'promo.mp4', stillsOnly, fpsArg = '30'] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, html));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const stage = await page.$('#stage');
  const dur = await page.evaluate(() => window.DURATION);
  const fps = +fpsArg;

  if (stillsOnly) {
    for (const t of stillsOnly.split(',').map(Number)) {
      await page.evaluate(t => window.render(t), t);
      await stage.screenshot({ path: path.join(__dirname, `still_${t}.png`) });
    }
    await browser.close();
    return;
  }

  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(dur * fps);
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.render(t), i / fps);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
