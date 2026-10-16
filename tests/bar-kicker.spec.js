import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('gold bar kicker gives a real takeoff and a banked landing through normal controls',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:960,height:640});await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({oceanVersion:1,quality:'Low',muted:true,seaState:'swell'})));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);await page.locator('#play').click();await page.keyboard.press('Escape');await page.locator('#visit-bar').click();
 expect((await status(page)).position.x).toBeLessThan(800);await page.keyboard.down('KeyW');
 await expect.poll(async()=>{const s=await status(page);return s.airborne&&!s.waveLaunch&&s.position.z> -1650&&s.position.z< -1580;},{timeout:140000}).toBe(true);
 const takeoff=await status(page);await page.screenshot({path:'test-results/bar-kicker-takeoff.png'});await page.keyboard.up('KeyW');
 await expect.poll(async()=>(await status(page)).airborne,{timeout:30000}).toBe(false);await expect.poll(async()=>(await status(page)).score,{timeout:10000}).toBeGreaterThan(takeoff.score);
 const end=await status(page);expect(end.wipeout).toBe(0);expect(end.position.z).toBeGreaterThan(-1640);expect(errors).toEqual([]);await page.screenshot({path:'test-results/bar-kicker-landed.png'});
});
