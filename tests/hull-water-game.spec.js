import {test,expect} from '@playwright/test';
test('live fleet keeps hull water masks through garage, cameras, reflections and quality changes',async({page})=>{
 test.setTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({vehicle:'angler',quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'})));
 await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:90000});
 for(const type of ['angler','tinny','dinghy','skua','cat','ski','seago','racer','cruiser','dive','rib']){
  await page.locator(`[data-vehicle="${type}"]`).click();await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>__ESTUARY__.status.graphics.waterMaskVolumes)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>__ESTUARY__.status.vehicle)).toBe(type);await page.keyboard.press('KeyP');await page.keyboard.press('KeyP');await page.screenshot({path:`test-results/dry-fleet-${type}.png`});
  await page.keyboard.press('Escape');await page.locator('#garage').click();
 }
 await page.locator('[data-vehicle="angler"]').click();await page.locator('#play').click();await page.keyboard.press('Escape');await page.locator('#quality').selectOption('Medium');await page.locator('#resume').click();await expect.poll(()=>page.evaluate(()=>__ESTUARY__.status.graphics.reflectionCaptures),{timeout:30000}).toBeGreaterThan(0);await page.screenshot({path:'test-results/310-wasp-ocean-interior-medium.png'});
 await page.keyboard.press('Escape');await page.locator('#quality').selectOption('High');await page.locator('#resume').click();await expect.poll(()=>page.evaluate(()=>__ESTUARY__.status.quality)).toBe('High');await page.screenshot({path:'test-results/310-wasp-ocean-interior-high.png'});expect(errors).toEqual([]);
});
