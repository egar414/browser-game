import {test,expect} from '@playwright/test';
import {DRY_WHARF,wharfLocal} from '../src/systems/dry-wharf.js';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
async function driveIntoWharf(p){
 await p.locator('#find-wharf').click();
 const started=Date.now();
 while(Date.now()-started<110000){const s=await status(p);if(s.state==='workshop'){await p.keyboard.up('KeyW');await p.keyboard.up('KeyS');return;}
  const local=wharfLocal(s.position),desired=local.z< -11?4:1.3;
  if(s.speed<desired-.2){await p.keyboard.up('KeyS');await p.keyboard.down('KeyW');}else if(s.speed>desired+.5){await p.keyboard.up('KeyW');await p.keyboard.down('KeyS');}else{await p.keyboard.up('KeyW');await p.keyboard.up('KeyS');}
  await p.waitForTimeout(220);
 }throw Error('Could not drive into the wharf: '+JSON.stringify({state:(await status(p)).state,position:(await status(p)).position,speed:(await status(p)).speed}));
}
test('drive into the dry wharf, raise the current boat, buy/install parts and lower it to drive away',async({page:p})=>{
 test.setTimeout(260000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{if(!localStorage.getItem('estuary-rats-v1'))localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,dayMode:'day',seaState:'calm',oceanVersion:1}));if(!localStorage.getItem('estuary-rats-workshop-v1:guest'))localStorage.setItem('estuary-rats-workshop-v1:guest',JSON.stringify({balance:800,earned:800,moves:{},boats:{}}));});
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);await p.locator('#play').click();await driveIntoWharf(p);
 await expect(p.locator('#workshop')).toBeVisible();await expect.poll(async()=>(await status(p)).workshop.lift,{timeout:20000}).toBe(1);await expect(p.locator('[data-upgrade="pro-engine"]')).toBeDisabled();
 await p.locator('[data-upgrade="engine"]').click();expect((await status(p)).workshop.balance).toBe(620);expect((await status(p)).workshop.effects.power).toBe(1.08);
 await p.locator('[data-upgrade="engine"]').click();expect((await status(p)).workshop.effects.power).toBe(1);await p.locator('[data-upgrade="engine"]').click();expect((await status(p)).workshop.balance).toBe(620);
 await expect(p.getByRole('button',{name:'VIDEO REWARDS · COMING LATER'}).first()).toBeDisabled();await p.screenshot({path:'test-results/dry-wharf-upgrade-shop.png'});
 await p.locator('#workshop-exit').click();await expect.poll(async()=>(await status(p)).state,{timeout:20000}).toBe('playing');await expect.poll(async()=>(await status(p)).workshop.lift).toBe(0);await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:20000}).toBeGreaterThan(3);await p.keyboard.up('KeyW');await p.screenshot({path:'test-results/dry-wharf-leaving.png'});
 await p.reload();await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);expect((await status(p)).workshop.effects.power).toBe(1.08);expect((await status(p)).workshop.balance).toBe(620);
 await p.locator('[data-vehicle="cat"]').click();expect((await status(p)).workshop.effects.power).toBe(1);expect(errors).toEqual([]);
});
