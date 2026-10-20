import {bootAccount as boot} from './online-browser-fixture.js';
import {test,expect} from '@playwright/test';
import {database,rpc,users} from './multiplayer-fixture.js';
const host='https://tqvgqtgxwgxdxpbvuatf.supabase.co';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test.use({actionTimeout:15000});
test('two browser accounts share moving boats, private codes isolate, sign out removes a craft and offline driving survives',async({browser})=>{
 test.setTimeout(240000);const f=await database();const contexts=[];const errors=[];
 try{
  await f.db.query('insert into public.er_creators(user_id) values($1)',[users[0]]);
  const pages=[];
  for(let i=0;i<2;i++){const ctx=await browser.newContext({viewport:{width:900,height:620},deviceScaleFactor:.75});contexts.push(ctx);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await boot(p,f,users[i],`rat${i}@example.test`);pages.push(p);console.log('Account signed in',i+1);}
  const [a,b]=pages;
  await expect.poll(async()=>(await status(a)).online.creator,{timeout:15000}).toBe(true);expect((await status(b)).online.creator).toBe(false);
  await expect(a.locator('#online-creator-perks')).toContainText('2× garage XP');
  await expect(a.locator('#tuning option[value="race"]')).toBeEnabled();
  for(const [i,p]of pages.entries()){await p.locator('#online-name').fill(`Rat ${i+1}`);await p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true}).click();await expect(p.locator('#online-room')).toContainText('PUBLIC WORLD');await p.locator('[data-online="drive"]').click();console.log('Public world launched',i+1);}
  await expect.poll(async()=>(await status(a)).online.remotePlayers,{timeout:25000}).toBe(1);
  await expect.poll(async()=>(await status(b)).online.visibleCrafts,{timeout:25000}).toBe(1);
  await expect(b.locator('.online-player-name.is-creator')).toContainText('CREATOR');
  await a.bringToFront();if((await status(a)).state==='paused')await a.keyboard.press('Escape');await a.keyboard.down('KeyW');await expect.poll(async()=>(await status(a)).speed,{timeout:35000}).toBeGreaterThan(6);await a.keyboard.up('KeyW');console.log('Movement reaches the shared PostgreSQL state');
  await expect.poll(async()=>(await status(b)).online.visibleSprays,{timeout:25000}).toBeGreaterThan(0);expect((await status(b)).online.remoteSprayMaxSpeed).toBeLessThan(220);await b.screenshot({path:'test-results/receiving-player-sees-spray.png'});
  await expect.poll(async()=>{const snapshot=await rpc(f,users[1],'er_snapshot');return snapshot.players.find(p=>p.id===users[0]).pose.speed;},{timeout:15000}).toBeGreaterThan(2);
  await a.screenshot({path:'test-results/multiplayer-public-world.png'});
  await b.bringToFront();if((await status(b)).state==='paused')await b.keyboard.press('Escape');await b.keyboard.down('KeyW');await expect.poll(async()=>(await status(b)).speed,{timeout:35000}).toBeGreaterThan(6);await b.keyboard.up('KeyW');
  await expect.poll(async()=>(await status(a)).online.visibleSprays,{timeout:20000}).toBeGreaterThan(0);expect((await status(a)).online.remoteSprayMaxSpeed).toBeLessThan(220);await a.screenshot({path:'test-results/creator-sees-return-spray.png'});console.log('Both accounts see each other’s falling spray');
  await a.locator('#online-status').click();await a.getByRole('button',{name:'CREATE PRIVATE ROOM',exact:true}).click();
  await expect.poll(async()=>(await status(a)).online.room?.public).toBe(false);
  const code=(await status(a)).online.room.code;await expect.poll(async()=>(await status(b)).online.remotePlayers).toBe(0);
  await b.locator('#online-status').click();await b.locator('#online-code').fill(code);await b.getByRole('button',{name:'JOIN PRIVATE ROOM',exact:true}).click();
  await expect.poll(async()=>(await status(b)).online.room?.code).toBe(code);
  await expect.poll(async()=>(await status(a)).online.remotePlayers).toBe(1);
  await b.screenshot({path:'test-results/multiplayer-private-room.png'});
  await b.getByRole('button',{name:'SIGN OUT',exact:true}).click();await expect(pages[1].locator('#online-account')).toBeVisible();
  await expect.poll(async()=>(await status(a)).online.remotePlayers).toBe(0);
  await a.getByRole('button',{name:'BACK TO GAME',exact:true}).click();await expect.poll(async()=>(await status(a)).state).toBe('playing');
  // Drop the network while riding. Physics/control updates do not await HTTP.
  await a.route(`${host}/rest/v1/**`,r=>r.abort('failed'));
  const simulationBefore=(await status(a)).simulationTime;await a.keyboard.down('KeyW');await expect.poll(async()=>(await status(a)).simulationTime,{timeout:15000}).toBeGreaterThan(simulationBefore+.5);await expect.poll(async()=>(await status(a)).speed,{timeout:30000}).toBeGreaterThan(5);await a.keyboard.up('KeyW');
  await expect.poll(async()=>(await status(a)).online.connected,{timeout:20000}).toBe(false);
  await a.locator('#online-status').click();await a.getByRole('button',{name:'SIGN OUT',exact:true}).click();await expect.poll(async()=>(await status(a)).online.creator).toBe(false);
  expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()));await f.db.close();}
});
test('email sending quota errors show the owner setting instead of repeated signup attempts',async({page:p})=>{
 test.setTimeout(120000);
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false})));
 await p.route(`${host}/rest/v1/rpc/er_backend_version`,route=>route.fulfill({status:200,contentType:'application/json',body:'1'}));
 let emails=0;await p.route(`${host}/auth/v1/signup**`,route=>{emails++;return route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({code:'over_email_send_rate_limit',msg:'email rate limit exceeded'})});});
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('.launch-card').getByRole('button',{name:'ONLINE / ACCOUNT',exact:true}).click();
 await p.locator('#online-email').fill('fixture@example.test');await p.locator('#online-password').fill('Fixture-password-123');await p.getByRole('button',{name:'CREATE ACCOUNT',exact:true}).click();
 await expect(p.locator('#online-message')).toContainText('Confirm email');expect(emails).toBe(1);await expect(p.locator('#online-message')).toContainText('stop retrying');
});
test('creator title sits above the local player name, follows driving and hides in first person and on sign-out',async({page:p})=>{
 test.setTimeout(150000);const f=await database();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await f.db.query('insert into public.er_creators(user_id) values($1)',[users[0]]);
  await boot(p,f,users[0],'creator@example.test');await p.locator('#online-name').fill('My Rat');await p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true}).click();await p.locator('[data-online="drive"]').click();
  const plate=p.locator('#local-player-name');await expect(plate).toBeVisible();await expect(plate.locator('.player-title')).toHaveText('★ CREATOR');await expect(plate.locator('.player-name')).toHaveText('My Rat');
  const title=await plate.locator('.player-title').boundingBox(),name=await plate.locator('.player-name').boundingBox();expect(title.y+title.height).toBeLessThanOrEqual(name.y+1);
  await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:30000}).toBeGreaterThan(5);await p.keyboard.up('KeyW');await expect(plate).toBeVisible();await p.screenshot({path:'test-results/creator-overhead-name.png'});
  await p.keyboard.press('KeyP');await expect(plate).toBeHidden();await p.keyboard.press('KeyP');await expect(plate).toBeVisible();
  await p.locator('#online-status').click();await p.getByRole('button',{name:'SIGN OUT',exact:true}).click();await p.getByRole('button',{name:'BACK TO GAME',exact:true}).click();await expect(plate).toBeHidden();expect(errors).toEqual([]);
 }finally{await f.db.close();}
});
test('Ewan stays saved across reload and login; an unassigned Creator tag has a direct account-specific setup',async({page:p,context})=>{
 test.setTimeout(240000);const f=await database();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await f.db.query('delete from auth.users where id<>$1',[users[0]]);
  await context.grantPermissions(['clipboard-read','clipboard-write']);await boot(p,f,users[0],'ewan@example.test');
  await expect(p.locator('#online-creator-status')).toContainText('not assigned');expect((await status(p)).detailedCraft).toBe(false);
  await p.locator('#online-name').fill('Ewan');await p.locator('#online-save-name').click();await expect.poll(()=>f.metadata.get(users[0])?.game_name).toBe('Ewan');
  await p.locator('#online-copy-creator').click();await expect(p.locator('#online-message')).toContainText('Creator setup copied');const grant=await p.evaluate(()=>navigator.clipboard.readText());expect(grant).toContain(`values ('${users[0]}')`);await p.locator('#online-copy-sole').click();await expect(p.locator('#online-message')).toContainText('Single-account setup copied');const soleGrant=await p.evaluate(()=>navigator.clipboard.readText());expect(soleGrant).toContain('Expected exactly one game account');
  await p.reload();await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('.launch-card').getByRole('button',{name:'ONLINE / ACCOUNT',exact:true}).click();await expect(p.locator('#online-name')).toHaveValue('Ewan');
  // Owner applies exactly the copy button's script, then the player refreshes.
  await f.owner(soleGrant);await p.getByRole('button',{name:'REFRESH ACCOUNT',exact:true}).click();await expect(p.locator('#online-creator-perks')).toBeVisible();expect((await status(p)).detailedCraft).toBe(true);
  await p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true}).click();await p.locator('[data-online="drive"]').click();await expect(p.locator('#local-player-name .player-name')).toHaveText('Ewan');await expect(p.locator('#local-player-name .player-title')).toBeVisible();
  await p.screenshot({path:'test-results/ewan-saved-creator-tag.png'});
  await p.reload();await p.waitForFunction(()=>window.__ESTUARY__?.status.ready&&window.__ESTUARY__.status.online.creator,null,{timeout:60000});await p.locator('#play').click();await expect(p.locator('#local-player-name .player-name')).toHaveText('Ewan');await expect(p.locator('#local-player-name .player-title')).toBeVisible();
  await p.locator('#online-status').click();await expect(p.locator('#online-account-id')).toHaveText(users[0]);await p.locator('#online-copy-id').click();await expect(p.locator('#online-message')).toContainText('Account ID copied');expect(await p.evaluate(()=>navigator.clipboard.readText())).toBe(users[0]);await p.locator('[data-online="close"]').click();
  await p.locator('#online-status').click();await p.getByRole('button',{name:'SIGN OUT',exact:true}).click();await expect.poll(async()=>(await status(p)).detailedCraft,{timeout:15000}).toBe(false);await p.locator('#online-email').fill('ewan@example.test');await p.locator('#online-password').fill('Fixture-password-123');await p.locator('#online-account').getByRole('button',{name:'SIGN IN',exact:true}).click();await expect(p.locator('#online-name')).toHaveValue('Ewan');expect(errors).toEqual([]);
 }finally{await f.db.close();}
});
test('missing database explains setup and allows normal free roam',async({page:p})=>{
 test.setTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route(`${host}/rest/v1/rpc/**`,route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Function missing'})}));
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 await p.locator('.launch-card').getByRole('button',{name:'ONLINE / ACCOUNT',exact:true}).click();await expect(p.locator('#online-message')).toContainText('Database setup needed');
 await p.getByRole('button',{name:'BACK TO GAME',exact:true}).click();await p.locator('#play').click();await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:35000}).toBeGreaterThan(5);await p.keyboard.up('KeyW');expect(errors).toEqual([]);
});
