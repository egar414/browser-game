import {test,expect} from '@playwright/test';
import {bootAccount} from './online-browser-fixture.js';
import {database,rpc,users} from './multiplayer-fixture.js';
import {packPose} from '../src/systems/network-state.js';
import {VehiclePhysics} from '../src/vehicles/physics.js';
test('existing server poses show an overturned online boat and overboard rider, then restore its seated rider',async({page:p})=>{
 test.setTimeout(180000);const f=await database(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await bootAccount(p,f,users[0],'capsize-observer@example.test');await p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true}).click();await p.locator('[data-online="drive"]').click();await p.keyboard.press('Escape');await p.locator('#visit-speedrun').click();const s=await p.evaluate(()=>__ESTUARY__.status);
  await rpc(f,users[1],'er_join',{p_name:'Overboard driver',p_code:'PUBLIC'});const v=new VehiclePhysics('tinny');Object.assign(v,{x:s.position.x+8,y:.24,z:s.position.z+3,roll:Math.PI-.015,pitch:0,throttle:0,wipeout:1,capsized:true});
  for(let seq=1;seq<=5;seq++){await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second'");await rpc(f,users[1],'er_exchange',{p_pose:packPose(v,{colour:0,design:'classic'},{},true,seq),p_seq:seq});await p.waitForTimeout(250);}
  await expect.poll(async()=>p.evaluate(()=>__ESTUARY__.status.online.capsizedCrafts),{timeout:25000}).toBe(1);await p.screenshot({path:'test-results/online-capsize-overboard-rider.png'});
  v.x+=1500;for(let seq=6;seq<=9;seq++){await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second'");await rpc(f,users[1],'er_exchange',{p_pose:packPose(v,{colour:0,design:'classic'},{},true,seq),p_seq:seq});await p.waitForTimeout(250);}
  await expect.poll(async()=>p.evaluate(()=>__ESTUARY__.status.online.visibleCrafts),{timeout:25000}).toBe(0);expect(await p.evaluate(()=>__ESTUARY__.status.online.capsizedCrafts)).toBe(0);
  v.x-=1500;v.roll=0;v.capsized=false;v.wipeout=0;for(let seq=10;seq<=14;seq++){await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second'");await rpc(f,users[1],'er_exchange',{p_pose:packPose(v,{colour:0,design:'classic'},{},true,seq),p_seq:seq});await p.waitForTimeout(250);}
  await expect.poll(async()=>p.evaluate(()=>__ESTUARY__.status.online.capsizedCrafts),{timeout:25000}).toBe(0);expect(errors).toEqual([]);
 }finally{await f.db.close();}
});
