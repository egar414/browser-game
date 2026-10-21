import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status.surf);
test('development contact lab offers repeatable spawns and restart with real keyboard input',async({page:p})=>{
 test.setTimeout(180000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:60000});await p.locator('#play').click();await p.locator('#visit-surf-hud').click();await p.locator('#surf-debug summary').click();await p.locator('#surf-debug [data-contact]').check();await p.locator('#surf-debug [data-normal]').check();
 await p.locator('#surf-debug [data-spawn="barrel"]').click();expect((await status(p)).wave.section).toBe('BARREL');await p.keyboard.down('ShiftLeft');await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.keyboard.up('ShiftLeft');await p.screenshot({path:'test-results/surf-contact-barrel.png'});
 await p.keyboard.press('KeyR');await expect.poll(async()=>(await status(p)).mode).toBe('paddle');expect((await status(p)).wave.progress).toBeLessThan(30);expect((await status(p)).rideTime).toBe(0);
 await p.locator('#surf-debug [data-spawn="bottom"]').click();await p.keyboard.down('KeyA');await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.keyboard.up('KeyA');const s=await status(p);expect(s.contacts.length).toBe(3);expect(Number.isFinite(s.grip)).toBe(true);await p.screenshot({path:'test-results/surf-contact-bottom.png'});
 expect(errors).toEqual([]);
});
