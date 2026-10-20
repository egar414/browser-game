import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('innocent launch is safe, nearby speeding starts pursuit and open-water escape ends it',async({page:p})=>{
 test.setTimeout(180000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,dayMode:'day',seaState:'calm',oceanVersion:1})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('#play').click();
 expect((await status(p)).police.units).toHaveLength(4);expect((await status(p)).police.remaining).toBe(0);
 await p.locator('#find-police-hud').click();expect((await status(p)).police.remaining).toBe(0);await p.screenshot({path:'test-results/innocent-police-patrol.png'});
 await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).police.targetId,{timeout:40000}).toBe('me');await p.keyboard.up('KeyW');await expect(p.locator('#world-alert')).toContainText('POLICE → YOU');await p.screenshot({path:'test-results/offence-police-pursuit.png'});
 await p.keyboard.press('Escape');await p.locator('#visit-speedrun').click();await expect.poll(async()=>(await status(p)).police.state,{timeout:20000}).toBe('search');
 await expect.poll(async()=>(await status(p)).police.remaining,{timeout:100000,intervals:[1000]}).toBe(0);expect((await status(p)).police.impound).toBe(0);expect(errors).toEqual([]);
});
test('impound blocks throttle and recovery for 30 seconds and survives a reload',async({page:p})=>{
 test.setTimeout(150000);const epoch=Date.UTC(2026,9,20,12);await p.clock.setFixedTime(epoch);await p.addInitScript(()=>{if(!sessionStorage.getItem('impound-seeded')){localStorage.setItem('estuary-rats-impound-until',String(Date.now()+30000));sessionStorage.setItem('impound-seeded','yes');}localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false}));});
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('#play').click();await expect(p.locator('#impound-panel')).toBeVisible();
 const start=(await status(p)).position;await p.keyboard.down('KeyW');await p.keyboard.press('KeyR');await p.keyboard.press('Escape');await p.locator('#visit-speedrun').click();
 expect((await status(p)).speed).toBe(0);expect((await status(p)).position.x).toBe(start.x);await p.screenshot({path:'test-results/thirty-second-impound.png'});await p.keyboard.up('KeyW');await p.reload();await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 expect((await status(p)).police.impound).toBeGreaterThan(0);await p.locator('#play').click();await p.clock.setFixedTime(epoch+29999);expect((await status(p)).police.impound).toBeGreaterThan(0);await p.clock.setFixedTime(epoch+30001);await expect.poll(async()=>(await status(p)).police.impound,{timeout:10000}).toBe(0);await expect(p.locator('#impound-panel')).toBeHidden();
 await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:25000}).toBeGreaterThan(3);await p.keyboard.up('KeyW');
});
