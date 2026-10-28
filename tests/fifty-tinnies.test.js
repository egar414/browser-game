import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {makeVehicle} from '../src/vehicles/models.js';
import {VEHICLES,PROPULSION,setSeaState} from '../src/config.js';
import {minimumHullClearance} from '../src/vehicles/shafting.js';
import {sprayState,launchSpray} from '../src/systems/spray-model.js';
import {packPose} from '../src/systems/network-state.js';
import {database,rpc,users} from './multiplayer-fixture.js';
const neutral={throttle:0,steer:0,trim:0,freestyle:false,womp:false};
test('both 50 hp hulls have correct dimensions, distinct original silhouettes, larger motors and bounded draw counts',()=>{
 for(const [type,length,width] of [['dinghy',2,1.16],['skua',3.7,1.58]]){
  assert.equal(VEHICLES[type].length,length);assert.equal(PROPULSION[type].shaftPower,37300);
  const m=makeVehicle(type,VEHICLES[type].colours[0]);m.updateMatrixWorld(true);let meshes=0;m.traverse(o=>{if(o.isMesh)meshes++;});assert(meshes<65,`bounded draw count ${meshes}`);
  assert.equal(m.userData.motor.scale.x,1.25);assert(Math.abs(m.userData.motor.position.z+length*.498)<.01);
  const hull=m.userData.body.children.find(g=>g.name===(type==='skua'?'Super Skua 370':'Dingi 200'));assert(hull);
  // Batched hull dimensions are still visible even when its original group is emptied.
  const size=new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());assert(size.x>=width*.8&&size.z>length);assert(size.z<length+1);
 }
});
test('stern weight is visible at rest and the new hulls need deliberate wet womping before a sustained shaft',()=>{
 setSeaState('calm',0,true);for(const type of ['dinghy','skua'])for(const hz of [30,60,120]){
  const v=new VehiclePhysics(type,()=>null);v.x=-200;v.z=-1000;v.heading=0;
  for(let i=0;i<3*hz;i++)v.update(1/hz,neutral,i/hz);assert(v.pitch>.07&&Math.abs(v.roll)<.12);
  for(let i=0;i<5*hz;i++)v.update(1/hz,{...neutral,throttle:1,freestyle:true},3+i/hz);assert(v.pitch<.5);assert.equal(v.shaftLoad,0);
  for(let i=0;i<3*hz;i++)v.update(1/hz,{...neutral,throttle:1,freestyle:true,womp:true},8+i/hz);assert(v.womp.ready);assert(v.shaftLoad>.8);assert(v.hullHits>0);
  let held=0,power=1;for(let i=0;i<6*hz;i++){if(i%Math.max(1,Math.round(hz/5))===0){if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;}v.update(1/hz,{...neutral,throttle:power,freestyle:true},11+i/hz);assert(!v.wipeout);assert(!v.airborne);if(v.pitch>.65){held+=1/hz;assert(v.pitch<1.2);assert(minimumHullClearance(v,11+i/hz)>-.31);}}assert(held>3);
  for(let i=0;i<3*hz;i++)v.update(1/hz,{...neutral,throttle:.3},17+i/hz);assert(v.pitch<.3);assert(v.wompLoad<.01);
 }
});
test('womping cannot charge at rest or in the air, and boosts only a powered sharp-turn fan',()=>{
 const v=new VehiclePhysics('skua',()=>null);for(let i=0;i<180;i++)v.update(1/60,{...neutral,womp:true},i/60);assert.equal(v.wompEnergy,0);assert.equal(v.bounceLoad,0);
 Object.assign(v,{x:-200,y:.2,z:-1000,heading:0,roll:0,pitch:0,speed:14,vx:0,vz:14,throttle:1,steer:1,yawRate:1,slip:-6,lateralAcceleration:12,airborne:false,drive:{...v.drive,wetness:1,flow:1,neutral:false}});
 const normal=sprayState(v,false,3);v.wompEnergy=1;const big=sprayState(v,false,3);assert(big.left+big.right>normal.left+normal.right);assert(launchSpray(v,big,-1,()=>.5).vy<35);
 assert.equal(sprayState({...v,steer:0,yawRate:0,slip:0,lateralAcceleration:0},false,3).rate,0);assert.equal(sprayState({...v,airborne:true},false,3).rate,0);
});
test('new tinny poses round-trip online without changing other players or granting Creator privileges',async()=>{
 const f=await database();try{let room=await rpc(f,users[0],'er_join',{p_name:'Tinny Rat',p_code:'PUBLIC'});assert.equal(room.craftVersion,2);
 for(const [i,type]of ['dinghy','skua'].entries()){await f.owner("update er_players set pose_at=clock_timestamp()-interval '1 second'");const v=new VehiclePhysics(type,()=>null);room=await rpc(f,users[0],'er_exchange',{p_pose:packPose(v,{colour:0,design:'classic'},{},true),p_seq:i+1});assert.equal(room.players[0].pose.type,type);assert.equal(room.creator,false);}
 await assert.rejects(f.as(users[0],"select public.er_exchange_before_fleet('{}',999)"),/permission denied/);
 }finally{await f.db.close();}
});
