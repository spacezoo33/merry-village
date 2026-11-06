import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { VILLAGES, BASIC_VILLAGES, ALL_VILLAGES } from '../src/catalog.ts';
import { defaults, canUseVillage, grantVillagePass, parsePreferences, reconcileAccess, PASS_MS } from '../src/state.ts';
import { AccessClock } from '../src/access-clock.ts';
import { basicLevel, nextBasicPattern, BASIC_LIGHTS } from '../src/basic-lights.ts';
test('all seven premium images and effect sources remain byte-identical to the pre-basic baseline', async()=>{
  const hashes=JSON.parse(await readFile(new URL('./fixtures/premium-preservation.json',import.meta.url),'utf8'));
  for(const [path,sha] of Object.entries(hashes)) assert.equal(createHash('sha256').update(await readFile(new URL('../'+path,import.meta.url))).digest('hex'),sha,path);
  assert.deepEqual(VILLAGES.map(v=>v.id),['cozy','forest','chapel','palace','gingerbread','aurora-lake','observatory']);
  assert.equal(ALL_VILLAGES.length,9); assert.ok(VILLAGES.every(v=>v.premium));
});
test('both basics are always free; all seven earned receipts stay independent and never stack',()=>{
  const p=defaults(), now=1800000000000;
  for(const v of BASIC_VILLAGES){assert.ok(canUseVillage(p,v.id,now));assert.equal(grantVillagePass(p,v.id,now,true),false)}
  for(const [i,v] of VILLAGES.entries()){
    assert.equal(canUseVillage(p,v.id,now+i*1000),false);
    assert.equal(grantVillagePass(p,v.id,now+i*1000,false),false);
    assert.equal(grantVillagePass(p,v.id,now+i*1000,true),true);
    const pass={...p.villagePasses[v.id]};
    assert.equal(grantVillagePass(p,v.id,now+i*1000+1,true),false);assert.deepEqual(p.villagePasses[v.id],pass);
  }
  const saved=parsePreferences(JSON.stringify(p));assert.deepEqual(saved.villagePasses,p.villagePasses);
  saved.village='cozy';saved.track='bethlehem';assert.ok(reconcileAccess(saved,now+PASS_MS));
  assert.equal(saved.village,'christmas-bell-house');assert.equal(saved.track,'snow');
  assert.equal(canUseVillage(saved,'forest',now+PASS_MS),true);
});
test('legacy nights never grant village access and are no longer applied',()=>{
  const p=defaults(),now=1800000000000;p.effect='aurora';p.nightPasses.aurora={source:'rewarded',grantedAt:now,expiresAt:now+PASS_MS};
  reconcileAccess(p,now);assert.equal(p.effect,null);for(const v of VILLAGES)assert.equal(canUseVillage(p,v.id,now),false);
});
test('server-anchored access time ignores device clock edits; fallback rejects rollback',()=>{
  let wall=10000,mono=100;const clock=new AccessClock(11000,()=>wall,()=>mono);
  assert.equal(clock.now(),11000);wall=1;assert.equal(clock.now(),11000);
  assert.ok(clock.sync(20000));mono+=500;wall=999999999;assert.equal(clock.now(),20500);
  mono+=1000;wall=0;assert.equal(clock.now(),21500);assert.equal(clock.sync(NaN),false);
  assert.ok(clock.sync(15000));assert.equal(clock.now(),21500,"late server replies cannot rewind a live session");
});
test('basic lights have exactly two gentle patterns and unique image-aligned coordinates',()=>{
  assert.equal(nextBasicPattern('gentle'),'twinkle');assert.equal(nextBasicPattern('twinkle'),'gentle');
  assert.notDeepEqual(BASIC_LIGHTS['christmas-bell-house'],BASIC_LIGHTS['snowman-forest-house']);
  for(const points of Object.values(BASIC_LIGHTS))for(const [x,y,r] of points){assert.ok(x>0&&x<1199&&y>0&&y<1312&&r<=36)}
  for(const pattern of ['gentle','twinkle'])for(let t=0;t<10;t+=.03){const v=basicLevel(pattern,t,3);assert.ok(v>=0&&v<=.7)}
});
test('uploaded basic PNGs remain byte-identical; only optimized display copies are added',async()=>{
 const hashes=JSON.parse(await readFile(new URL('./fixtures/basic-originals.json',import.meta.url),'utf8'));
 assert.equal(Object.keys(hashes).length,2);
 for(const [name,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL('../src/assets/basic/'+name,import.meta.url))).digest('hex'),hash);
});
