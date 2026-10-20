import {test,expect} from '@playwright/test';
import {bootAccount} from './online-browser-fixture.js';
import {database,rpc,users} from './multiplayer-fixture.js';
import {packPose} from '../src/systems/network-state.js';
import {VEHICLES} from '../src/config.js';
test('receiver renders the full high-trim Apex arc and a sharp-turn Skua fan ahead in clear water',async({page:p})=>{
 test.setTimeout(150000);const f=await database(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await bootAccount(p,f,users[0],'observer@example.test');await p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true}).click();await p.locator('[data-online="drive"]').click();await p.keyboard.press('Escape');await p.locator('#visit-speedrun').click();
  const initial=await p.evaluate(()=>window.__ESTUARY__.status),view=initial.position;expect(initial.scenery.mooredCruisers).toBeGreaterThan(0);expect(initial.moorings.some(b=>b.kind==='cabin')).toBe(true);
  await f.db.query('insert into er_creators values($1)',[users[1]]);
  await rpc(f,users[1],'er_join',{p_name:'Apex trim reference',p_code:'PUBLIC'});await rpc(f,users[2],'er_join',{p_name:'Skua carve reference',p_code:'PUBLIC'});
  const crafts=['hyper','skua'].map((type,i)=>({type,config:VEHICLES[type],x:view.x+32+i*4,y:.14,z:view.z+(i?-13:7),heading:-Math.PI/2,pitch:i?.1:.4,roll:0,vx:0,vy:0,vz:0,speed:12,throttle:1,steer:i?1:0,yawRate:i?1:0,slip:i?-6:0,lateralAcceleration:i?15:0,planing:1,riderAft:1,airborne:false,wipeout:0,trimDegrees:i?0:36,drive:{flow:i?1:.16,reverse:0,trimAngle:i?0:.6,steeringAngle:0,exitSpeed:35,wetness:1}}));
  for(let seq=1;seq<=12;seq++){
   await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second'");
   for(let i=0;i<2;i++)await rpc(f,users[i+1],'er_exchange',{p_pose:packPose(crafts[i],{colour:0,design:'classic',creatorAccess:i===0},{},true,seq/5),p_seq:seq});
   await p.waitForTimeout(180);
  }
  await expect.poll(async()=>(await p.evaluate(()=>window.__ESTUARY__.status)).online.visibleCrafts,{timeout:20000}).toBe(2);await expect.poll(async()=>(await p.evaluate(()=>window.__ESTUARY__.status)).online.visibleSprays,{timeout:20000}).toBe(2);
  const start=await p.evaluate(()=>window.__ESTUARY__.status.simulationTime);await p.waitForFunction(t=>window.__ESTUARY__.status.simulationTime>t+6,start,{timeout:65000});await p.screenshot({path:'test-results/remote-apex-arc-and-skua-fan.png'});expect(errors).toEqual([]);
 }finally{await f.db.close();}
});
