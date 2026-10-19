import {test,expect} from '@playwright/test';
import {installAccountRoutes} from './online-browser-fixture.js';import {database,users} from './multiplayer-fixture.js';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('Apex is private to a verified Creator, restores after reload and is removed on sign-out',async({page:p})=>{
 test.setTimeout(240000);const f=await database(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
 await p.addInitScript(()=>{if(!localStorage.getItem('estuary-rats-v1'))localStorage.setItem('estuary-rats-v1',JSON.stringify({vehicle:'hyper',creatorAccess:true,quality:'Low',locals:false,muted:true,oceanVersion:1,seaState:'calm',dayMode:'day'}));});
 await installAccountRoutes(p,f,users[0],'creator@example.test');await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 expect((await status(p)).vehicle).toBe('ski');await expect(p.locator('[data-vehicle="hyper"]')).toBeHidden();
 await p.evaluate(()=>{const b=document.querySelector('[data-vehicle="hyper"]');b.disabled=false;b.click();});expect((await status(p)).vehicle).toBe('ski');
 await f.db.query('insert into public.er_creators(user_id) values($1)',[users[0]]);
 await p.locator('.launch-card').getByRole('button',{name:'ONLINE / ACCOUNT',exact:true}).click();await p.locator('#online-email').fill('creator@example.test');await p.locator('#online-password').fill('Fixture-password-123');await p.locator('#online-account').getByRole('button',{name:'SIGN IN',exact:true}).click();await expect.poll(async()=>(await status(p)).online.creator,{timeout:20000}).toBe(true);await p.locator('[data-online="close"]').click();
 // A rejected selection must not erase the Creator's pending saved craft.
 await expect(p.locator('[data-vehicle="hyper"]')).toBeVisible();await p.locator('[data-vehicle="hyper"]').click();await expect(p.locator('#vehicle-name')).toContainText('DEV');await p.locator('#play').click();expect((await status(p)).vehicle).toBe('hyper');await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:30000}).toBeGreaterThan(6);await p.keyboard.up('KeyW');await p.screenshot({path:'test-results/private-apex-driving.png'});
 await p.reload();await p.waitForFunction(()=>window.__ESTUARY__?.status.ready&&window.__ESTUARY__.status.online.creator&&window.__ESTUARY__.status.vehicle==='hyper',null,{timeout:90000});await p.locator('#play').click();const before=(await status(p)).position;
 await p.locator('#online-status').click();await p.getByRole('button',{name:'SIGN OUT',exact:true}).click();await expect.poll(async()=>(await status(p)).vehicle,{timeout:15000}).toBe('ski');const after=(await status(p)).position;expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeLessThan(.5);await p.locator('[data-online="close"]').click();await p.keyboard.press('Escape');await p.locator('#garage').click();await expect(p.locator('[data-vehicle="hyper"]')).toBeHidden();expect(errors).toEqual([]);
 }finally{await f.db.close();}
});
