import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('reef water, curled lip and yacht render with all quality settings and survive pause',async({page:p})=>{
 test.setTimeout(240000);const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader error|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,seaState:'calm',dayMode:'day',oceanVersion:1})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:60000});await p.locator('#play').click();await p.locator('#visit-surf-hud').click();
 const meshes=[];for(const quality of ['Medium','High','Low']){await p.keyboard.press('Escape');await p.locator('#quality').selectOption(quality);await p.locator('#resume').click();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const s=await status(p);expect(s.quality).toBe(quality);expect(s.surf.active).toBe(true);meshes.push(s.surf.surfaceTriangles);await p.screenshot({path:`test-results/surf-quality-${quality}.png`});}
 expect(meshes[1]).toBeGreaterThan(meshes[0]);expect(meshes[0]).toBeGreaterThan(meshes[2]);expect(errors).toEqual([]);
});
