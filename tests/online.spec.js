import {test,expect} from '@playwright/test';
const dev=process.env.DEV_BASE_URL||'http://127.0.0.1:5173';
test('account UI, two-client rendering, private invite separation and public return with the local service double',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewportSize({width:900,height:650});await page.goto(dev+'/tools/online-preview.html');await page.waitForFunction(()=>window.onlineInspection?.ready);
 await page.locator('#online-button').click();await page.locator('#online-email').fill('alice@example.test');await page.locator('#online-password').fill('wrong');await page.locator('#online-auth-submit').click();await expect(page.locator('#online-error')).toContainText('Could not sign in');
 await page.locator('#online-password').fill('test-password-123');await page.locator('#online-auth-submit').click();await expect(page.locator('#online-pilot')).toContainText('Alice');
 await page.waitForFunction(()=>window.onlineInspection.alice.count===2&&window.onlineInspection.remote.visible===1);await page.locator('#online-close').click();
 await page.screenshot({path:'test-results/online-two-clients.png'});await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.onlineInspection.position.z>3);await page.keyboard.up('KeyW');
 await page.locator('#online-button').click();await page.locator('#online-create').click();await expect(page.locator('#online-code')).toHaveText(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);await page.waitForFunction(()=>window.onlineInspection.alice.count===1&&window.onlineInspection.bob.count===1&&window.onlineInspection.remote.known===0);
 await page.screenshot({path:'test-results/online-private-code.png'});await page.locator('#online-close').click();await page.locator('#bob-join').click();await page.waitForFunction(()=>window.onlineInspection.alice.count===2&&window.onlineInspection.remote.visible===1);
 await page.locator('#online-button').click();await page.locator('#online-public').click();await page.waitForFunction(()=>window.onlineInspection.alice.world==='public'&&window.onlineInspection.alice.count===1);await page.locator('#online-signout').click();await expect(page.locator('#online-auth')).toBeVisible();
 await page.locator('#auth-signup-tab').click();await page.locator('#online-name').fill('Canal Rat');await page.locator('#online-email').fill('rat@example.test');await page.locator('#online-password').fill('test-password-123');await page.locator('#online-auth-submit').click();await expect(page.locator('#online-pilot')).toContainText('Canal Rat');
 await page.keyboard.press('Escape');await expect(page.locator('#online-panel')).toBeHidden();expect(errors).toEqual([]);
});
test('missing backend preserves the actual game launch and mobile account-panel layout',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true})));
 await page.setViewportSize({width:844,height:390});await page.goto(dev+'/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 await page.locator('#online-button').click();await expect(page.locator('#online-setup')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#online-panel')).toBeHidden();
 await page.locator('#play').click();expect(await page.evaluate(()=>window.__ESTUARY__.status.state)).toBe('playing');
 await page.locator('#online-button').click();expect(await page.evaluate(()=>window.__ESTUARY__.status.state)).toBe('paused');await page.screenshot({path:'test-results/online-mobile-panel.png'});await page.locator('#online-back').click();expect(await page.evaluate(()=>window.__ESTUARY__.status.state)).toBe('playing');expect(errors).toEqual([]);
});
test('full game connects two riders, shares water, switches rooms and restores offline settings',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewportSize({width:800,height:550});await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,seaState:'calm',oceanVersion:1})));
 // Intercept the development module only. The published game has no test hooks.
 await page.route('**/src/online/config.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 import {TestOnlineService} from '/tests/helpers/online-service-double.js';
 import {OnlineSession} from '/src/online/session.js';
 import {VehiclePhysics} from '/src/vehicles/physics.js';
 import {waveHeight} from '/src/config.js';
 const host=new TestOnlineService();host.addUser('11111111-1111-4111-8111-111111111111','alice@example.test','Alice');host.addUser('22222222-2222-4222-8222-222222222222','bob@example.test','Bob');
 const client=host.client('alice@example.test'),bob=new OnlineSession(host.client('bob@example.test')),v=new VehiclePhysics('cat');v.safe.x+=6;v.recover();await bob.init();await bob.play();
 setInterval(()=>{v.y=waveHeight(v.x,v.z,Date.now()/1000)+v.config.rideHeight;bob.tick(.125,v,{colour:1,design:'classic'},false);},125);
 export function onlineClient(){return client;}
 `}));
 await page.goto(dev+'/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);await page.locator('#play').click();await page.waitForFunction(()=>window.__ESTUARY__.status.online.connected&&window.__ESTUARY__.status.online.remote.visible===1);
 expect(await page.evaluate(()=>window.__ESTUARY__.status.sea.mode)).toBe('changing');await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__ESTUARY__.status.speed>6,null,{timeout:45000});await page.keyboard.up('KeyW');await page.screenshot({path:'test-results/online-full-game.png'});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>!window.__ESTUARY__.status.online.connected);expect(await page.evaluate(()=>window.__ESTUARY__.status.state)).toBe('paused');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.__ESTUARY__.status.online.connected);await page.locator('#resume').click();
 await page.locator('#online-button').click();await page.locator('#online-create').click();await page.waitForFunction(()=>window.__ESTUARY__.status.online.world!=='public'&&window.__ESTUARY__.status.online.connected);expect(await page.evaluate(()=>window.__ESTUARY__.status.online.remote.known)).toBe(0);
 await page.locator('#online-public').click();await page.waitForFunction(()=>window.__ESTUARY__.status.online.world==='public'&&window.__ESTUARY__.status.online.count===2);await page.locator('#online-signout').click();await page.waitForFunction(()=>!window.__ESTUARY__.status.online.signedIn&&window.__ESTUARY__.status.sea.mode==='calm');await page.locator('#online-back').click();expect(await page.evaluate(()=>window.__ESTUARY__.status.state)).toBe('playing');expect(errors).toEqual([]);
});
