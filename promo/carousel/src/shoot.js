const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [, , outDir] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + path.join(__dirname, 'carousel.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const slides = await p.$$('section.s');
  for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  await p.pdf({ path: path.join(outDir, 'cross-the-causeway-carousel.pdf'), width: '1080px', height: '1350px', printBackground: true, pageRanges: '1-' + slides.length });
  await b.close();
})();
