import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('four police craft can be found, start a visible pursuit, and wide camera, pause and recovery work',async({page:p})=>{
 test.setTimeout(180000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,dayMode:'day'})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('#play').click();
 expect((await status(p)).police.units).toHaveLength(4);
 await p.keyboard.press('Escape');await p.locator('#meet-police').click();
 await expect.poll(async()=>(await status(p)).police.remaining,{timeout:45000}).toBeGreaterThan(45);
 await expect(p.locator('#world-alert')).toContainText('POLICE PURSUIT');
 await p.screenshot({path:'test-results/police-pursuit.png'});
 await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:40000}).toBeGreaterThan(4);await p.keyboard.up('KeyW');
 await p.keyboard.press('KeyC');await p.keyboard.press('KeyR');await expect.poll(async()=>(await status(p)).wipeout).toBe(0);
 expect(errors).toEqual([]);
});
