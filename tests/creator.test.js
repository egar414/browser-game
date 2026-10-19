import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,rpc,users,creatorMigration} from './multiplayer-fixture.js';
import {creatorSetupSQL} from '../public/creator-setup.js';
import {hasUnlock,earnProgress,TUNING} from '../src/systems/progression.js';
import {accountError} from '../src/systems/online-ui.js';
import {packPose} from '../src/systems/network-state.js';
test('creator grants require the database owner and names/pose packets cannot impersonate a badge',async()=>{
 const f=await database();const [a,b]=users;
 try{
  assert.equal(await rpc(f,a,'er_my_perks'),false);
  await assert.rejects(f.as(a,'insert into public.er_creators values($1)',[a]),/permission denied/);
  await assert.rejects(f.as(a,'select * from public.er_creators'),/permission denied/);
  await f.db.exec(creatorSetupSQL(creatorMigration,a));
  assert.equal(await rpc(f,a,'er_my_perks'),true);assert.equal(await rpc(f,b,'er_my_perks'),false);
  let room=await rpc(f,a,'er_join',{p_name:'Creator',p_code:'PUBLIC'});assert.equal(room.creator,true);
  room=await rpc(f,b,'er_join',{p_name:'CREATOR',p_code:'PUBLIC'});assert.equal(room.creator,false);assert.equal(room.players.find(p=>p.id===a).creator,true);assert.equal(room.players.find(p=>p.id===b).creator,false);
  const pose=packPose({type:'ski',x:0,y:0,z:0,drive:{}},{colour:0,design:'classic'},{},true);
  room=await rpc(f,b,'er_exchange',{p_pose:{...pose,creator:true},p_seq:1});assert.equal(room.creator,false);assert.equal(room.players.find(p=>p.id===b).creator,false);
  await f.db.exec(await readFile(new URL('../public/multiplayer.sql',import.meta.url),'utf8'));assert.equal((await rpc(f,a,'er_snapshot')).creator,true);
  await f.db.query('delete from public.er_creators where user_id=$1',[a]);assert.equal(await rpc(f,a,'er_my_perks'),false);
  assert.equal(await readFile(new URL('../public/creator.sql',import.meta.url),'utf8'),creatorMigration);
  assert.throws(()=>creatorSetupSQL(creatorMigration,"'; drop table auth.users; --"),/Open this page/);
 }finally{await f.db.close();}
});
test('creator cosmetics and garage XP use transient account access; email quota errors explain the owner fix',()=>{
 const normal={careerPoints:0},creator={careerPoints:0};Object.defineProperty(creator,'creatorAccess',{value:true,enumerable:false});
 assert.equal(hasUnlock(normal,TUNING.race),false);assert.equal(hasUnlock(creator,TUNING.race),true);
 earnProgress(normal,100);earnProgress(creator,100);assert.equal(normal.careerPoints,100);assert.equal(creator.careerPoints,200);assert.equal(JSON.parse(JSON.stringify(creator)).creatorAccess,undefined);
 assert.match(accountError({code:'over_email_send_rate_limit',message:'email rate limit exceeded'}),/Confirm email/);
 assert.match(accountError({code:'email_not_confirmed',message:'Email not confirmed'}),/confirmation email/);
});
