import { test, expect } from '@playwright/test';
test.use({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const status=page=>page.evaluate(()=>window.__ESTUARY__.status);
async function touches(page){
  const session=await page.context().newCDPSession(page),points=new Map();
  const send=type=>session.send('Input.dispatchTouchEvent',{type,touchPoints:[...points.values()]});
  return {
    async down(id,code){const r=await page.locator(`.touch-controls [data-code="${code}"]`).boundingBox();points.set(id,{id,x:r.x+r.width/2,y:r.y+r.height/2,radiusX:3,radiusY:3,force:1});await send('touchStart');},
    async up(id){const point=points.get(id);points.delete(id);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]});},
    async cancel(){points.clear();await send('touchCancel');},
  };
}
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({muted:true})));
  await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);
});
for(const type of ['ski','cat','tinny'])test(`phone ${type}: native multi-touch drives, steers, brakes, reverses and recovers`,async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.locator(`[data-vehicle="${type}"]`).tap();await page.locator('#play').tap();
  expect((await status(page)).quality).toBe('Low');await expect(page.locator('.touch-controls')).toBeVisible();
  const touch=await touches(page);await touch.down(1,'KeyW');
  await expect.poll(async()=>(await status(page)).speed,{timeout:30000}).toBeGreaterThan(9);
  if(type==='ski')expect((await status(page)).spray.rearPlume).toBe(true);
  const heading=(await status(page)).heading;await touch.down(2,'KeyA');
  await expect.poll(async()=>(await status(page)).heading-heading,{timeout:20000}).toBeGreaterThan(.4);
  await expect(page.locator('[data-code="KeyW"]')).toHaveClass(/pressed/);
  await touch.up(2);await expect(page.locator('[data-code="KeyA"]')).not.toHaveClass(/pressed/);
  await expect(page.locator('[data-code="KeyW"]')).toHaveClass(/pressed/);
  expect((await status(page)).throttle).toBeGreaterThan(.8);
  await touch.up(1);await touch.down(3,'KeyS');
  await expect.poll(async()=>(await status(page)).forwardSpeed,{timeout:70000}).toBeLessThan(-.6);await touch.up(3);
  await page.locator('[data-code="ShiftLeft"]').tap();await expect(page.locator('[data-code="ShiftLeft"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-code="KeyR"]').tap();await expect(page.locator('[data-code="ShiftLeft"]')).toHaveAttribute('aria-pressed','false');
  await expect.poll(async()=>(await status(page)).speed).toBeLessThan(.5);expect(errors).toEqual([]);
  await page.screenshot({path:`test-results/phone-${type}-landscape.png`});
});
test('phone portrait, buttons, modes, trim, camera, pause, focus and rotation remain usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/phone-portrait-home.png'});
  await page.locator('#play').tap();await expect(page.locator('.rotate-hint')).toBeVisible();await page.locator('#keep-portrait').tap();
  const boxes=await page.locator('.touch-controls button[data-code], #touch-fullscreen').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const b of boxes){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThan(0);expect(b.x+b.w).toBeLessThanOrEqual(391);expect(b.y+b.h).toBeLessThanOrEqual(845);}
  await page.locator('[data-code="KeyT"]').tap();expect((await status(page)).rideMode).toBe('freestyle');
  const trim=(await status(page)).trim;await page.locator('[data-code="KeyQ"]').tap();await expect.poll(async()=>(await status(page)).trim).toBeGreaterThan(trim);
  const camera=(await status(page)).settings.camera;await page.locator('[data-code="KeyC"]').tap();expect((await status(page)).settings.camera).not.toBe(camera);
  await page.locator('[data-code="KeyH"]').tap();await expect(page.locator('.touch-help')).toBeVisible();await page.locator('#close-controls').tap();
  const touch=await touches(page);await touch.down(1,'KeyW');await touch.down(2,'KeyA');await touch.cancel();
  await expect(page.locator('[data-code="KeyW"]')).not.toHaveClass(/pressed/);await expect(page.locator('[data-code="KeyA"]')).not.toHaveClass(/pressed/);
  await page.locator('[data-code="ShiftLeft"]').tap();await touch.down(3,'KeyW');await page.locator('#menu-button').tap();
  expect((await status(page)).state).toBe('paused');await expect(page.locator('[data-code="ShiftLeft"]')).toHaveAttribute('aria-pressed','false');
  await page.locator('#resume').tap();await expect.poll(async()=>(await status(page)).throttle).toBeLessThan(.05);
  await touch.cancel();await touch.down(4,'KeyW');await page.setViewportSize({width:844,height:390});
  await expect(page.locator('[data-code="KeyW"]')).not.toHaveClass(/pressed/);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));expect((await status(page)).state).toBe('paused');
  await page.locator('#resume').tap();await page.locator('#race').tap();expect((await status(page)).race).not.toBeNull();
  await page.locator('#challenge').tap();expect((await status(page)).challenge).not.toBeNull();
  await page.screenshot({path:'test-results/phone-landscape-controls.png'});
});
