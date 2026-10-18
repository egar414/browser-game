import{test,expect}from'@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('phone can drive the sportfisher, leave the helm, walk and cast from its deck',async({browser})=>{
 test.setTimeout(240000);const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true})));await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:60000});await p.locator('[data-vehicle="cruiser"]').tap();await p.locator('#play').tap();
  const cdp=await context.newCDPSession(p),hold=async code=>{const b=await p.locator(`[data-code="${code}"]`).boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});},release=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await hold('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:30000}).toBeGreaterThan(3);await release();await p.locator('[data-code="KeyJ"]').tap();expect((await status(p)).deck.active).toBe(false);
  await p.screenshot({path:'test-results/sportfisher-helm-phone.png'});
  await p.locator('[data-code="KeyR"]').tap();await p.locator('[data-code="KeyJ"]').tap();expect((await status(p)).deck.active).toBe(true);const start=(await status(p)).deck;await hold('KeyW');await expect.poll(async()=>(await status(p)).deck.z,{timeout:15000}).toBeGreaterThan(start.z+.3);await release();expect((await status(p)).speed).toBeLessThan(.1);
  await p.locator('#menu-button').tap();await p.locator('#visit-fishing').tap();await p.locator('[data-code="KeyJ"]').tap();await p.locator('[data-code="KeyK"]').tap();await expect.poll(async()=>(await status(p)).fishing.active,{timeout:5000}).toBe(true);await p.screenshot({path:'test-results/sportfisher-deck-phone.png'});
  await p.locator('#menu-button').tap();const paused=await status(p);await p.waitForTimeout(350);expect((await status(p)).simulationTime).toBe(paused.simulationTime);await p.locator('#resume').tap();await p.locator('[data-code="KeyJ"]').tap();expect((await status(p)).deck.active).toBe(false);expect((await status(p)).fishing.active).toBe(false);expect(errors).toEqual([]);
 }finally{await context.close();}
});
