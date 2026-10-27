import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {VEHICLES,setSeaState,waveHeight,isTinny} from '../src/config.js';
import {tinnyRestTrim} from '../src/vehicles/tinny-loading.js';
import {constrainHullWater} from '../src/vehicles/shafting.js';
import {hullSections,sampleHullContacts,lowestHullDepth,hullDraftAllowance,HULL_CONTACT_LIMIT} from '../src/vehicles/hull-support.js';
import {JetPlume,plumeTrajectory} from '../src/systems/jet-plume.js';
const neutral={throttle:0,steer:0,trim:0,freestyle:false};
test('resting trim follows engine weight, hull length and passenger position rather than a single fixed angle',()=>{
 const trim=(type,loading={},aft=.35)=>tinnyRestTrim({type,config:VEHICLES[type],loading,passengerAft:aft});
 assert.ok(trim('dinghy').pitch>trim('tinny').pitch);assert.ok(trim('tinny').pitch>trim('angler').pitch);assert.ok(trim('skua').pitch<trim('dinghy').pitch*.5);
 for(const type of ['tinny','dinghy','skua','angler']){assert.ok(trim(type,{motorMass:100}).pitch>trim(type,{motorMass:30}).pitch);assert.ok(trim(type,{},1).pitch>trim(type,{},0).pitch);assert.ok(trim(type).pitch<.36);}
});
test('every hull is supported across its real length, including normal cruising and rolled/high-bow poses',()=>{
 setSeaState('swell',0,true);
 for(const type of ['tinny','dinghy','skua','angler','cat','ski','seago','hyper','racer','cruiser','dive','rib'])for(const pitch of [0,.85])for(const time of [0,2.7,8.1]){
  const v={type,config:VEHICLES[type],x:2300,y:waveHeight(2300,-2600,time)-1,z:-2600,heading:.7,pitch,roll:-.18,vy:-2,airborne:false,shaftLoad:isTinny(type)&&pitch>.8?1:0,steer:0};constrainHullWater(v,time);
  assert.ok(Number.isFinite(v.y)&&v.hullCorrection>0,type);assert.ok(lowestHullDepth(v,time)>=-hullDraftAllowance(v)-1e-7,type);
  if(isTinny(type)||v.config.diveBoat||type==='cruiser')for(const row of sampleHullContacts(v,time))for(const j of[0,6])assert.ok(row.points[j].depth>=.03499,type+' gunwale clears the crest');
 }
});
function localPoint(p,v){const inv=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-v.pitch,v.heading,v.roll,'YXZ')).invert();return new THREE.Vector3(p.x-v.x,p.y-v.y,p.z-v.z).applyMatrix4(inv);}
function onSection(p,section){let best=Infinity;for(let j=0;j<section.points.length-1;j++){const a=new THREE.Vector3(...section.points[j]),b=new THREE.Vector3(...section.points[j+1]),d=b.clone().sub(a),u=Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/(d.lengthSq()||1)));best=Math.min(best,p.distanceTo(a.addScaledVector(d,u)));}return best;}
test('ordinary straight driving produces wave-impact spray on the hull without adding the shaft bounce oscillator',()=>{
 setSeaState('swell',0,true);
 for(const type of ['tinny','dinghy','skua','angler']){
  const hits=[],v=new VehiclePhysics(type,()=>null,e=>{if(e.contact)hits.push({time:e.time,points:e.contacts,pose:v.snapshot()});});v.respawnAt({x:2300,z:-2600,heading:Math.PI/2});
  for(let i=0;i<720;i++){v.update(1/60,{...neutral,throttle:1},i/60);assert.equal(v.bounceLoad,0);assert.equal(v.wipeout,0);if(!v.airborne)assert.ok(lowestHullDepth(v,i/60)>=-hullDraftAllowance(v)-1e-7);}
  assert.ok(hits.length>0,type);assert.ok(hits.length<120,type+' bounded impact rate');
  for(const hit of hits){assert.ok(hit.points.length<=HULL_CONTACT_LIMIT);for(const p of hit.points){assert.ok(onSection(localPoint(p,hit.pose),hullSections(type)[p.station])<1e-5,type+' source belongs to the hull');assert.ok(p.impact>.25&&p.impact<=4);}}
 }
});
test('shaft impacts come from wet stern sections rather than the raised bow',()=>{
 setSeaState('calm',0,true);const hits=[],v=new VehiclePhysics('tinny',()=>null,e=>{if(e.contact&&v.pitch>.8)hits.push({points:e.contacts,pose:v.snapshot()});});v.x=-200;v.z=-1000;v.heading=0;
 for(let i=0;i<900;i++)v.update(1/60,{...neutral,throttle:1,freestyle:true},i/60);
 assert.ok(hits.length>3);for(const hit of hits)for(const p of hit.points)assert.ok(localPoint(p,hit.pose).z<-.3,'raised forward hull emits no impact water');
});
test('airborne boats land when the hull touches, before their body origin sinks into the surface',()=>{
 setSeaState('calm',0,true);const events=[],v=new VehiclePhysics('tinny',()=>null,e=>events.push(e));v.x=-200;v.z=-1000;v.y=waveHeight(v.x,v.z,0)+1;v.vy=-3;v.pitch=v.roll=0;v.airborne=true;v.airTime=.5;
 let landed=false;for(let i=0;i<120;i++){v.update(1/60,neutral,i/60);if(!v.airborne){landed=true;assert.ok(lowestHullDepth(v,i/60)>-.04);assert.ok(v.y-waveHeight(v.x,v.z,i/60)>.20);break;}}
 assert.ok(landed);assert.ok(events.some(e=>e.type==='splash'&&e.contacts?.length));
});
test('contact plumes rise outwards from supplied surface points, fall under gravity and keep a fixed packet budget',()=>{
 setSeaState('calm',0,true);const scene=new THREE.Scene(),plume=new JetPlume(scene,new THREE.Texture(),600,1),v={x:0,y:0,z:0,heading:0,vx:0,vz:0,config:VEHICLES.tinny};
 const points=[{x:-.4,z:-.6,nx:-1,ny:0,nz:0,hullContact:true},{x:.4,z:-.6,nx:1,ny:0,nz:0,hullContact:true}].map(p=>({...p,y:waveHeight(p.x,p.z,5)+.04}));plume.burst(points,v,3,5);
 const live=plume.packets.filter(p=>p.active);assert.ok(live.length>0&&live.length<=30);
 for(const p of live){assert.equal(p.y,points.find(q=>q.x===p.x).y);assert.equal(p.birth,5);assert.equal(Math.sign(p.vx),Math.sign(p.x));assert.ok(p.vy>0);assert.ok(plumeTrajectory(p,2).vy<0);assert.equal(p.contact,true);}plume.dispose();
});
