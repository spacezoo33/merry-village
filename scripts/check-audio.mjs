import { writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.VALIDATION_URL ?? 'http://127.0.0.1:5178';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
try {
  const p = await b.newPage();
  await p.route('**/__audio', r => r.fulfill({ contentType:'text/html', body:'<button id="run">실제 오디오 측정</button>' }));
  await p.goto(`${base}/__audio`);
  await p.evaluate(async()=>{const test=await import('/tests/browser/audio-output.ts');window.offline=await test.measureOfflineAudio();document.querySelector('#run').onclick=()=>{window.live=test.measureLiveAudio()}});
  await p.click('#run');
  const result=await p.evaluate(async()=>({offline:window.offline,live:await window.live}));
  await writeFile('/tmp/merry-night-audio.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.close()}
