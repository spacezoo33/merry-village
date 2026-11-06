import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.VALIDATION_URL??'http://127.0.0.1:4180';
async function init(p){await p.addInitScript(()=>{const now=Date.now();localStorage.setItem('merry-village:v2',JSON.stringify({village:'cozy',villagePasses:{cozy:{source:'rewarded',grantedAt:now-1000,expiresAt:now-1000+604800000}}}))})}
async function rejected(p){await p.locator('.bottom-nav [data-action="photo"]').click();await p.locator('#toast.visible').waitFor();assert.equal(await p.locator('.photo-preview img').count(),0);assert.equal(await p.locator('[data-action="save-photo"]').isDisabled(),true);await p.locator('[data-action="close"]').click()}
const results=[];
for(const mode of ['no-webgl','empty-snapshot']){
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox',...(mode==='no-webgl'?['--disable-webgl']:['--enable-unsafe-swiftshader'])]});
 try{
  const p=await b.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});await init(p);
  if(mode==='empty-snapshot')await p.addInitScript(()=>{const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(this.canvas.width===1200&&this.canvas.height===1200&&source instanceof HTMLCanvasElement&&source.parentElement?.classList.contains('actor-stage'))return;return draw.call(this,source,...args)}});
  await p.goto(base);await p.locator('#village-title').filter({hasText:'포근한'}).waitFor();if(mode==='empty-snapshot')await p.locator('.actor-stage[data-ready="true"]').waitFor();
  await rejected(p);results.push({mode,incompletePNGBlocked:true});
  if(mode==='no-webgl'){
   await p.locator('.bottom-nav [data-action="villages"]').click();await p.locator('[data-village="christmas-bell-house"]').click();await p.locator('#app[data-tier="basic"]').waitFor();await p.locator('.bottom-nav [data-action="photo"]').click();const image=p.locator('.photo-preview img');await image.waitFor({timeout:60000});assert.deepEqual(await image.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[1200,1560]);const dl=p.waitForEvent('download');await p.locator('[data-action="save-photo"]').click();assert.equal(await(await dl).failure(),null);results.push({basicWithoutWebGL:'PNG generation and download passed'});
  }
 }finally{await b.close()}
}
console.log(JSON.stringify(results));
