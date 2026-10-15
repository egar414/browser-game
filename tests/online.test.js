import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineSession} from '../src/online/session.js';
import {packPose,validatePose,blendPose,inviteCode} from '../src/online/protocol.js';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {onlineConfig} from '../src/online/config.js';
import {TestOnlineService} from './helpers/online-service-double.js';
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const flush=()=>new Promise(resolve=>setTimeout(resolve,10));

test('two signed-in riders share the public world, move, enter a private code and return independently',async()=>{
 const service=new TestOnlineService();service.addUser(alice,'a@example.test','Alice');service.addUser(bob,'b@example.test','Bob');
 const receivedA=[],receivedB=[],a=new OnlineSession(service.client('a@example.test'),{onPose:(id,p)=>receivedA.push({id,p})}),b=new OnlineSession(service.client('b@example.test'),{onPose:(id,p)=>receivedB.push({id,p})});
 try{
 await a.init();await b.init();assert.equal(a.status.connected,false);await a.play();await b.play();await flush();assert.equal(a.status.count,2);assert.equal(b.status.count,2);
 const v=new VehiclePhysics();a.tick(.2,v,{colour:1,design:'classic'},true);await flush();assert.equal(receivedB[0].id,alice);assert.equal(receivedB[0].p.colour,1);
 const room=await a.createRoom();await flush();assert.equal(b.status.count,1);const prior=receivedB.length;a.tick(.2,v,{},true);await flush();assert.equal(receivedB.length,prior);
 await assert.rejects(b.joinRoom('not-a-code'));await assert.rejects(b.joinRoom('FFFFFFFFFFFF'));
 await b.joinRoom(room.code);await flush();assert.equal(a.status.count,2);assert.equal(b.status.world,a.status.world);a.tick(.2,v,{},true);await flush();assert(receivedB.length>prior);
 await b.publicWorld();await flush();assert.equal(b.status.world,'public');assert.equal(a.status.count,1);
 await a.suspend();assert.equal(a.status.connected,false);await a.resumeNetwork();await flush();assert.equal(a.status.connected,true);
 await a.signOut();assert.equal(a.status.signedIn,false);assert.equal(a.status.connected,false);assert.equal(a.status.code,'');
 }finally{await a.dispose();await b.dispose();}
});
test('protocol rejects malformed/excessive state, preserves identities and interpolates heading across north',()=>{
 const v=new VehiclePhysics(),p=packPose(v,{colour:0,design:'heritage'},1);assert(p);assert.equal(p.design,'heritage');assert(!JSON.stringify(packPose({...v,email:'private@example.test',password:'secret-value'},{},1)).includes('private@example.test'));assert(!JSON.stringify(packPose({...v,password:'secret-value'},{},1)).includes('secret-value'));
 for(const changed of [{x:Infinity},{x:1e20},{type:'yacht'},{seq:-1},{flow:Infinity},{epoch:'bad'}])assert.equal(validatePose({...p,...changed}),null);
 const mid=blendPose({...p,heading:3.12},{...p,heading:-3.12},.5);assert(Math.abs(mid.heading-Math.PI)<.03);assert.equal(inviteCode(' abcd-1234-ef56 '),'ABCD1234EF56');
});
test('movement is bounded to eight sends per second; idle heartbeat and background disconnect limit traffic',async()=>{
 const service=new TestOnlineService();service.addUser(alice,'a@example.test','Alice');service.addUser(bob,'b@example.test','Bob');const other=new OnlineSession(service.client('b@example.test'));await other.init();await other.play();const client=service.client('a@example.test'),s=new OnlineSession(client);let sent=0;
 try{await s.init();await s.play();await flush();s.own.send=async()=>{sent++;return'ok';};const v=new VehiclePhysics();
 for(let i=0;i<600;i++)s.tick(1/60,v,{},true);assert(sent<=6,'idle should use sparse heartbeats');sent=0;
 for(let i=0;i<600;i++){v.x+=.01;s.tick(1/60,v,{},true);}assert(sent<=80&&sent>60);
 await s.suspend();const before=sent;for(let i=0;i<600;i++)s.tick(1/60,v,{},true);assert.equal(sent,before);assert.equal(client.channels.length,0);
 }finally{await s.dispose();await other.dispose();}
});
test('failed sign-in reports a useful error and missing hosting leaves single-player available',async()=>{
 const host=new TestOnlineService(),s=new OnlineSession(host.client());await s.init();await assert.rejects(s.signIn('wrong@example.test','wrong'),/Could not sign in/);assert.equal(s.status.signedIn,false);await s.dispose();
 const off=new OnlineSession(null);await off.init();await off.play();assert.equal(off.status.configured,false);assert.equal(off.status.connected,false);assert.match(off.status.message,/Single-player/);await off.dispose();
});

test('online configuration accepts only public keys and HTTPS hosting',()=>{
 assert.equal(onlineConfig({}),null);assert.throws(()=>onlineConfig({VITE_SUPABASE_URL:'https://example.supabase.co'}),/both/);
 assert.throws(()=>onlineConfig({VITE_SUPABASE_URL:'http://evil.test',VITE_SUPABASE_PUBLISHABLE_KEY:'public-key'}),/HTTPS/);
 assert.throws(()=>onlineConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_fake'}),/never a secret/);
 const payload=Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url');assert.throws(()=>onlineConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'e30.'+payload+'.test'}),/Secret service/);
 assert.equal(onlineConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}).key,'sb_publishable_test');
});
test('reconnecting channels re-track presence and out-of-order pose packets cannot rewind a rider',async()=>{
 const host=new TestOnlineService();host.addUser(alice,'a@example.test','Alice');host.addUser(bob,'b@example.test','Bob');const seen=[],a=new OnlineSession(host.client('a@example.test')),b=new OnlineSession(host.client('b@example.test'),{onPose:(_,p)=>seen.push(p.seq)});
 try{await a.init();await b.init();await a.play();await b.play();await flush();const v=new VehiclePhysics(),packet=packPose(v,{},5,false,a.epoch);await a.own.send({type:'broadcast',event:'pose',payload:packet});await a.own.send({type:'broadcast',event:'pose',payload:{...packet,seq:4}});assert.deepEqual(seen,[5]);
 a.lobby.callback('CHANNEL_ERROR');assert.equal(a.status.connected,false);a.lobby.callback('SUBSCRIBED');await flush();assert.equal(a.status.connected,true);assert.equal(b.status.count,2);
 }finally{await a.dispose();await b.dispose();}
});
