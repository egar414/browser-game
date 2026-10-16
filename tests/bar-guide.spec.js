import {test,expect} from '@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('bar route is obvious at launch, selects swell from calm and toggles without affecting controls',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({oceanVersion:1,quality:'Low',muted:true,seaState:'calm'})));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);await page.locator('#play').click();
 await page.keyboard.press('KeyN');await expect(page.locator('#bar-waves')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#bar-hint')).toBeVisible();
 expect((await status(page)).bar.active).toBe(true);expect((await status(page)).seaState).toBe('swell');
 await expect(page.locator('#bar-direction')).toContainText('TO THE BAR');await page.screenshot({path:'test-results/bar-guide-desktop.png'});
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).speed,{timeout:30000}).toBeGreaterThan(5);await page.keyboard.up('KeyW');
 await page.keyboard.press('KeyN');await expect(page.locator('#bar-hint')).toBeHidden();expect(errors).toEqual([]);
});
test('phone can start and stop bar guidance while preserving hourly conditions',async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({oceanVersion:1,quality:'Low',muted:true,seaState:'changing'})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('#play').tap();await p.locator('#bar-waves').tap();
 await expect(p.locator('#bar-hint')).toBeVisible();expect((await status(p)).seaState).toBe('changing');const rect=await p.locator('#bar-waves').boundingBox();expect(rect.x).toBeGreaterThan(0);expect(rect.x+rect.width).toBeLessThanOrEqual(844);
 await p.screenshot({path:'test-results/bar-guide-phone.png'});await p.locator('#bar-waves').tap();await expect(p.locator('#bar-hint')).toBeHidden();await p.locator('#menu-button').tap();await p.locator('#visit-bar').tap();expect((await status(p)).bar.arrived).toBe(true);await p.screenshot({path:'test-results/bar-visit-phone.png'});expect(errors).toEqual([]);await context.close();
});
test('visit bar launches safely among the wave markers, full map opens and driving continues',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({oceanVersion:1,quality:'Low',muted:true,seaState:'swell'})));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);await page.locator('#play').click();
 await page.keyboard.press('Escape');await page.locator('#visit-bar').click();await expect.poll(async()=>(await status(page)).bar.arrived).toBe(true);expect((await status(page)).state).toBe('playing');await expect(page.locator('#bar-direction')).toContainText('BAR WAVE ZONE');
 const popupWait=page.waitForEvent('popup');await page.locator('.bar-map').click();const map=await popupWait;await map.waitForLoadState('domcontentloaded');expect(await map.locator('svg').getAttribute('aria-label')).toContain('Wharf');await map.screenshot({path:'test-results/bar-route-map.png'});await map.close();await page.bringToFront();if((await status(page)).state==='paused')await page.locator('#resume').click();
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await status(page)).speed,{timeout:30000}).toBeGreaterThan(8);await page.keyboard.up('KeyW');await page.screenshot({path:'test-results/bar-wave-zone.png'});expect((await status(page)).wipeout).toBe(0);await page.keyboard.press('Escape');await page.locator('#garage').click();await page.locator('#play').click();const returned=await status(page);expect(Math.hypot(returned.position.x+220,returned.position.z+1080)).toBeLessThan(1);expect(returned.bar.active).toBe(false);expect(errors).toEqual([]);
});
