import{test,expect}from'@playwright/test';
test.use({viewport:{width:960,height:640}});
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
async function boot(p){
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,seaState:'calm',oceanVersion:1})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('#play').click();
}
test('free-roam locals move, receive jet-ski spray and pause without starting a battle',async({page:p})=>{
 test.setTimeout(180000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await boot(p);
 const first=await status(p);expect(first.locals.boats).toHaveLength(6);expect(first.battle.active).toBe(false);expect(first.race).toBeNull();
 await p.waitForFunction(()=>window.__ESTUARY__.status.simulationTime>5,null,{timeout:50000});
 const moved=await status(p);expect(moved.locals.boats[0].speed).toBeGreaterThan(1);
 await p.keyboard.press('Escape');const paused=(await status(p)).locals.boats;await p.waitForTimeout(350);expect((await status(p)).locals.boats).toEqual(paused);
 await p.locator('#meet-locals').click();const joined=await status(p);expect(joined.battle.active).toBe(false);expect(joined.locals.visible).toBeLessThanOrEqual(3);
 const nearest=joined.locals.boats.reduce((a,b)=>Math.hypot(a.x-joined.position.x,a.z-joined.position.z)<Math.hypot(b.x-joined.position.x,b.z-joined.position.z)?a:b);
 await p.keyboard.down('KeyW');
 await p.waitForFunction(id=>{const s=window.__ESTUARY__.status,b=s.locals.boats.find(b=>b.id===id);return(b.x-s.position.x)*Math.sin(s.heading)+(b.z-s.position.z)*Math.cos(s.heading)<5},nearest.id,{timeout:40000});
 const heading=(await status(p)).heading;await p.keyboard.down('ShiftLeft');await p.keyboard.down('KeyD');
 await p.waitForFunction(h=>h-window.__ESTUARY__.status.heading>.8,heading,{timeout:30000});await p.keyboard.up('KeyD');await p.keyboard.up('ShiftLeft');await p.keyboard.up('KeyW');
 await p.waitForFunction(()=>window.__ESTUARY__.status.locals.boats.some(b=>b.water>1),null,{timeout:30000});
 const soaked=await status(p);expect(soaked.battle.active).toBe(false);expect(soaked.wipeout).toBe(0);await p.screenshot({path:'test-results/free-roam-local-spray.png'});console.log('Desktop actual spray hit',soaked.locals.boats.map(b=>({name:b.name,water:b.water})));
 await p.keyboard.press('Escape');await p.locator('#locals').selectOption('off');await p.locator('#resume').click();await expect.poll(async()=>(await status(p)).locals.enabled).toBe(false);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('estuary-rats-v1')));expect(saved.locals).toBe(false);
 const reload=await p.context().newPage();await reload.goto('/');await reload.waitForFunction(()=>window.__ESTUARY__?.status.ready);expect((await status(reload)).settings.locals).toBe(false);await reload.close();await p.bringToFront();
 if((await status(p)).state==='playing')await p.keyboard.press('Escape');await p.locator('#meet-locals').click();await expect.poll(async()=>(await status(p)).locals.enabled).toBe(true);
 await p.keyboard.press('KeyF');await expect.poll(async()=>(await status(p)).locals.enabled,{timeout:30000}).toBe(false);expect((await status(p)).race).not.toBeNull();
 await p.keyboard.press('Escape');await p.locator('#free-roam').click();await expect.poll(async()=>(await status(p)).locals.enabled).toBe(true);expect(errors).toEqual([]);
});
test('phone can find locals, drive and carve with native simultaneous touch controls',async({browser})=>{
 test.setTimeout(180000);const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await boot(p);await p.locator('#menu-button').tap();await p.locator('#garage').tap();await p.locator('[data-vehicle="cat"]').tap();await p.locator('#play').tap();
  await p.locator('#menu-button').tap();await p.locator('#meet-locals').tap();const joined=await status(p);expect(joined.locals.enabled).toBe(true);expect(joined.battle.active).toBe(false);
  const cdp=await ctx.newCDPSession(p),point=async(id,code)=>{const b=await p.locator(`.touch-controls [data-code="${code}"]`).boundingBox();return{id,x:b.x+b.width/2,y:b.y+b.height/2}};
  const go=await point(1,'KeyW'),right=await point(2,'KeyD');await p.locator('[data-code="ShiftLeft"]').tap();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[go]});
  await p.waitForFunction(()=>window.__ESTUARY__.status.speed>7,null,{timeout:50000});const h=(await status(p)).heading;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[go,right]});
  await p.waitForFunction(h=>h-window.__ESTUARY__.status.heading>.5,h,{timeout:30000});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const s=await status(p);expect(s.quality).toBe('Low');expect(s.locals.visible).toBeLessThanOrEqual(3);expect(s.battle.active).toBe(false);expect(s.wipeout).toBe(0);await p.screenshot({path:'test-results/free-roam-locals-phone.png'});
  await p.locator('#menu-button').tap();await p.locator('#locals').selectOption('off');await p.locator('#resume').tap();await expect.poll(async()=>(await status(p)).locals.enabled).toBe(false);expect(errors).toEqual([]);
 }catch(e){console.log('Phone failure status',await status(p));throw e;}finally{await ctx.close();}
});
