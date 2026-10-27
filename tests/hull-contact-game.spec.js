import {test,expect} from '@playwright/test';
const status=page=>page.evaluate(()=>__ESTUARY__.status);
test('tinnies show a stern-heavy idle trim and throw contact spray from ordinary swell without WOMP or sharp steering',async({page})=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({vehicle:'dinghy',quality:'Low',muted:true,locals:false,seaState:'swell',oceanVersion:1,dayMode:'day'})));
 await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:90000});const rests={};
 for(const type of['dinghy','tinny','skua','angler']){
  await page.locator(`[data-vehicle="${type}"]`).click();await page.locator('#play').click();await expect.poll(async()=>(await status(page)).pitch,{timeout:12000}).toBeGreaterThan(.03);rests[type]=(await status(page)).pitch;
  await page.mouse.move(980,390);await page.mouse.down();await page.mouse.move(700,400,{steps:5});await page.screenshot({path:`test-results/${type}-loaded-resting-trim.png`});await page.mouse.up();
  if(type!=='angler'){await page.keyboard.press('Escape');await page.locator('#garage').click();}
 }
 expect(rests.dinghy).toBeGreaterThan(rests.angler+.1);expect(rests.tinny).toBeGreaterThan(rests.skua);
 await page.keyboard.press('Escape');await page.locator('#visit-speedrun').click();await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).speed,{timeout:45000}).toBeGreaterThan(8);
 await expect.poll(async()=>(await status(page)).bounce.hits,{timeout:45000}).toBeGreaterThan(0);await expect.poll(async()=>(await status(page)).spray.plumePackets,{timeout:30000}).toBeGreaterThan(0);const s=await status(page);expect(s.bounce.load).toBe(0);expect(s.spray.turnGate).toBe(0);expect(s.wipeout).toBe(0);
 await page.keyboard.down('KeyU');await page.screenshot({path:'test-results/wasp-natural-wave-impact-spray.png'});await page.keyboard.up('KeyU');await page.keyboard.up('KeyW');expect(errors).toEqual([]);
});
