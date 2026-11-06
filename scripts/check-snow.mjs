import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.VALIDATION_URL ?? 'http://127.0.0.1:4180';
const out = process.env.VALIDATION_DIR ?? '/tmp/merry-powder';
await mkdir(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox','--enable-unsafe-swiftshader'] });
const results = [], errors = [];
try {
  for (const width of [320,375,430]) {
    const p = await b.newPage({ viewport: { width, height:812 } });
    p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base);await p.locator('#scene-host .actor-stage[data-ready="true"]').waitFor();
    const r = await p.evaluate(()=>{
      const labels=[];
      for(const [id,text] of [['motion','동작'],['lights','조명'],['snow','눈']]) {
        const b=document.querySelector(`#${id}-toggle`), s=b.querySelector('span'), style=getComputedStyle(s), box=s.getBoundingClientRect(), bounds=b.getBoundingClientRect(), icon=b.querySelector('svg').getBoundingClientRect();
        if(s.innerText.trim()!==text || Number.parseFloat(style.fontSize)<8 || box.height<=0 || box.width<=0 || box.bottom>bounds.bottom+.1 || box.top<icon.bottom-.1)throw Error(`invisible or clipped label ${id}`);
        if(bounds.width<44||bounds.height<44)throw Error('touch size');
        labels.push({text,fontSize:style.fontSize});
      }
      const grains=[...document.querySelectorAll('.hero .snowfall i')];
      if(grains.length!==139)throw Error('snow count');
      const sizes=grains.map(g=>parseFloat(getComputedStyle(g).width));
      if(Math.max(...sizes)>1.76||Math.min(...sizes)<1.34||Math.max(...sizes)/Math.min(...sizes)>1.31)throw Error('large grain');
      for(const g of grains){const s=getComputedStyle(g);if(s.boxShadow!=='none'||!/none|blur\(0.15px\)/.test(s.filter))throw Error('bokeh filter')}
      const a=document.querySelector('#app'), counts={};
      for(const quality of ['high','medium','low']){a.dataset.snowQuality=quality;counts[quality]=grains.filter(g=>getComputedStyle(g).display!=='none').length}
      if(counts.high!==139||counts.medium!==105||counts.low!==83)throw Error('adaptive counts');
      a.dataset.snowQuality='high';
      return{labels,counts,min:Math.min(...sizes),max:Math.max(...sizes)};
    });
    await p.screenshot({path:`${out}/${width}-powder.png`});
    const patterns=[];
    for(let i=0;i<4;i++){patterns.push(await p.locator('#lights-toggle').getAttribute('data-pattern'));await p.locator('#lights-toggle').click()}
    if(new Set(patterns).size!==4)throw Error('lighting cycle changed');
    await p.locator('#snow-toggle').click();
    if(!await p.locator('#app').evaluate(a=>a.classList.contains('snow-off')))throw Error('snow OFF');
    await p.locator('#snow-toggle').click();
    await p.locator('.bottom-nav [data-action="villages"]').click();
    if(await p.locator('#sheet .snowfall').count())throw Error('snow inside cards');
    if(!await p.locator('.hero .snowfall').evaluateAll(l=>l.every(e=>getComputedStyle(e).visibility==='hidden')))throw Error('snow over modal');
    await p.locator('.village-card[data-village="forest"]').click();
    if(await p.locator('.hero .snowfall i').count()!==139||await p.locator('#app').evaluate(a=>a.classList.contains('snow-off')))throw Error('village lost snow');
    if(width===375){
      await p.locator('.bottom-nav [data-action="photo"]').click();await p.locator('.photo-preview img').waitFor({timeout:60000});
      const photo=await p.locator('.photo-preview img').evaluate(async i=>{await i.decode();const b=await fetch(i.src).then(r=>r.blob());return{width:i.naturalWidth,height:i.naturalHeight,type:b.type,bytes:Array.from(new Uint8Array(await b.arrayBuffer()))}});
      if(photo.width!==1200||photo.height!==1560||photo.type!=='image/png')throw Error('photo export');
      await writeFile(`${out}/powder-photo.png`,Buffer.from(photo.bytes));
    }
    results.push({width,...r,lightingPatterns:patterns});await p.close();
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await b.close()}
