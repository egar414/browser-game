import test from 'node:test';
import assert from 'node:assert/strict';
import {database,rpc,users} from './multiplayer-fixture.js';
import {packPose} from '../src/systems/network-state.js';
import {packSpray,remoteSpray} from '../src/systems/network-spray.js';
import {VehiclePhysics} from '../src/vehicles/physics.js';
const [a,b,c]=users;
const pose=(x=50,z=20)=>packPose({type:'tinny',x,y:0,z,drive:{}},{colour:0,design:'classic'},{},true);
const spray={kind:'rear',ox:0,oy:.4,oz:0,vx:0,vy:5,vz:10,power:2};
test('real physics produces compact shared spray, and paused or airborne craft emit none',()=>{
 const v=new VehiclePhysics('ski',()=>null);for(let i=0;i<240;i++)v.update(1/60,{throttle:1,steer:0,trim:0},i/60);
 const p=packPose(v,{colour:0,design:'classic'},{},true,4);assert(p.spray.some(s=>s.kind==='rear'));assert(JSON.stringify(p).length<2048);const r=remoteSpray(p);assert(r.every(s=>s.x===p.x+s.ox));assert.deepEqual(packSpray(v,4,false),[]);v.airborne=true;assert.deepEqual(packSpray(v,4),[]);
});
test('public spray floods peers automatically, respects rooms and shields, rejects forged hits and relaunches',async()=>{
 const f=await database();try{
  await rpc(f,a,'er_join',{p_name:'Sprayer',p_code:'PUBLIC'});await rpc(f,b,'er_join',{p_name:'Receiver',p_code:'PUBLIC'});await rpc(f,c,'er_join',{p_name:'Private',p_create:true});
  await rpc(f,b,'er_exchange',{p_pose:pose(50,8.5),p_seq:1});await rpc(f,c,'er_exchange',{p_pose:pose(50,8.5),p_seq:1});
  const fire={...pose(50,0),throttle:1,spray:[spray]};
  let result=await rpc(f,a,'er_exchange',{p_pose:{...fire,target:b,damage:100},p_seq:1});assert.equal(result.combatVersion,1);assert.equal(result.players.find(p=>p.id===a).pose.target,undefined);assert.deepEqual(result.players.find(p=>p.id===a).pose.spray,[spray]);assert.equal(result.players.find(p=>p.id===b).combat.water,0);
  const tick=async(seq)=>{await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second';update er_spray_packets set born=clock_timestamp()-interval '1.02 seconds',checked=clock_timestamp()-interval '.5 seconds'");return rpc(f,a,'er_exchange',{p_pose:fire,p_seq:seq});};
  await tick(2);assert.equal((await rpc(f,b,'er_snapshot')).combat.water,0,'spawn protection');
  await f.owner('update er_players set shield_until=clock_timestamp()-interval \'1 second\'');
  result=await tick(3);assert(result.players.find(p=>p.id===b).combat.water>7);assert.equal((await rpc(f,c,'er_snapshot')).combat.water,0,'different room');
  for(let i=4;i<19;i++)result=await tick(i);
  assert(result.players.find(p=>p.id===b).combat.sinking>0,'repeated real descending hits sink');
  await assert.rejects(f.as(a,'update public.er_players set water=100'),/permission denied/);await assert.rejects(f.as(a,'select * from public.er_spray_packets'),/permission denied/);await assert.rejects(f.as(a,"select public.er_exchange_base('{}',99)"),/permission denied/);
  await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second'");await assert.rejects(rpc(f,a,'er_exchange',{p_pose:{...fire,spray:[{...spray,power:100}]},p_seq:50}),/Spray outside limits/);
  await f.owner("update er_players set sinking_until=clock_timestamp()-interval '1 second' where water=100;update er_players set pose_at=clock_timestamp()-interval '1 second';delete from er_spray_packets");
  result=await rpc(f,a,'er_exchange',{p_pose:{...pose(),spray:[]},p_seq:51});const receiver=result.players.find(p=>p.id===b).combat;assert.equal(receiver.water,0);assert.equal(receiver.sinking,0);assert(receiver.shield>0);
  assert.equal((await f.db.query('select count(*)::int n from er_spray_packets')).rows[0].n,0,'inactivity emits no packets');
 }finally{await f.db.close();}
});

test('misses, rising water and self spray do not flood; private peers use the same automatic rules',async()=>{
 const f=await database();try{
  const room=await rpc(f,a,'er_join',{p_name:'Private sprayer',p_create:true});await rpc(f,b,'er_join',{p_name:'Private peer',p_code:room.code});
  await rpc(f,b,'er_exchange',{p_pose:pose(50,8.5),p_seq:1});await f.owner("update er_players set shield_until=clock_timestamp()-interval '1 second'");
  const seed=async(x,age,previous)=>f.owner(`insert into er_spray_packets(emitter,room_id,born,checked,x,y,z,vx,vy,vz,power) values('${a}','${room.id}',clock_timestamp()-interval '${age} seconds',clock_timestamp()-interval '${previous} seconds',${x},.4,0,0,5,10,2)`);
  const tick=async(seq)=>{await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second'");return rpc(f,a,'er_exchange',{p_pose:pose(50,8.5),p_seq:seq});};
  await seed(100,1.02,.5);await tick(1);assert.equal((await rpc(f,b,'er_snapshot')).combat.water,0,'nearby miss');
  await f.owner('delete from er_spray_packets');await seed(50,.25,0);await tick(2);assert.equal((await rpc(f,b,'er_snapshot')).combat.water,0,'rising spray');
  await f.owner('delete from er_spray_packets');await seed(50,1.02,.5);const hit=await tick(3);assert.equal(hit.combat.water,0,'emitter cannot hit itself');assert(hit.players.find(p=>p.id===b).combat.water>7,'private peers need no acceptance flag');
 }finally{await f.db.close();}
});
