import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.VALIDATION_DIR??'/tmp/merry-basic-polish',base=process.env.VALIDATION_URL??'http://127.0.0.1:4180';
await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[],results=[];
try{
 for(const width of (process.env.VALIDATION_WIDTHS??"320,375,430").split(",").map(Number)){
  const p=await b.newPage({viewport:{width,height:812}});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.addInitScript(()=>{
   window.musicSources=new Set();
   const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
   AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>20)window.musicSources.add(this);return start.apply(this,args)};
   AudioBufferSourceNode.prototype.stop=function(...args){window.musicSources.delete(this);return stop.apply(this,args)};
  });
  await p.goto(base);await p.locator('.basic-lights').waitFor();await p.locator('.product-plate').evaluate(i=>i.decode());
  for(const id of ['christmas-bell-house','snowman-forest-house']){
   if(id!=='christmas-bell-house'){
    await p.locator('.bottom-nav [data-action="villages"]').click();await p.locator(`[data-village="${id}"]`).click();await p.locator(`#app[data-village="${id}"]`).waitFor();
   }
   const layout=await p.locator('.basic-stage').evaluate(s=>{
    const r=s.getBoundingClientRect(),host=s.parentElement.getBoundingClientRect(),i=s.querySelector('img'),style=getComputedStyle(i),controls=document.querySelector('.now-playing').getBoundingClientRect();
    if(r.left<-.1||r.right>innerWidth+.1||r.bottom>controls.top)throw Error('basic product clipped or overlapping player');
    if(getComputedStyle(s).borderRadius!=='0px'||style.maskSize!=='100% 100%'||style.maskImage==='none')throw Error('mask not applied');
    return{stageWidth:r.width,scaleVsBefore:r.width/(host.width*.88),maskSize:style.maskSize};
   });assert.ok(layout.scaleVsBefore>1.17&&layout.scaleVsBefore<1.19);
   const samples=[];
   for(const pattern of ['gentle','twinkle']){
    if(await p.locator('#lights-toggle').getAttribute('data-pattern')!==pattern)await p.locator('#lights-toggle').click();
    assert.equal(await p.locator('#lights-toggle span').innerText(),'조명');
    await p.waitForTimeout(950);
    const sample=await p.locator('.basic-lights').evaluate(c=>{
     const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0,sum=0;
     for(let n=3;n<data.length;n+=4){sum+=data[n];if(data[n]>20)pixels++}
     return{pixels,sum,width:c.width,height:c.height};
    });assert.ok(sample.pixels>400,'actual glare pixels missing');samples.push(sample);
    await p.screenshot({path:`${out}/${width}-${id}-${pattern}.png`});
   }
   assert.notEqual(samples[0].sum,samples[1].sum,'patterns produce identical light output');
   if(width===375){
    const songs=[];
    for(const [track,name]of [['snow','고요한 밤'],['starlight','징글벨']]){
     await p.locator('.bottom-nav [data-action="music"]').click();assert.equal(await p.locator('[data-track]').count(),2);await p.locator(`[data-track="${track}"]`).click();await p.locator('[data-action="close"]').click();
     const previousClock = await p.locator('#app').evaluate(a=>JSON.parse(a.dataset.audioMetrics??'null')?.clock??0);
     await p.waitForFunction(clock=>{const m=JSON.parse(document.querySelector('#app').dataset.audioMetrics??'null');return m?.clock>clock+.3&&m.stems.music.rms>.00001},previousClock);
     const audio=await p.evaluate(()=>({metrics:JSON.parse(document.querySelector('#app').dataset.audioMetrics),active:window.musicSources.size,loop:[...window.musicSources].every(s=>s.loop)}));
     assert.equal(audio.active,1);assert.equal(audio.loop,true);assert.equal(await p.locator('#song-name').textContent(),name);
     await p.locator('#progress').evaluate(e=>{e.value=String(Number(e.max)-.2);e.dispatchEvent(new Event('input',{bubbles:true}))});
     await p.waitForTimeout(1300);
     assert.equal(await p.locator('#song-name').textContent(),name);
     assert.ok(Number(await p.locator('#progress').inputValue())<3,'selected song did not wrap to its beginning');
     assert.equal(await p.evaluate(()=>window.musicSources.size),1);
     songs.push({name,rms:audio.metrics.stems.music.rms,loop:audio.loop});
    }
    await p.locator('.now-playing [data-action="next"]').click();assert.equal(await p.locator('#song-name').textContent(),'고요한 밤');await p.locator('.now-playing [data-action="previous"]').click();assert.equal(await p.locator('#song-name').textContent(),'징글벨');
    await p.locator('.bottom-nav [data-action="photo"]').click();const image=p.locator('.photo-preview img');await image.waitFor({timeout:60000});
    const photo=await image.evaluate(async i=>{await i.decode();return{w:i.naturalWidth,h:i.naturalHeight,bytes:Array.from(new Uint8Array(await fetch(i.src).then(r=>r.arrayBuffer())))}});assert.equal(photo.w,1200);assert.equal(photo.h,1560);await writeFile(`${out}/${id}-photo.png`,Buffer.from(photo.bytes));
    const dl=p.waitForEvent('download');await p.locator('[data-action="save-photo"]').click();assert.equal(await(await dl).failure(),null);await p.locator('[data-action="close"]').click();
    results.push({width,id,...layout,glare:samples,songs,photo:true});
   }else results.push({width,id,...layout,glare:samples});
   assert.equal(await p.locator('.hero .snowfall i').count(),180);await p.locator('#snow-toggle').click();assert.ok(await p.locator('#app').evaluate(a=>a.classList.contains('snow-off')));await p.locator('#snow-toggle').click();
  }await p.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await b.close()}
