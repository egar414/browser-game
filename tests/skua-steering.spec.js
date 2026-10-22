import{test,expect}from'@playwright/test';
test('cat and larger boats respond to the Skua-inspired steering through keyboard play',async({page:p})=>{
 test.setTimeout(240000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({vehicle:'cat',quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day',camera:3})));await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:60000});await p.locator('#play').click();
 for(const type of['cat','cruiser']){
 if(type==='cruiser'){await p.keyboard.press('Escape');await p.locator('#garage').click();await p.locator('[data-vehicle="cruiser"]').click();await p.locator('#play').click();}
 await p.keyboard.press('Escape');await p.locator('#visit-speedrun').click();await p.keyboard.down('KeyW');await expect.poll(()=>p.evaluate(()=>window.__ESTUARY__.status.speed),{timeout:60000}).toBeGreaterThan(type==='cat'?15:7);const before=await p.evaluate(()=>window.__ESTUARY__.status);await p.keyboard.down('KeyD');await p.waitForFunction(t=>window.__ESTUARY__.status.simulationTime>t+2,before.simulationTime);await p.keyboard.up('KeyD');const released=await p.evaluate(()=>window.__ESTUARY__.status);expect(Math.abs(released.heading-before.heading)).toBeGreaterThan(.85);await p.waitForFunction(t=>window.__ESTUARY__.status.simulationTime>t+.5,released.simulationTime);const after=await p.evaluate(()=>window.__ESTUARY__.status);expect(Math.abs(after.heading-released.heading)).toBeLessThan(.06);expect(after.wipeout).toBe(0);await p.screenshot({path:`test-results/${type}-skua-steering.png`});await p.keyboard.up('KeyW');
 }
 expect(errors).toEqual([]);
});
