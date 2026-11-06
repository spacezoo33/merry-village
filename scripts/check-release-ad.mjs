// Release-only contract check. SDK callbacks are isolated test doubles; no live ad
// is shown and no operational receipt/storage is created by this script.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import ts from 'typescript';
import {AppsInTossBundle} from '@apps-in-toss/ait-format';
import {defaults,grantVillagePass,PASS_MS} from '../src/state.ts';
const expected='ait.v2.live.2de9ae7ff9e24e94';
const packed=AppsInTossBundle.reader(await readFile('merry-village.ait'));
assert.equal(packed.appName,'merry-village');
const config=JSON.parse(Buffer.from(await packed.readEntry('sources/runtime-config.json')).toString());
assert.equal(config.rewardedAdGroupId,expected);
assert.deepEqual(config,JSON.parse(await readFile('public/runtime-config.json','utf8')));
const source=(await readFile('src/native.ts','utf8'))
 .replace('from "./ad-session"',`from ${JSON.stringify(pathToFileURL(resolve('src/ad-session.ts')).href)}`)
 .replaceAll('import.meta.env.DEV','false')
 .replaceAll('await import("@apps-in-toss/web-framework")','await Promise.resolve(globalThis.__releaseSdkContract)');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText;
const calls=[];let reward=true;const now=Date.now();
const supported=fn=>Object.assign(fn,{isSupported:()=>true});
const sdk={
 Environment:{environment:'toss',getServerTime:supported(async()=>now)},
 loadFullScreenAd:supported(({options,onEvent})=>{calls.push({method:'loadFullScreenAd',adGroupId:options.adGroupId});queueMicrotask(()=>onEvent({type:'loaded'}));return()=>{}}),
 showFullScreenAd:supported(({options,onEvent})=>{calls.push({method:'showFullScreenAd',adGroupId:options.adGroupId});queueMicrotask(()=>{if(reward)onEvent({type:'userEarnedReward'});onEvent({type:'dismissed'})});return()=>{}}),
};
const previous={fetch:globalThis.fetch,document:globalThis.document};
try{
 globalThis.__releaseSdkContract=sdk;
 globalThis.document={baseURI:'https://release-contract.invalid/'};
 globalThis.fetch=async url=>{assert.equal(new URL(url).pathname,'/runtime-config.json');return new Response(JSON.stringify(config),{status:200})};
 const native=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const available=await native.adAvailability();assert.equal(available.ready,true);assert.equal(available.groupId,expected);
 const earned=await native.earnPass(available.groupId,()=>{});assert.equal(earned,true);
 const time=await native.serverTime();assert.equal(time,now);
 const p=defaults();assert.equal(grantVillagePass(p,'cozy',time,earned),true);assert.equal(p.villagePasses.cozy.expiresAt-time,PASS_MS);assert.equal(PASS_MS,604800000);
 reward=false;const cancelled=await native.earnPass(available.groupId,()=>{});assert.equal(cancelled,false);assert.equal(grantVillagePass(p,'forest',time,cancelled),false);
 assert.equal(Object.keys(p.villagePasses).length,1);
 assert.deepEqual(calls.map(c=>c.method),['loadFullScreenAd','showFullScreenAd','loadFullScreenAd','showFullScreenAd']);assert.ok(calls.every(c=>c.adGroupId===expected));
 console.log(JSON.stringify({mode:'isolated SDK contract; live Toss ad unverified',appName:packed.appName,adGroupId:expected,calls,earnedRewardSevenDays:PASS_MS,cancellationGrantsNothing:true},null,2));
}finally{globalThis.fetch=previous.fetch;if(previous.document===undefined)delete globalThis.document;else globalThis.document=previous.document;delete globalThis.__releaseSdkContract}
