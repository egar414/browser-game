import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('swell overview reveals several advancing lines and returns to paddle, chase and first person',async({page:p})=>{
 test.setTimeout(180000);const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader error|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:60000});await p.locator('#play').click();await p.locator('#visit-surf-hud').click();await p.locator('#surf-swell').click();expect((await status(p)).surf.view).toBe(3);await p.screenshot({path:'test-results/surf-incoming-overview.png'});
 await p.keyboard.press('KeyC');expect((await status(p)).surf.view).toBe(0);await p.locator('#surf-lineup').click();await p.screenshot({path:'test-results/surf-paddle-incoming.png'});
 await p.keyboard.press('KeyC');await p.keyboard.press('KeyC');expect((await status(p)).surf.view).toBe(2);await p.screenshot({path:'test-results/surf-swell-first-person.png'});await p.locator('#surf-exit').click();expect((await status(p)).surf.active).toBe(false);expect(errors).toEqual([]);
});
