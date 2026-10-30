import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('uploaded Tender renders from multiple angles and drives with crew, shafting, spray and clear water masks',async({page:p})=>{
 test.setTimeout(240000);const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});
 await p.goto('/art/fleet-review.html');await p.waitForFunction(()=>window.fleetReview);const stats=await p.evaluate(()=>fleetReview.select('tinny'));expect(stats.triangles).toBeLessThan(30000);
 expect(await p.evaluate(()=>fleetReview.model.userData.referenceHull.userData.source)).toBe('single_color_261030100313_WUGV.stl');
 for(const view of['angle','top','side','rear']){await p.evaluate(v=>fleetReview.view(v),view);await p.screenshot({path:`test-results/uploaded-tender-${view}.png`});}
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({vehicle:'tinny',quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:90000});await p.locator('[data-vehicle="tinny"]').click();await p.locator('#play').click();await p.screenshot({path:'test-results/uploaded-tender-wharf.png'});expect((await status(p)).graphics.waterMaskVolumes).toBeGreaterThan(0);
 await p.keyboard.press('Escape');await p.locator('#visit-speedrun').click();await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:45000}).toBeGreaterThan(8);await p.screenshot({path:'test-results/uploaded-tender-cruising.png'});
 await p.keyboard.down('ShiftLeft');await expect.poll(async()=>(await status(p)).pitch,{timeout:25000}).toBeGreaterThan(.75);await p.screenshot({path:'test-results/uploaded-tender-shaft.png'});
 await p.keyboard.up('ShiftLeft');await p.keyboard.down('KeyD');await expect.poll(async()=>{const s=await status(p);return Math.max(s.spray.left,s.spray.right);},{timeout:30000}).toBeGreaterThan(.5);await p.screenshot({path:'test-results/uploaded-tender-turn.png'});
 for(const key of['KeyD','KeyW'])await p.keyboard.up(key);await p.keyboard.press('KeyR');await p.keyboard.down('KeyS');await expect.poll(async()=>(await status(p)).forwardSpeed,{timeout:25000}).toBeLessThan(-.5);await p.keyboard.up('KeyS');await p.keyboard.press('KeyR');await p.keyboard.press('KeyP');await p.keyboard.press('KeyP');await p.screenshot({path:'test-results/uploaded-tender-first-person.png'});expect(errors).toEqual([]);
});
