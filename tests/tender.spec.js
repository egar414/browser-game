import{test,expect}from'@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('tender: reference hull, house pontoons, falling-spray flooding, pause and same-place swap',async({page})=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewportSize({width:960,height:640});await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,seaState:'calm',oceanVersion:1})));
 await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 await page.locator('[data-vehicle="tinny"]').click();await expect(page.locator('#vehicle-number')).toHaveText('03 / 03');await expect(page.locator('#vehicle-description')).toContainText('25 hp');await page.screenshot({path:'test-results/tender-garage.png'});
 await page.locator('#play').click();await page.keyboard.press('Escape');await page.locator('#visit-pontoons').click();
 let s=await status(page);expect(s.scenery.housePontoons).toBeGreaterThan(200);expect(s.moorings.length).toBeGreaterThan(s.scenery.housePontoons);expect(s.position.x).toBeGreaterThan(500);
 await page.screenshot({path:'test-results/tender-house-pontoons.png'});
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).speed,{timeout:45000}).toBeGreaterThan(7);
 const heading=(await status(page)).heading;await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyD');
 await expect.poll(async()=>heading-(await status(page)).heading,{timeout:25000,intervals:[150]}).toBeGreaterThan(.8);
 await page.keyboard.up('KeyD');await page.keyboard.up('ShiftLeft');await page.keyboard.up('KeyW');await page.screenshot({path:'test-results/tender-carve.png'});
 await expect.poll(async()=>Math.max(...(await status(page)).moorings.map(b=>b.water)),{timeout:45000}).toBeGreaterThan(0);
 await page.screenshot({path:'test-results/tender-soaked-mooring.png'});
 await page.keyboard.press('Escape');s=await status(page);const position=s.position,water=s.moorings.map(b=>b.water);await page.waitForTimeout(300);expect((await status(page)).moorings.map(b=>b.water)).toEqual(water);
 await page.locator('#garage').click();await page.locator('[data-vehicle="cat"]').click();await page.locator('#play').click();s=await status(page);expect(s.position.x).toBeCloseTo(position.x,3);expect(s.position.z).toBeCloseTo(position.z,3);expect(s.vehicle).toBe('cat');expect(Math.max(...s.moorings.map(b=>b.water))).toBeGreaterThan(0);
 const passages=await page.evaluate(async()=>{const {mapData}=await import('/src/systems/geography.js');const {collision}=await import('/src/systems/environment.js');const blocked=[];for(const c of [...mapData.channels,{name:'Race',points:mapData.race}])for(let i=1;i<c.points.length;i++){const a=c.points[i-1],b=c.points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4);for(let j=0;j<=n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n,hit=collision(x,z,2);if(hit)blocked.push({name:c.name,x,z,hit});}}return blocked;});expect(passages).toEqual([]);expect(errors).toEqual([]);
});

for(const type of ['tinny','cat'])test(`${type}: easy bow lift, sustained bouncing spray turn and controlled settling`,async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:844,height:540});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(type=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,seaState:'calm',oceanVersion:1,vehicle:type})),type);
 await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);await page.locator('#play').click();
 await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');
 await expect.poll(async()=>(await status(page)).pitch,{timeout:40000}).toBeGreaterThan(type==='tinny'?1.05:.90);
 expect((await status(page)).airborne).toBe(false);await page.screenshot({path:`test-results/${type}-easy-bow.png`});
 const heading=(await status(page)).heading;await page.keyboard.down('KeyA');await expect.poll(async()=>(await status(page)).heading-heading,{timeout:25000}).toBeGreaterThan(1.2);
 const observations=await page.evaluate(async()=>{
  const{waveHeight,TINNY_HANDLING,CAT_HANDLING,VEHICLES}=await import('/src/config.js'),type=window.__ESTUARY__.status.vehicle,tuning=type==='tinny'?TINNY_HANDLING:CAT_HANDLING,craft=VEHICLES[type],start=window.__ESTUARY__.status.simulationTime,samples=[];
  return new Promise(resolve=>{function record(){const s=window.__ESTUARY__.status,pivot=Math.sin(Math.max(0,s.pitch))*craft.length*tuning.sternSupport*Math.max(0,Math.min(1,(s.pitch-.18)/.4));samples.push({heave:s.position.y-waveHeight(s.position.x,s.position.z,s.simulationTime)-craft.rideHeight-pivot,pitch:s.pitch,air:s.airborne,wipe:s.wipeout,speed:s.speed});if(s.simulationTime-start>2.3)resolve(samples);else requestAnimationFrame(record);}record();});
 });
 const heave=observations.map(s=>s.heave),range=Math.max(...heave)-Math.min(...heave);expect(range).toBeGreaterThan(.12);expect(range).toBeLessThan(.8);expect(observations.every(s=>!s.air&&!s.wipe&&s.speed<(type==='tinny'?17:29))).toBe(true);
 await page.screenshot({path:`test-results/${type}-bouncing-spray.png`});await page.keyboard.up('KeyA');await page.keyboard.up('ShiftLeft');
 await expect.poll(async()=>Math.abs((await status(page)).pitch),{timeout:30000}).toBeLessThan(.25);await page.keyboard.up('KeyW');
 await page.screenshot({path:`test-results/${type}-settled.png`});expect(errors).toEqual([]);
});
