import{test,expect}from'@playwright/test';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('hourly sea controls, mapped detail, garage loadout and optional spray battle survive normal menus',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,careerPoints:500})));
 await page.goto('/');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 let s=await status(page);expect(s.features).toBe('wharf-shoal-spray-tricks');expect(s.scenery.mappedBuildings).toBe(422);expect(s.scenery.mooredTinnies).toBeGreaterThan(8);expect(s.seaState).toBe('changing');expect(s.sea.simulated).toBe(true);
 await page.locator('#design').selectOption('race');await page.locator('#tuning').selectOption('agile');
 expect((await status(page)).settings.design).toBe('race');expect((await status(page)).settings.tuning).toBe('agile');
 await page.locator('#play').click();await page.keyboard.press('Escape');await page.locator('#sea-state').selectOption('swell');await page.locator('#resume').click();await page.keyboard.press('KeyB');
 await expect.poll(async()=>(await status(page)).battle.targets.length).toBe(2);await expect(page.locator('#battle-status')).toBeVisible();
 await page.keyboard.press('Escape');const remaining=(await status(page)).battle.remaining;await page.waitForTimeout(400);expect((await status(page)).battle.remaining).toBe(remaining);await expect(page.locator('#sea-report')).toContainText('Simulated ocean swell');
 await page.locator('#resume').click();await page.keyboard.press('KeyR');expect((await status(page)).battle.water).toBe(0);await page.keyboard.press('KeyF');expect((await status(page)).battle.active).toBe(false);expect((await status(page)).race).not.toBeNull();
 await page.keyboard.press('Escape');await page.locator('#free-roam').click();expect((await status(page)).race).toBeNull();
 const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('estuary-rats-v1')));expect(record.seaState).toBe('swell');expect(record.design).toBe('race');expect(record.tuning).toBe('agile');expect(errors).toEqual([]);
});
