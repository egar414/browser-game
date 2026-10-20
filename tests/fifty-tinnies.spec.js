import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('both photo-inspired 50 hp tinnies idle stern-low, womp into a shaft, carve spray and save',async({page:p})=>{
 test.setTimeout(300000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{if(!localStorage.getItem('estuary-rats-v1'))localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'}));});
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 for(const type of ['dinghy','skua']){
  await p.locator(`[data-vehicle="${type}"]`).click();await expect(p.locator('#vehicle-stats')).toContainText('50 hp');await p.locator('#play').click();
  await expect.poll(async()=>(await status(p)).pitch,{timeout:15000}).toBeGreaterThan(.065);await p.screenshot({path:`test-results/${type}-stern-low.png`});
  await p.keyboard.press('Escape');await p.locator('#visit-speedrun').click();
  await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:35000}).toBeGreaterThan(6);
  await p.keyboard.down('KeyI');await expect.poll(async()=>(await status(p)).womp?.ready,{timeout:20000}).toBe(true);
  await p.screenshot({path:`test-results/${type}-womping.png`});await p.keyboard.down('ShiftLeft');
  await expect.poll(async()=>(await status(p)).pitch,{timeout:30000}).toBeGreaterThan(.8);await p.keyboard.up('KeyI');
  const shaft=await status(p);expect(shaft.wipeout,shaft.wipeoutReason).toBe(0);expect(shaft.shaft.active).toBe(true);await p.screenshot({path:`test-results/${type}-shaft.png`});
  await p.keyboard.down('KeyD');await expect.poll(async()=>{const s=await status(p);return Math.max(s.spray.left,s.spray.right);},{timeout:20000}).toBeGreaterThan(.7);await p.screenshot({path:`test-results/${type}-big-spray.png`});
  await p.keyboard.up('KeyD');await p.keyboard.up('ShiftLeft');await p.keyboard.up('KeyW');await p.keyboard.press('KeyR');
  await p.keyboard.press('KeyP');await p.screenshot({path:`test-results/${type}-first-person.png`});await p.keyboard.press('KeyP');
  await p.keyboard.press('Escape');await p.locator('#garage').click();
 }
 await p.reload();await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);expect((await status(p)).vehicle).toBe('skua');expect(errors).toEqual([]);
});
test('landscape phone exposes a held WOMP control and clears it on blur',async({browser})=>{
 test.setTimeout(120000);const ctx=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await ctx.newPage();
 try{await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false})));await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('[data-vehicle="skua"]').click();await p.locator('#play').click();
 const womp=p.locator('.tinny-womp');await expect(womp).toBeVisible();const rect=await womp.boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(844);
 await womp.tap();await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect.poll(async()=>(await status(p)).state).toBe('paused');await p.screenshot({path:'test-results/skua-phone-controls.png'});
 }finally{await ctx.close();}
});
