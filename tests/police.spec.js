import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('four police craft can be found, start a visible pursuit, and wide camera, pause and recovery work',async({page:p})=>{
 test.setTimeout(180000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,dayMode:'day'})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('#play').click();
 expect((await status(p)).police.units).toHaveLength(4);
 await expect.poll(async()=>(await status(p)).police.units.filter(u=>u.visible&&u.onScreen).length,{timeout:20000}).toBeGreaterThanOrEqual(2);
 await expect(p.locator('#find-police-hud')).toBeVisible();await expect(p.locator('#watch-police-hud')).toBeVisible();await p.screenshot({path:'test-results/police-visible-at-launch.png'});
 await p.locator('#find-police-hud').click();
 await expect.poll(async()=>(await status(p)).police.remaining,{timeout:45000}).toBeGreaterThan(45);
 await expect(p.locator('#world-alert')).toContainText('POLICE → YOU');
 await p.screenshot({path:'test-results/police-pursuit.png'});
 await p.locator('#watch-police-hud').click();await expect.poll(async()=>(await status(p)).police.targetId,{timeout:20000}).not.toBe('me');await expect.poll(async()=>(await status(p)).police.units.filter(u=>u.visible&&u.onScreen).length).toBeGreaterThan(0);await expect.poll(async()=>(await status(p)).police.targetOnScreen,{timeout:15000}).toBe(true);const pursuitStart=(await status(p)).simulationTime;await p.waitForFunction(t=>window.__ESTUARY__.status.simulationTime>t+1,pursuitStart);await p.screenshot({path:'test-results/police-chasing-another-boater.png'});
 await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:40000}).toBeGreaterThan(4);await p.keyboard.up('KeyW');
 await p.keyboard.press('KeyC');await p.keyboard.press('KeyR');await expect.poll(async()=>(await status(p)).wipeout).toBe(0);
 expect(errors).toEqual([]);
});
