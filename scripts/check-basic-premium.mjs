// Browser-only fixtures exercise saved receipts, never production reward APIs.
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base=process.env.VALIDATION_URL??'http://127.0.0.1:4180',out=process.env.VALIDATION_DIR??'/tmp/merry-basic-premium';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[],results=[];
const premium=['cozy','forest','chapel','palace','gingerbread','aurora-lake','observatory'];
async function select(page,id){
 await page.locator('.bottom-nav [data-action="villages"]').click();
 await page.locator(`[data-village="${id}"]`).click();
 await page.locator(`#app[data-village="${id}"]`).waitFor();
 await page.locator('.product-plate').evaluate(i=>i.decode());
}
async function photo(page,name){
 await page.locator('.bottom-nav [data-action="photo"]').click();const im=page.locator('.photo-preview img');await im.waitFor({timeout:60000});
 const result=await im.evaluate(async i=>{await i.decode();const blob=await fetch(i.src).then(r=>r.blob());return{width:i.naturalWidth,height:i.naturalHeight,type:blob.type,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))}});
 assert.equal(result.width,1200);assert.equal(result.height,1560);assert.equal(result.type,'image/png');await writeFile(`${out}/${name}.png`,Buffer.from(result.bytes));
 const download=page.waitForEvent('download');await page.locator('[data-action="save-photo"]').click();const file=await download;
 assert.ok(file.suggestedFilename().endsWith('.png'));assert.equal(await file.failure(),null);
 await page.locator('[data-action="close"]').click();
}
async function layout(p){return p.evaluate(()=>{
 if(document.documentElement.scrollWidth>innerWidth)throw Error('horizontal scroll');
 for(const b of document.querySelectorAll('.scene-controls button,.bottom-nav button,.now-playing button')){
   if(!b.getClientRects().length)continue;const r=b.getBoundingClientRect();if(r.width<43.9||r.height<43.9)throw Error('touch area');
 }
 const stage=document.querySelector('#scene-host').getBoundingClientRect();if(stage.x<0||stage.right>innerWidth+.1)throw Error('clipped village');
 return{height:document.documentElement.scrollHeight,stageWidth:stage.width};
})}
try{
 for(const [width,height]of [[320,640],[375,812],[430,932],[430,640]]){
  const p=await browser.newPage({viewport:{width,height}});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await p.goto(base);await p.locator('.basic-lights').waitFor();await p.locator('.product-plate').evaluate(i=>i.decode());
  assert.equal(await p.locator('#app').getAttribute('data-village'),'christmas-bell-house');assert.equal(await p.locator('#motion-toggle').isVisible(),false);
  assert.equal(await p.locator('.bottom-nav button').count(),3);assert.equal(await p.locator('.actor-stage').count(),0);
  assert.equal(await p.locator('.transport:visible').count(),0);assert.equal(await p.locator('#song-name').textContent(),'고요한 밤');
  assert.equal(await p.locator('.hero .snowfall i').count(),180);
  const details=await layout(p);await p.screenshot({path:`${out}/${width}-${height}-bell.png`});
  const patterns=[];for(let i=0;i<3;i++){patterns.push(await p.locator('#lights-toggle').getAttribute('data-pattern'));await p.locator('#lights-toggle').click()}
  assert.deepEqual(patterns,['gentle','twinkle','gentle']);
  await p.locator('.bottom-nav [data-action="music"]').click();assert.equal(await p.locator('[data-track]').count(),1);await p.locator('[data-action="close"]').click();
  await p.locator('#snow-toggle').click();assert.equal(await p.locator('#app').evaluate(a=>a.classList.contains('snow-off')),true);await p.locator('#snow-toggle').click();
  await select(p,'snowman-forest-house');assert.equal(await p.locator('.actor-stage').count(),0);assert.equal(await p.locator('.hero .snowfall i').count(),180);
  await p.screenshot({path:`${out}/${width}-${height}-snowman.png`});
  await p.locator('.bottom-nav [data-action="villages"]').click();assert.equal(await p.locator('.village-card').count(),9);
  assert.ok(await p.locator('.hero .snowfall').evaluateAll(ls=>ls.every(l=>getComputedStyle(l).visibility==='hidden')));
  for(const grid of await p.locator('.village-grid').all())assert.equal((await grid.evaluate(g=>getComputedStyle(g).gridTemplateColumns)).split(' ').length,1);
  await p.locator('[data-village="cozy"]').click();await p.locator('[data-action="reward"]').waitFor();
  assert.equal(await p.locator('[data-action="reward"]').isDisabled(),true);assert.equal(await p.locator('#app').getAttribute('data-village'),'snowman-forest-house');
  assert.equal(await p.locator('.locked-village-preview img').count(),1);
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('merry-village:v2')));assert.deepEqual(saved.villagePasses,{});assert.equal(saved.track,'snow');
  await p.locator('[data-action="close"]').click();
  if(width===375){await photo(p,'basic-snowman-photo');await select(p,'christmas-bell-house');await photo(p,'basic-bell-photo')}
  results.push({width,height,...details,basicPatterns:patterns,lockedAdBlocked:true});await p.close();
 }
 // Saved, valid receipts only inside this disposable browser context. No mock production flag.
 const p=await browser.newPage({viewport:{width:375,height:812}});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.addInitScript(ids=>{
  const now=Date.now(),villagePasses=Object.fromEntries(ids.map(id=>[id,{source:'rewarded',grantedAt:now-1000,expiresAt:now-1000+604800000}]));
  localStorage.setItem('merry-village:v2',JSON.stringify({village:'cozy',track:'bethlehem',lightPattern:'gentle',villagePasses}));
 },premium);
 await p.goto(base);await p.locator('.actor-stage[data-ready="true"]').waitFor();assert.equal(await p.locator('#motion-toggle').isVisible(),true);
 assert.equal(await p.locator('.transport:visible').count(),2);assert.equal(await p.locator('#song-name').textContent(),'오 베들레헴 작은 골');
 await p.locator('.now-playing [data-action="next"]').click();assert.equal(await p.locator('#song-name').textContent(),'고요한 밤');
 await p.locator('.now-playing [data-action="previous"]').click();assert.equal(await p.locator('#song-name').textContent(),'오 베들레헴 작은 골');
 const pose = () => p.locator('.actor-stage').evaluate(s=>({elapsed:Number(s.dataset.elapsed),tree:s.dataset.treeAngle,train:s.dataset.trainAngle}));
 const before=await pose();await p.waitForTimeout(1200);const moving=await pose();assert.ok(moving.elapsed>before.elapsed);assert.notEqual(moving.tree,before.tree);assert.notEqual(moving.train,before.train);
 await p.locator('#motion-toggle').click();await p.waitForTimeout(100);const stopped=await pose();await p.waitForTimeout(500);assert.equal((await pose()).elapsed,stopped.elapsed);await p.locator('#motion-toggle').click();
 const seen=[];
 for(const id of premium){
  if(id!=='cozy')await select(p,id);await p.locator('.actor-stage[data-ready="true"]').waitFor();
  assert.equal(await p.locator('#app').getAttribute('data-village'),id);assert.equal(await p.locator('#song-name').textContent(),'오 베들레헴 작은 골');
  assert.equal(await p.locator('.hero .snowfall i').count(),180);await layout(p);
  if(id==='cozy'||id==='observatory')await p.screenshot({path:`${out}/premium-${id}.png`});seen.push(id);
 }
 const patterns=[];for(let i=0;i<4;i++){patterns.push(await p.locator('#lights-toggle').getAttribute('data-pattern'));await p.locator('#lights-toggle').click()}
 assert.equal(new Set(patterns).size,4);
 await p.locator('.bottom-nav [data-action="music"]').click();assert.equal(await p.locator('[data-track]').count(),5);await p.locator('[data-action="close"]').click();
 await photo(p,'premium-photo');await select(p,'christmas-bell-house');assert.equal(await p.locator('.actor-stage').count(),0);assert.equal(await p.locator('#song-name').textContent(),'고요한 밤');
 await select(p,'cozy');await p.locator('.actor-stage[data-ready="true"]').waitFor();assert.equal(await p.locator('.transport:visible').count(),2);
 // Moving the wall clock beyond expiry must safely revoke the active premium without reload.
 await p.evaluate(()=>{Date.now=()=>2000000000000});await p.waitForTimeout(1600);assert.equal(await p.locator('#app').getAttribute('data-village'),'christmas-bell-house');
 assert.equal(await p.locator('.actor-stage').count(),0);assert.equal(await p.locator('#song-name').textContent(),'고요한 밤');
 results.push({premiumVillages:seen,premiumPatterns:patterns,expiryFallback:true,photos:3});await p.close();
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser.close()}
