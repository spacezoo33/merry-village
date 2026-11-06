// Optional BASELINE_MASKS_JSON points to captured pre-change mask URLs, never app state.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.VALIDATION_DIR??'/tmp/merry-shadow-verified',base=process.env.VALIDATION_URL??'http://127.0.0.1:4180';
const baseline=process.env.BASELINE_MASKS_JSON?JSON.parse(await readFile(process.env.BASELINE_MASKS_JSON,'utf8')):null;
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const errors=[],results=[];
try{
 for(const width of [320,375,430]){
  const p=await browser.newPage({viewport:{width,height:812},deviceScaleFactor:2});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(base);await p.locator('.basic-lights').waitFor();
  for(const id of ['christmas-bell-house','snowman-forest-house']){
   if(id!=='christmas-bell-house'){await p.locator('.bottom-nav [data-action="villages"]').click();await p.locator(`[data-village="${id}"]`).click();await p.locator(`#app[data-village="${id}"]`).waitFor()}
   await p.locator('.product-plate').evaluate(i=>i.decode());await p.waitForTimeout(250);
   const rect=await p.locator('.product-plate').evaluate(i=>{const r=i.getBoundingClientRect(),s=getComputedStyle(i);if(s.filter!=='none'||s.opacity!=='1')throw Error('unexpected CSS shadow/opacity');return{x:r.x,y:r.y,width:r.width,height:r.height}});
   const current=await p.locator('.product-plate').evaluate(i=>i.style.maskImage);
   const crop={x:rect.x+rect.width*270/1199,y:rect.y+rect.height*125/1312,width:rect.width*680/1199,height:rect.height*500/1312};
   if(baseline){await p.locator('.product-plate').evaluate((i,url)=>i.style.maskImage=`url("${url}")`,baseline[id].before);await p.screenshot({path:`${out}/${width}-${id}-before.png`});await p.screenshot({path:`${out}/${width}-${id}-roof-before.png`,clip:crop});await p.locator('.product-plate').evaluate((i,value)=>i.style.maskImage=value,current)}
   await p.screenshot({path:`${out}/${width}-${id}-after.png`});await p.screenshot({path:`${out}/${width}-${id}-roof-after.png`,clip:crop});
   const sameRect=await p.locator('.product-plate').evaluate(i=>{const r=i.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}});assert.deepEqual(sameRect,rect);assert.ok(rect.x>=-.1&&rect.x+rect.width<=width+.1);
   let pixels=null;
   if(baseline&&width===375){pixels=await p.locator('.product-plate').evaluate(async(i,oldSource)=>{
    async function mask(src){const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=1199;c.height=1312;c.getContext('2d').drawImage(im,0,0,1199,1312);return c.getContext('2d').getImageData(0,0,1199,1312).data}
    const nowSource=i.style.maskImage.slice(5,-2);const[before,after,rgb]=await Promise.all([mask(oldSource),mask(nowSource),mask(i.src)]);let bottomDelta=0,darkRemoved=0;
    for(let j=0;j<1199*1312;j++){const n=j*4,y=Math.floor(j/1199);if(y>=850)bottomDelta=Math.max(bottomDelta,Math.abs(before[n+3]-after[n+3]));if(y<800&&before[n+3]-after[n+3]>80&&Math.max(rgb[n],rgb[n+1],rgb[n+2])<140)darkRemoved++}
    if(bottomDelta>1||darkRemoved<1000)throw Error('floor changed or dark fringe remains');return{bottomDelta,darkRemoved};
   },baseline[id].before)}
   assert.equal(await p.locator('.hero .snowfall i').count(),180);
   results.push({width,id,rect,pixels});
  }await p.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser.close()}
