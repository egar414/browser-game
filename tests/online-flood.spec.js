import {test,expect} from '@playwright/test';
import {bootAccount} from './online-browser-fixture.js';
import {database,rpc,users} from './multiplayer-fixture.js';
import {packPose} from '../src/systems/network-state.js';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('a server-counted hit sinks the local player without an accept prompt and automatically recovers',async({page:p})=>{
 test.setTimeout(120000);const f=await database(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await bootAccount(p,f,users[1],'receiver@example.test');await p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true}).click();await p.locator('[data-online="drive"]').click();
  await expect.poll(async()=>{const r=await rpc(f,users[1],'er_snapshot');return !!r.players.find(x=>x.id===users[1]).pose;}).toBe(true);
  const s=await status(p),room=s.online.room;
  await rpc(f,users[0],'er_join',{p_name:'Sprayer',p_code:'PUBLIC'});
  await rpc(f,users[0],'er_exchange',{p_pose:packPose({type:'ski',x:s.position.x+12,y:s.position.y,z:s.position.z,drive:{}},{colour:0,design:'classic'},{},true),p_seq:1});
  await f.owner(`update er_players set water=96,shield_until=clock_timestamp()-interval '1 second' where user_id='${users[1]}';insert into er_spray_packets(emitter,room_id,born,checked,x,y,z,vx,vy,vz,power) values('${users[0]}','${room.id}',clock_timestamp()-interval '.6 seconds',clock_timestamp()-interval '.6 seconds',${s.position.x},${s.position.y+.85},${s.position.z},0,0,0,2)`);
  await expect.poll(async()=>(await status(p)).online.combat?.sinking,{timeout:15000,intervals:[100]}).toBeGreaterThan(0);
  await expect(p.locator('#world-alert')).toContainText('SWAMPED');await p.screenshot({path:'test-results/online-player-swamped.png'});
  await expect.poll(async()=>(await status(p)).online.combat?.water,{timeout:25000,intervals:[500]}).toBe(0);
  await expect(p.locator('#world-alert')).toContainText('SHIELD');expect((await status(p)).state).toBe('playing');
  await p.keyboard.down('KeyW');await expect.poll(async()=>(await status(p)).speed,{timeout:30000}).toBeGreaterThan(3);await p.keyboard.up('KeyW');expect(errors).toEqual([]);
 }finally{await f.db.close();}
});
