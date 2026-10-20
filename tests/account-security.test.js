import test from 'node:test';import assert from 'node:assert/strict';
import {AccountSecurity} from '../src/systems/account-security.js';
import {database,rpc,users,migration,creatorMigration,combatMigration,fleetMigration,securityMigration} from './multiplayer-fixture.js';
import {packPose} from '../src/systems/network-state.js';
test('verified MFA accounts cannot bypass the AAL2 requirement through game RPCs or private base functions',async()=>{
 const f=await database(),id=users[0];try{
  await rpc(f,id,'er_join',{p_name:'Secure Rat',p_code:'PUBLIC'});
  await f.db.query("insert into auth.mfa_factors values('aaaaaaaa-1111-4111-8111-111111111111',$1,'verified')",[id]);
  for(const [name,args] of [['er_join',{p_name:'Secure Rat',p_code:'PUBLIC'}],['er_snapshot',{}],['er_exchange',{p_pose:{},p_seq:1}],['er_my_perks',{}]])await assert.rejects(rpc(f,id,name,args),/authenticator/);
  for(const fn of ["er_join_before_mfa('Other','PUBLIC',false)","er_exchange_before_mfa('{}',1)",'er_snapshot_before_mfa()','er_my_perks_before_mfa()','er_require_aal2()'])await assert.rejects(f.as(id,'select public.'+fn),/permission denied/);
  let room=await rpc(f,id,'er_join',{p_name:'Secure Rat',p_code:'PUBLIC'},'aal2');assert.equal(room.securityVersion,1);assert.equal(room.craftVersion,2);
  const p=packPose({type:'skua',x:50,y:.2,z:20,drive:{}},{colour:0,design:'classic'},{},true);room=await rpc(f,id,'er_exchange',{p_pose:p,p_seq:1},'aal2');assert.equal(room.players[0].pose.type,'skua');
  // An account without a verified factor still works; logout is always permitted.
  assert.equal((await rpc(f,users[1],'er_join',{p_name:'Normal Rat',p_code:'PUBLIC'})).players.length,2);await rpc(f,id,'er_leave');
  for(const sql of [migration,creatorMigration,combatMigration,fleetMigration,securityMigration])await f.owner(sql);
  await assert.rejects(rpc(f,id,'er_join',{p_name:'Secure Rat',p_code:'PUBLIC'}),/authenticator/);assert((await rpc(f,id,'er_join',{p_name:'Secure Rat',p_code:'PUBLIC'},'aal2')).securityVersion===1);
 }finally{await f.db.close();}
});
test('authenticator enrollment, invalid codes, verification, removal and lower-assurance session gating',async()=>{
 let enabled=false,level='aal1',unenrolled=0,verified=0;
 const result=data=>({data,error:null});const owner={session:{user:{id:'user'}},creator:true,changed(){},clearRoom(){this.room=null;},initialize:async()=>{},rpc:async()=>1,refreshPerks:async()=>{verified++;}};
 owner.client={auth:{getSession:async()=>result({session:owner.session}),mfa:{getAuthenticatorAssuranceLevel:async()=>result({currentLevel:level}),listFactors:async()=>result({totp:enabled?[{id:'factor'}]:[]}),enroll:async()=>result({id:'factor',totp:{qr_code:'data:image/svg+xml;utf-8,test',secret:'TESTONLY'}}),challengeAndVerify:async({code})=>{if(code!=='123456')return{error:Error('Invalid code')};enabled=true;level='aal2';return result({});},unenroll:async()=>{enabled=false;unenrolled++;return result({});}}}};
 const s=new AccountSecurity(owner);await s.enroll();assert(s.status.enrolling);await assert.rejects(s.verify('999999'),/Invalid/);assert(s.pending);await s.verify('123456');assert(s.enabled&&!s.required&&!s.pending);assert.equal(verified,1);
 level='aal1';owner.room={id:'room'};await s.refresh();assert(s.required);assert.equal(owner.room,null);assert.equal(owner.creator,false);await assert.rejects(s.disable(),/Verify/);
 await s.verify('123456');await s.disable();assert.equal(unenrolled,1);assert(!s.enabled);await s.enroll();await s.cancel();assert(!s.pending);assert.equal(unenrolled,2);
});
