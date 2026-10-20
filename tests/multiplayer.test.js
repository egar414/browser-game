import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,rpc,users,migration,creatorMigration,combatMigration,fleetMigration,securityMigration} from './multiplayer-fixture.js';
import {packPose,RemoteStates,nextSequence} from '../src/systems/network-state.js';
import {publicConfig} from '../src/systems/online-client.js';
const [a,b,c]=users;
const pose=(x=50)=>packPose({type:'ski',x,y:1,z:20,heading:3.1,drive:{}},{colour:0,design:'classic'},{},true);
test('multiplayer SQL preserves room privacy, enforces capacity, owns identities and rejects invalid states',async()=>{
 const f=await database();try{
  assert.equal(await rpc(f,a,'er_backend_version'),1);
  await assert.rejects(rpc(f,'','er_join',{p_name:'Anonymous',p_code:'PUBLIC'}),/Sign in/);
  await assert.rejects(f.as(a,'select * from public.er_players'),/permission denied/);
  let room=await rpc(f,a,'er_join',{p_name:'A Rat',p_code:'PUBLIC',p_create:false});assert.equal(room.players.length,1);
  room=await rpc(f,b,'er_join',{p_name:'B Rat',p_code:'PUBLIC',p_create:false});assert.equal(room.players.length,2);
  const update=await rpc(f,a,'er_exchange',{p_pose:{...pose(),id:b,room_id:'fake',email:'secret'},p_seq:1});
  const player=update.players.find(p=>p.id===a);assert.equal(player.pose.x,50);assert.equal(player.pose.id,undefined);assert.equal(player.pose.email,undefined);assert.equal(update.players.find(p=>p.id===b).pose,null);
  await f.db.exec("update er_players set pose_at=now()-interval '1 second'");
  await rpc(f,a,'er_exchange',{p_pose:pose(99),p_seq:1});assert.equal((await rpc(f,a,'er_snapshot')).players.find(p=>p.id===a).pose.x,50);
  await assert.rejects(rpc(f,a,'er_exchange',{p_pose:{...pose(),x:1e6},p_seq:2}),/outside limits|Invalid craft number/);
  await assert.rejects(rpc(f,a,'er_exchange',{p_pose:{...pose(),steer:null},p_seq:2}),/Missing craft number/);
  const secret=await rpc(f,b,'er_join',{p_name:'Private Rat',p_create:true});assert.match(secret.code,/^[A-F0-9]{8}$/);
  assert.equal((await rpc(f,a,'er_snapshot')).players.length,1);assert.equal(secret.players.length,1);
  await rpc(f,c,'er_join',{p_name:'Friend',p_code:secret.code});assert.equal((await rpc(f,b,'er_snapshot')).players.length,2);
  await rpc(f,c,'er_leave');await assert.rejects(rpc(f,c,'er_snapshot'),/expired/);
  for(let i=0;i<20;i++)await rpc(f,c,'er_join',{p_name:'Guess',p_code:'DEADBEEF'});
  assert.match((await rpc(f,c,'er_join',{p_name:'Guess',p_code:secret.code})).error,/Too many/);
  await f.db.exec("update er_join_limits set started_at=now()-interval '2 minutes'");
  for(let i=4;i<=10;i++){
   const id=`${i.toString(16).repeat(8)}-1111-4111-8111-111111111111`;
   await f.db.query('insert into auth.users values($1)',[id]);await rpc(f,id,'er_join',{p_name:`Rat ${i}`,p_code:'PUBLIC'});
  }
  assert.match((await rpc(f,c,'er_join',{p_name:'Ninth',p_code:'PUBLIC'})).error,/Room full/);
  await f.db.exec("update er_players set seen_at=now()-interval '1 minute' where user_id='11111111-1111-4111-8111-111111111111'");
  await assert.rejects(rpc(f,a,'er_exchange',{p_pose:pose(),p_seq:5}),/expired/);
  assert.equal((await rpc(f,c,'er_join',{p_name:'Replacement',p_code:'PUBLIC'})).players.length,8);
  assert.equal(await readFile(new URL('../public/multiplayer.sql',import.meta.url),'utf8'),migration+'\n'+creatorMigration+'\n'+combatMigration+'\n'+fleetMigration+'\n'+securityMigration);
  const fresh=nextSequence(0);const exchange=await rpc(f,c,'er_exchange',{p_pose:pose(),p_seq:fresh});assert.equal(exchange.players.find(p=>p.id===c).seq,fresh);
 }finally{await f.db.close();}
});
test('remote smoothing wraps headings, bounds extrapolation, drops stale packets and removes departed craft',()=>{
 const state=new RemoteStates();state.accept([{id:b,name:'Rat',seq:1,pose:pose(0)}],a,0);
 state.accept([{id:b,name:'Rat',seq:2,pose:{...pose(10),heading:-3.1}}],a,400);
 const sample=state.sample(state.players.get(b),600);assert.equal(sample.x,5);assert(Math.abs(sample.heading)>3);
 state.accept([{id:b,seq:1,pose:pose(999)}],a,700);assert.equal(state.players.get(b).seq,2);
 state.accept([{id:c,seq:1,pose:{...pose(),x:NaN}}],a,800);assert.equal(state.players.size,0);
 const token=role=>`x.${btoa(JSON.stringify({role}))}.x`;
 assert.equal(publicConfig({url:'https://test.supabase.co',publishableKey:token('service_role')}),null);
 assert.equal(publicConfig({url:'https://test.supabase.co',publishableKey:'sb_secret_no'}),null);
 assert.equal(publicConfig({url:'https://evil.test',publishableKey:'sb_publishable_a'}),null);
 assert(publicConfig({url:'https://test.supabase.co',publishableKey:token('anon')}));
 const old=nextSequence(0,1000);assert(nextSequence(0,1001)>old);assert.equal(nextSequence(old,999),old+1);
});
