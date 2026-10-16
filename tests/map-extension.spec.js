import{test,expect}from'@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('extended map: explore upstream, drive both outboards, preserve position and reach the bar',async({page})=>{
 test.setTimeout(240000);await page.setViewportSize({width:960,height:640});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,vehicle:'tinny',seaState:'calm',oceanVersion:1})));
 await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 const scene=(await status(page)).scenery;expect(scene.mappedBuildings).toBeGreaterThan(700);expect(scene.mappedBridges).toBeGreaterThan(25);expect(scene.mappedPools).toBeGreaterThan(40);
 await page.locator('#play').click();await page.keyboard.press('Escape');
 const map=await page.request.get('/estuary-map.svg');expect(map.status()).toBe(200);expect(await map.text()).toContain('UPSTREAM · WYUNA CANAL');
 await expect(page.locator('a[href="./estuary-map.svg"]')).toBeVisible();await page.locator('#visit-upstream').click();
 let s=await status(page);expect(s.position.z).toBeGreaterThan(2400);expect(s.position.z).toBeLessThan(2600);expect(s.state).toBe('playing');
 await page.screenshot({path:'/tmp/estuary-extension-upstream-game.png'});
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).speed,{timeout:45000}).toBeGreaterThan(8);await expect.poll(async()=>(await status(page)).position.z,{timeout:25000}).toBeLessThan(2480);await page.keyboard.up('KeyW');
 s=await status(page);expect(s.position.z).toBeLessThan(2480);expect(s.wipeout).toBe(0);await page.keyboard.press('Escape');const position=(await status(page)).position;
 await page.locator('#garage').click();await page.locator('[data-vehicle="cat"]').click();await page.locator('#play').click();s=await status(page);expect(s.position.x).toBeCloseTo(position.x,3);expect(s.position.z).toBeCloseTo(position.z,3);
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).speed,{timeout:45000}).toBeGreaterThan(8);await page.keyboard.up('KeyW');
 await page.keyboard.press('KeyH');await expect(page.locator('.move-guide')).toContainText('Explore upstream');await page.locator('#close-controls').click();
 await page.keyboard.press('Escape');await page.locator('#visit-bar').click();s=await status(page);expect(s.position.x).toBeCloseTo(625,1);expect(s.position.z).toBeCloseTo(-1770,1);
 await page.screenshot({path:'/tmp/estuary-extension-bar-game.png'});expect(errors).toEqual([]);console.log(JSON.stringify({scene,errors}));
});


test.describe('phone map extension',()=>{
 test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 test('upstream shortcut and touch driving remain usable in landscape',async({page})=>{
  test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({muted:true,vehicle:'tinny'})));
  await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);await page.locator('#play').tap();await page.locator('#menu-button').tap();await page.locator('#visit-upstream').tap();
  expect((await status(page)).position.z).toBeGreaterThan(2400);await expect(page.locator('.touch-controls')).toBeVisible();
  const session=await page.context().newCDPSession(page),r=await page.locator('[data-code="KeyW"]').boundingBox();
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});await expect.poll(async()=>(await status(page)).speed,{timeout:45000}).toBeGreaterThan(7);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.screenshot({path:'/tmp/estuary-extension-phone.png'});expect(errors).toEqual([]);
 });
});
