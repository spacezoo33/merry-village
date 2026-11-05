// Private ephemeral test contexts only. Receipts below are fixtures, not SDK rewards.
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.VALIDATION_URL ?? 'http://127.0.0.1:5178';
const out = process.env.VALIDATION_DIR ?? '/tmp/merry-nights';
await mkdir(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const errors = [], layouts = [], themes = [];
try {
  for (const [width,height] of [[320,640],[375,812],[430,932],[430,640]]) {
    const p = await b.newPage({ viewport: { width,height } });
    p.on('pageerror', e=>errors.push(e.message));
    await p.goto(base); await p.locator('#scene-host .actor-stage[data-ready="true"]').waitFor();
    const r = await p.evaluate(()=>{
      const stage=document.querySelector('#scene-host').getBoundingClientRect(), player=document.querySelector('.now-playing').getBoundingClientRect(), nav=document.querySelector('.bottom-nav').getBoundingClientRect();
      if(document.documentElement.scrollWidth>innerWidth || stage.x<0 || stage.right>innerWidth+.1) throw Error('clipped village');
      const gap=nav.top-player.bottom;
      if(gap>Math.max(30,innerHeight*.11)) throw Error(`excess player/menu gap ${gap}`);
      return { gap,stageWidth:stage.width,pageHeight:document.documentElement.scrollHeight };
    });
    for(const [selector,label] of [['#motion-toggle','동작'],['#lights-toggle','조명'],['#snow-toggle','눈']]) {
      if((await p.locator(selector).innerText()).trim()!==label)throw Error('ON/OFF text remains');
      const size=await p.locator(selector).boundingBox();if(size.width<44||size.height<44)throw Error('touch size');
    }
    await p.locator('#motion-toggle').click();
    if(await p.locator('#motion-toggle').getAttribute('aria-pressed')!=='false')throw Error('motion OFF');
    await p.locator('#motion-toggle').click();
    await p.screenshot({path:`${out}/${width}-${height}-layout.png`});
    await p.locator('.bottom-nav [data-action="nights"]').click();
    if(await p.locator('.night-theme-card').count()!==3)throw Error('night cards');
    await p.screenshot({path:`${out}/${width}-${height}-cards.png`});
    for(const id of ['moonlight','shooting','aurora']) {
      await p.locator(`button[data-effect="${id}"]`).click();
      if(await p.locator('#app').getAttribute('data-effect')!=='none')throw Error('unearned live theme');
      if(!await p.locator('[data-action="reward"]').isDisabled())throw Error('unconfigured ad enabled');
      await p.locator('[data-action="close"]').click();
      const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('merry-village:v2')));
      if(Object.keys(saved.nightPasses).length || Object.keys(saved.villagePasses).length)throw Error('web granted reward');
      await p.locator('.bottom-nav [data-action="nights"]').click();
    }
    await p.locator('[data-action="close"]').click();
    if (width === 320) {
      await p.locator('.bottom-nav [data-action="villages"]').click(); await p.locator('.village-card[data-village="palace"]').click();
      await p.locator('.bottom-nav [data-action="nights"]').click(); await p.locator('button[data-effect="moonlight"]').click();
      await p.locator('[data-action="close"]').click(); await p.locator('#preview-unlock').click();
      if (!await p.locator('.pass-hero h3').innerText().then(s => s.includes('달빛 겨울 궁전'))) throw Error('night target leaked into village unlock');
      await p.locator('[data-action="close"]').click();
    }
    layouts.push({width,height,...r});await p.close();
  }
  // Separate authorized-state fixture; never simulates an ad event or changes production users.
  const p=await b.newPage({viewport:{width:375,height:812}});p.on('pageerror',e=>errors.push(e.message));
  const now=Date.now();await p.addInitScript(({now})=>{
    const pass={source:'rewarded',grantedAt:now,expiresAt:now+7*86400000};
    localStorage.setItem('merry-village:v2',JSON.stringify({village:'cozy',snow:false,motion:false,nightPasses:{moonlight:pass,shooting:pass,aurora:pass}}));
  },{now});
  await p.goto(base);await p.locator('#scene-host .actor-stage[data-ready="true"]').waitFor();
  for(const id of ['moonlight','shooting','aurora']) {
    await p.locator('.bottom-nav [data-action="nights"]').click();await p.locator(`button[data-effect="${id}"]`).click();
    if(await p.locator('#app').getAttribute('data-effect')!==id)throw Error('authorized apply');
    await p.screenshot({path:`${out}/${id}-active.png`});
    await p.locator('.bottom-nav [data-action="villages"]').click();await p.locator('.village-card[data-village="forest"]').click();
    if(await p.locator('#app').getAttribute('data-effect')!==id)throw Error('village cleared theme');
    await p.locator('.bottom-nav [data-action="photo"]').click();await p.locator('.photo-preview img').waitFor({timeout:60000});
    const photo=await p.locator('.photo-preview img').evaluate(async i=>{await i.decode();const blob=await fetch(i.src).then(r=>r.blob());return{width:i.naturalWidth,height:i.naturalHeight,type:blob.type,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))}});
    if(photo.width!==1200||photo.height!==1560||photo.type!=='image/png')throw Error('photo');
    await writeFile(`${out}/${id}-photo.png`,Buffer.from(photo.bytes));themes.push({id,photoBytes:photo.bytes.length});
    await p.locator('[data-action="close"]').click();
  }
  await p.locator('.bottom-nav [data-action="nights"]').click();await p.locator('button[data-effect="none"]').click();
  if(await p.locator('#app').getAttribute('data-effect')!=='none')throw Error('reset');
  await p.locator('.bottom-nav [data-action="nights"]').click();await p.locator('button[data-effect="moonlight"]').click();
  await p.evaluate(now=>{Date.now=()=>now+7*86400000+1;document.dispatchEvent(new Event('visibilitychange'))},now);
  if(await p.locator('#app').getAttribute('data-effect')!=='none')throw Error('expiry did not revoke');
  await p.locator('.bottom-nav [data-action="nights"]').click();
  if(!await p.locator('.night-list').innerText().then(s=>s.includes('이용 기간이 끝났어요.')))throw Error('expiry message');
  if(errors.length)throw Error(JSON.stringify(errors));
  await writeFile(`${out}/results.json`,JSON.stringify({layouts,themes,errors},null,2));console.log(JSON.stringify({layouts,themes,errors}));
}finally{await b.close()}
