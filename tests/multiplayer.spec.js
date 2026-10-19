import {test,expect} from '@playwright/test';
import {database,rpc,users} from './multiplayer-fixture.js';
const host='https://tqvgqtgxwgxdxpbvuatf.supabase.co';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test.use({actionTimeout:15000});
function session(id,email){
 const exp=Math.floor(Date.now()/1000)+3600;
 const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 return {access_token:`${part({alg:'HS256',typ:'JWT'})}.${part({sub:id,role:'authenticated',aud:'authenticated',exp})}.fixture`,token_type:'bearer',expires_in:3600,expires_at:exp,refresh_token:`fixture-${id}`,user:{id,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}};
}
async function boot(p,f,id,email){
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'})));
 await p.route(`${host}/**`,async route=>{
  const req=route.request(),url=new URL(req.url());const data=req.postDataJSON()||{};
  let response;
  try{
   if(url.pathname==='/auth/v1/token')response=session(id,email);
   else if(url.pathname==='/auth/v1/logout')response={};
   else if(url.pathname==='/auth/v1/user')response=session(id,email).user;
   else if(url.pathname.startsWith('/rest/v1/rpc/')){
    const token=req.headers().authorization?.slice(7);let uid='';try{uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;}catch{}
    response=await rpc(f,uid,url.pathname.split('/').at(-1),data);
   }else throw Error('Unhandled fixture endpoint '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response),headers:{'access-control-allow-origin':'*'}});
  }catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,code:'FIXTURE_ERROR'})});}
 });
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:120000});
 await p.locator('.launch-card').getByRole('button',{name:'ONLINE / ACCOUNT',exact:true}).click();
 await p.locator('#online-email').fill(email);await p.locator('#online-password').fill('Fixture-password-123');await p.locator('#online-account').getByRole('button',{name:'SIGN IN',exact:true}).click();
 await expect(p.locator('#online-signed-in')).toBeVisible();
}
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
  await expect.poll(async()=>{const snapshot=await rpc(f,users[1],'er_snapshot');return snapshot.players.find(p=>p.id===users[0]).pose.speed;},{timeout:15000}).toBeGreaterThan(2);
  await a.screenshot({path:'test-results/multiplayer-public-world.png'});
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
test('missing database explains setup and allows normal free roam',async({page:p})=>{
 test.setTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route(`${host}/rest/v1/rpc/**`,route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Function missing'})}));
 await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 await p.locator('.launch-card').getByRole('button',{name:'ONLINE / ACCOUNT',exact:true}).click();await expect(p.locator('#online-message')).toContainText('Database setup needed');
 await p.getByRole('button',{name:'BACK TO GAME',exact:true}).click();await p.locator('#play').click();await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:35000}).toBeGreaterThan(5);await p.keyboard.up('KeyW');expect(errors).toEqual([]);
});
