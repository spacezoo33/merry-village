// Disposable browser receipts exercise existing paid scenes; production reward paths are never mocked.
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.VALIDATION_DIR??'/tmp/merry-photo-validation',base=process.env.VALIDATION_URL??'http://127.0.0.1:4180';
await mkdir(`${out}/actors`,{recursive:true});const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const ids=['christmas-bell-house','snowman-forest-house','cozy','forest','chapel','palace','gingerbread','aurora-lake','observatory'],errors=[],results=[];
async function setup(p,receipts=true){
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.addInitScript(({ids,receipts})=>{
  if(receipts){const now=Date.now();localStorage.setItem('merry-village:v2',JSON.stringify({village:'christmas-bell-house',snow:true,villagePasses:Object.fromEntries(ids.slice(2).map(id=>[id,{source:'rewarded',grantedAt:now-1000,expiresAt:now-1000+604800000}]))}))}
  window.photoProbe={events:[],glows:[],basicGlows:[],pose:null,actorUrl:null,clickPose:null};
  const image=CanvasRenderingContext2D.prototype.drawImage,fill=CanvasRenderingContext2D.prototype.fillRect,clear=CanvasRenderingContext2D.prototype.clearRect,blob=HTMLCanvasElement.prototype.toBlob;
  CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.className==='basic-lights')window.photoProbe.basicGlows=[];return clear.apply(this,a)};
  CanvasRenderingContext2D.prototype.drawImage=function(source,...a){
   const q=window.photoProbe;
   if(this.canvas.width===1200&&this.canvas.height===1200&&source instanceof HTMLCanvasElement&&source!==this.canvas){q.pose={...document.querySelector('.actor-stage')?.dataset}}
   if(this.canvas.width===1200&&this.canvas.height===1560){
    let kind=source instanceof HTMLImageElement?(source.src.includes('christmas-room')?'background':'village'):source.width===1200?'actors':'masked-basic';
    if(kind==='background'){q.events=[];q.glows=[];q.actorUrl=null}
    q.events.push({type:'image',kind,args:a});if(kind==='actors')q.actorUrl=source.toDataURL();
   }return image.call(this,source,...a);
  };
  CanvasRenderingContext2D.prototype.fillRect=function(...a){
   const q=window.photoProbe;
   if(this.globalCompositeOperation==='lighter'){
    if(this.canvas.className==='basic-lights')q.basicGlows.push(this.globalAlpha);
    if(this.canvas.width===1200&&this.canvas.height===1560)q.glows.push(this.globalAlpha);
   }
   if(this.canvas.width===1200&&this.canvas.height===1560&&this.globalCompositeOperation==='source-over'&&a[2]<30&&a[3]<30)q.events.push({type:'snow'});
   return fill.apply(this,a);
  };
  HTMLCanvasElement.prototype.toBlob=function(...a){if(this.width===1200&&this.height===1560)window.photoProbe.exported={events:[...window.photoProbe.events],glows:[...window.photoProbe.glows],pose:window.photoProbe.pose};return blob.apply(this,a)};
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="photo"],[data-action="retake"]'))window.photoProbe.clickPose={...document.querySelector('.actor-stage')?.dataset}},true);
 },{ids,receipts});
}
async function capture(p,id,suffix=''){
 if(ids.indexOf(id)>1){
  // Click in the same render frame as a visible train, avoiding automation tap/scroll delays.
  await p.evaluate(()=>new Promise((resolve,reject)=>{
   const start=performance.now();function shutter(){const stage=document.querySelector('.actor-stage');const a=Number(stage?.dataset.trainAngle)%(Math.PI*2);
    if(a>1.65&&a<2.5){document.querySelector('.bottom-nav [data-action="photo"]').click();resolve();return}
    if(performance.now()-start>30000){reject(Error('visible train shutter timeout'));return}requestAnimationFrame(shutter)
   }shutter();
  }));
 }else await p.locator('.bottom-nav [data-action="photo"]').click();const image=p.locator('.photo-preview img');await image.waitFor({timeout:90000});
 const meta=await image.evaluate(async i=>{await i.decode();const blob=await fetch(i.src).then(r=>r.blob());return{width:i.naturalWidth,height:i.naturalHeight,mime:blob.type,bytes:blob.size}});
 assert.equal(meta.width,1200);assert.equal(meta.height,1560);assert.equal(meta.mime,'image/png');
 const data=await p.evaluate(()=>{
  const q=window.photoProbe,stage=document.querySelector('.actor-stage');
  const expected=stage?[...document.querySelectorAll('.architectural-lights .decor-bulb')].map(l=>Math.min(1,Number(l.querySelector('.bulb-flare').style.opacity))).filter(v=>v>0):q.basicGlows;
  return{exported:q.exported,expected,actorUrl:q.actorUrl,clickPose:q.clickPose,finalPose:stage?{...stage.dataset}:null,quality:document.querySelector('#app').dataset.snowQuality};
 });
 assert.equal(data.exported.glows.length,data.expected.length,'photo light layer missing');for(let j=0;j<data.expected.length;j++)assert.ok(Math.abs(data.exported.glows[j]-data.expected[j])<.00002,'glare differs from frozen preview');
 const events=data.exported.events,actor=events.findIndex(e=>e.kind==='actors');
 if(id!=='christmas-bell-house'&&id!=='snowman-forest-house'){
  assert.ok(actor>=0);assert.equal(data.exported.pose.elapsed,data.finalPose.elapsed);assert.equal(data.exported.pose.trainAngle,data.finalPose.trainAngle);assert.equal(data.exported.pose.treeAngle,data.finalPose.treeAngle);
  assert.ok(Math.abs(Number(data.clickPose.elapsed)-Number(data.exported.pose.elapsed))<.08,'train moved during shutter');
  const counts={high:120,medium:90,low:72};assert.equal(events.slice(actor+1).filter(e=>e.type==='snow').length,counts[data.quality],'mid/front snow behind actor');
  await writeFile(`${out}/actors/${id}${suffix}.png`,Buffer.from(data.actorUrl.split(',')[1],'base64'));
 }
 assert.ok(events.some(e=>e.kind==='background'));assert.ok(events.some(e=>e.kind==='village'||e.kind==='masked-basic'));
 const dl=p.waitForEvent('download');await p.locator('[data-action="save-photo"]').click();const download=await dl;assert.equal(await download.failure(),null);assert.equal(download.suggestedFilename(),`merry-village-${id}.png`);
 const path=`${out}/${id}${suffix}.png`;await download.saveAs(path);assert.equal((await stat(path)).size,meta.bytes);
 const header=await readFile(path);assert.equal(header.readUInt32BE(16),1200);assert.equal(header.readUInt32BE(20),1560);
 const entry={id,suffix,...meta,download:true,lightsMatch:true,uiExcluded:true,events:events.filter(e=>e.type==='image'),trainPose:data.finalPose?{elapsed:data.finalPose.elapsed,angle:data.finalPose.trainAngle}:null,quality:data.quality};results.push(entry);
 await p.locator('[data-action="close"]').click();
}
try{
 const p=await b.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:2});await setup(p);await p.goto(base);await p.locator('.basic-lights').waitFor();
 for(const id of (process.env.PHOTO_IDS?.split(",").filter(id=>ids.includes(id))??ids)){
  if(id!==ids[0]){await p.locator('.bottom-nav [data-action="villages"]').click();await p.locator(`[data-village="${id}"]`).click();await p.locator(`#app[data-village="${id}"]`).waitFor()}
  if(ids.indexOf(id)>1){await p.locator('.actor-stage[data-ready="true"]').waitFor();await p.waitForFunction(()=>{const a=Number(document.querySelector('.actor-stage').dataset.trainAngle)%(Math.PI*2);return a>1.65&&a<2.5},null,{timeout:30000})}
  await capture(p,id);
 }
 const sharing=await p.evaluate(()=>({share:typeof navigator.share,canShare:typeof navigator.canShare}));await p.close();
 const reduced=await b.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await setup(reduced,false);await reduced.goto(base);await reduced.locator('.basic-lights').waitFor();
 for(const id of ids.slice(0,2)){
  if(id!==ids[0]){await reduced.locator('.bottom-nav [data-action="villages"]').click();await reduced.locator(`[data-village="${id}"]`).click();await reduced.locator(`#app[data-village="${id}"]`).waitFor()}
  for(const pattern of ['gentle','twinkle']){if(await reduced.locator('#lights-toggle').getAttribute('data-pattern')!==pattern)await reduced.locator('#lights-toggle').click();await capture(reduced,id,'-reduced-motion-'+pattern)}
 }await reduced.close();
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({results,sharing,errors},null,2));console.log(JSON.stringify({results,sharing,errors}));
}finally{await b.close()}
