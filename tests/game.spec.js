import { test, expect } from '@playwright/test';
const status=page=>page.evaluate(()=>window.__ESTUARY__.status);
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true})));
  await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);
});
for(const type of ['ski','cat'])test(`${type}: choose, drive, spray, steer, brake, reverse and recover`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator(`[data-vehicle="${type}"]`).click();await page.locator('#play').click();
  expect((await status(page)).vehicle).toBe(type);
  await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).speed,{timeout:25000}).toBeGreaterThan(11);
  expect((await status(page)).liveParticles).toBeGreaterThan(0);
  const initial=(await status(page)).heading;
  await page.keyboard.down('KeyA');await page.keyboard.down('ShiftLeft');
  await expect.poll(async()=>Math.abs((await status(page)).heading-initial),{timeout:20000}).toBeGreaterThan(.65);
  expect(Math.abs((await status(page)).slip)).toBeGreaterThan(1);
  const spray=(await status(page)).spray;
  expect(spray.left).toBeGreaterThan(spray.right);
  expect(spray.wakeSamples).toBeGreaterThan(3);
  await page.keyboard.up('KeyA');await page.keyboard.up('ShiftLeft');await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyS');await expect.poll(async()=>(await status(page)).forwardSpeed,{timeout:50000}).toBeLessThan(-1);await page.keyboard.up('KeyS');
  await page.keyboard.press('KeyR');await expect.poll(async()=>(await status(page)).speed).toBeLessThan(.5);
  expect((await status(page)).liveParticles).toBe(0);
  expect((await status(page)).spray.wakeSamples).toBe(0);
  expect((await status(page)).position.y).toBeGreaterThan(-.6);expect(errors).toEqual([]);
  await page.screenshot({path:`test-results/${type}-driving.png`});
});
test('all graphics profiles render without errors and reflections switch safely',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:960,height:640});await page.locator('#play').click();
  for(const quality of ['Medium','High','Low']){
    await page.keyboard.press('Escape');await page.locator('#quality').selectOption(quality);await page.locator('#resume').click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const s=await status(page);expect(s.quality).toBe(quality);expect(s.spray.reflections).toBe(quality!=='Low');
    expect(s.state).toBe('playing');await page.screenshot({path:`test-results/graphics-${quality}.png`});
  }
  expect(errors).toEqual([]);
});
test('jet ski bow rider, pause, camera, settings, persistence, guide, resize and focus',async({page})=>{
  await page.locator('#play').click();await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');
  await expect.poll(async()=>(await status(page)).score,{timeout:30000}).toBeGreaterThan(0);
  await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
  await page.keyboard.press('KeyC');expect((await status(page)).settings.camera).toBe(1);
  await page.keyboard.press('Escape');expect((await status(page)).state).toBe('paused');
  const pos=(await status(page)).position;await page.waitForTimeout(400);expect((await status(page)).position).toEqual(pos);
  await page.locator('#quality').selectOption('Medium');expect((await status(page)).quality).toBe('Medium');
  await page.locator('#mute').click();expect((await status(page)).settings.muted).toBe(false);
  await page.locator('#garage').click();await page.locator('[data-vehicle="cat"]').click();await page.locator('#swatches button').nth(2).click();
  // The init script supplies first-launch defaults; remove it through a fresh page
  // in the same context to test the actual persisted record on reload.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('estuary-rats-v1')));expect(saved.vehicle).toBe('cat');expect(saved.colour).toBe(2);
  const reload=await page.context().newPage();await page.close();await reload.goto('/');await reload.waitForFunction(()=>window.__ESTUARY__?.status.ready);
  expect((await status(reload)).settings.vehicle).toBe('cat');expect((await status(reload)).settings.colour).toBe(2);
  await reload.locator('#play').click();await reload.keyboard.press('KeyH');await expect(reload.locator('#controls')).toBeVisible();await reload.locator('#close-controls').click();
  await reload.setViewportSize({width:900,height:600});await reload.keyboard.down('KeyW');await reload.evaluate(()=>window.dispatchEvent(new Event('blur')));
  expect((await status(reload)).state).toBe('paused');await reload.locator('#resume').click();await expect.poll(async()=>(await status(reload)).throttle).toBeLessThan(.01);
});
test('optional activities start, restart and remain separate from free roam',async({page})=>{
  await page.locator('#play').click();expect((await status(page)).race).toBeNull();
  await page.keyboard.press('KeyF');expect((await status(page)).race.index).toBe(0);
  await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).race.index,{timeout:45000}).toBe(1);await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyF');expect((await status(page)).race.started).toBe(false);
  await page.keyboard.press('KeyG');expect((await status(page)).race).toBeNull();expect((await status(page)).challenge.remaining).toBeGreaterThan(88);
  await page.keyboard.press('KeyR');const before=(await status(page)).score;await page.waitForTimeout(1500);expect((await status(page)).score).toBe(before);
  await page.keyboard.press('Escape');await page.locator('#free-roam').click();expect((await status(page)).challenge).toBeNull();expect((await status(page)).state).toBe('playing');
});
test('riding modes, extended trim and trim preference persist without held keys',async({page})=>{
  await page.locator('#play').click();await page.keyboard.press('KeyT');
  expect((await status(page)).rideMode).toBe('freestyle');
  await page.keyboard.down('KeyQ');await expect.poll(async()=>(await status(page)).trim,{timeout:20000}).toBeGreaterThan(12);await page.keyboard.up('KeyQ');
  const trim=(await status(page)).trim;await page.waitForTimeout(400);expect((await status(page)).trim).toBe(trim);
  await expect(page.locator('#trim-label')).toContainText('TRIM ');
  await page.keyboard.press('Escape');expect(await page.locator('#ride-mode').inputValue()).toBe('freestyle');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('estuary-rats-v1')));expect(saved.trimSki).toBe(trim);
  const reload=await page.context().newPage();await reload.goto('/');await reload.waitForFunction(()=>window.__ESTUARY__?.status.ready);
  expect((await status(reload)).rideMode).toBe('freestyle');expect((await status(reload)).trim).toBe(trim);await reload.close();
  await page.locator('#ride-mode').selectOption('cruise');expect((await status(page)).trim).toBe(trim);
  await page.locator('#resume').click();await page.keyboard.down('KeyE');await expect.poll(async()=>(await status(page)).trim).toBeLessThan(trim);await page.keyboard.up('KeyE');
});
test('Mooloolaba setting and Thundercat bow ride work with the normal keys',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('.location')).toContainText('MOOLOOLABA');
  await page.locator('[data-vehicle="cat"]').click();await page.locator('#play').click();
  await page.keyboard.down('KeyQ');await expect.poll(async()=>(await status(page)).trim,{timeout:20000}).toBeGreaterThan(5);await page.keyboard.up('KeyQ');
  await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');
  await expect.poll(async()=>(await status(page)).pitch,{timeout:30000}).toBeGreaterThan(.65);
  expect((await status(page)).airborne).toBe(false);
  await page.screenshot({path:'test-results/thundercat-bow-ride.png'});
  await expect.poll(async()=>(await status(page)).score,{timeout:30000}).toBeGreaterThan(0);
  await page.keyboard.up('ShiftLeft');await page.keyboard.up('KeyW');
  await expect.poll(async()=>(await status(page)).pitch,{timeout:15000}).toBeLessThan(.35);expect(errors).toEqual([]);
});
