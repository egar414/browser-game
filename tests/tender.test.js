import test from 'node:test';
import assert from 'node:assert/strict';
import{tenderTurn}from'../src/vehicles/tender-handling.js';
import{VehiclePhysics}from'../src/vehicles/physics.js';
import{VEHICLES,PROPULSION,TINNY_HANDLING,CAT_HANDLING,waveHeight,setSeaState}from'../src/config.js';
import{sprayState,launchSpray}from'../src/systems/spray-model.js';
import{buildTender}from'../src/vehicles/tender.js';
import{makeVehicle}from'../src/vehicles/models.js';
import{loadSettings}from'../src/systems/storage.js';
import{bodyPoint}from'../src/vehicles/propulsion.js';
import{createMooredTinnies}from'../src/systems/moored-boats.js';
import{MooringFlood,MOORING_FLOOD,insideTender}from'../src/systems/mooring-flood.js';
import{mappedResidentialHomes,planResidentialMoorings,pontoonApproach}from'../src/systems/residential-moorings.js';
import{mapData}from'../src/systems/geography.js';
import{collision,solids}from'../src/systems/environment.js';
import * as THREE from 'three';
const input={throttle:0,steer:0,trim:0,freestyle:false};
function advance(v,seconds,keys={},start=0){for(let i=0;i<seconds*60;i++)v.update(1/60,{...input,...keys},start+i/60);}
function attacker(type='tinny'){
 return{type,config:VEHICLES[type],x:0,y:.14,z:0,heading:0,speed:13,vx:0,vz:13,vy:0,throttle:1,slip:-8,yawRate:1,lateralAcceleration:-6,pitch:0,roll:0,planing:.8,drive:{flow:.16,reverse:0,trimAngle:0,steeringAngle:.4,exitSpeed:25,wetness:1},airborne:false};
}
function balancedBow(v,seconds,start=0,steer=0){
 let power=v.throttle>.5?1:0;for(let i=0;i<seconds*60;i++){
  if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;
  v.update(1/60,{...input,throttle:power,steer,freestyle:true},start+i/60);
 }
}
test('25 hp tender has its own bounded planing, powered slide, braking and reverse',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('tinny');v.x=-200;v.z=-1000;v.heading=0;
 assert.equal(v.config.length,2.25);assert.equal(PROPULSION.tinny.shaftPower,18640);
 advance(v,6,{throttle:1});assert(v.speed>9&&v.speed<16);assert(v.planing>.9);
 const heading=v.heading;let peakSpray=0;for(let i=0;i<90;i++){v.update(1/60,{...input,throttle:1,steer:1,freestyle:true},6+i/60);peakSpray=Math.max(peakSpray,sprayState(v,false,6+i/60).left);}
 const turnDelta=v.heading-heading;assert(turnDelta>1);assert(Math.abs(v.slip)>5);assert(peakSpray>1.5);
 advance(v,14,{throttle:-1},7.5);const forward=v.vx*Math.sin(v.heading)+v.vz*Math.cos(v.heading);assert(forward<-.7&&v.speed<3.8);
 const coast=new VehiclePhysics('tinny');coast.x=-200;coast.z=-1000;advance(coast,6,{throttle:1});const h=coast.heading;advance(coast,1.5,{steer:1},6);assert(coast.heading-h<turnDelta);
});
test('tender trim, stern-supported bow riding and four-point buoyancy stay stable',()=>{
 const v=new VehiclePhysics('tinny');v.x=-200;v.z=-1000;v.heading=0;
 balancedBow(v,5);assert(v.pitch>.65&&v.pitch<v.config.wipeoutAngle);assert.equal(v.wipeout,0);
 advance(v,3,{throttle:1,trim:1},5);assert.equal(v.trimDegrees,8);assert(Number.isFinite(v.roll));
 v.recover();let error=0;for(let i=0;i<600;i++){v.update(1/60,input,i/60);if(i>300)error+=Math.abs(v.y-waveHeight(v.x,v.z,i/60)-v.config.rideHeight);}assert(error/299<.15);
 const saved=loadSettings({getItem:()=>JSON.stringify({vehicle:'tinny',trimTinny:6})});assert.equal(saved.vehicle,'tinny');assert.equal(saved.trimTinny,6);
});
test('reference tender is an open alloy hull and rider stays attached to its steered tiller',()=>{
 const shell=buildTender(),bounds=new THREE.Box3().setFromObject(shell);assert(bounds.getSize(new THREE.Vector3()).z>2.25);assert(shell.getObjectByName('25 hp outboard'));
 const model=makeVehicle('tinny','#bdc9cc'),v=attacker();v.riderAft=1;v.steer=.7;v.surgeAcceleration=4;v.pitch=.7;
 model.userData.motor.rotation.set(.1,-.4,0,'YXZ');model.userData.rider.userData.update(v,1,model.userData);
 const expected=new THREE.Vector3(-.32,.27,.54).applyEuler(model.userData.motor.rotation).add(model.userData.motor.position),hand=model.userData.rider.getObjectByName('right-hand');assert(hand.position.distanceTo(expected)<1e-6);
 const prop=bodyPoint({...v,heading:0,pitch:0,roll:0},[.12,-.38,-1.30]);assert(prop.y<0);
});
test('falling spray from every craft enters an open tender, sinks it once and resets finitely',()=>{
 for(const type of ['ski','cat','tinny']){
  const events=[],fleet=new MooringFlood([{id:type,x:type==='ski'?6:type==='tinny'?-7:-10,z:type==='ski'?-2:0,heading:0}],e=>events.push(e)),v=attacker(type);
  for(let i=0;i<2100&&!fleet.boats[0].resetIn;i++){v.y=waveHeight(0,0,i/60)+.14;fleet.update(1/60,v,i/60);}
  assert.equal(fleet.boats[0].sinks,1,type);assert.equal(events.length,1);assert.equal(fleet.status[0].water,100);
  const standingWater=fleet.boats[0].water;fleet.clearSpray();for(let i=0;i<120;i++)fleet.update(1/60,v,40+i/60,false);assert(fleet.boats[0].sinking>.4);assert.equal(fleet.boats[0].water,standingWater);
  for(let i=0;i<MOORING_FLOOD.resetSeconds*60;i++)fleet.update(1/60,v,42+i/60,false);assert.equal(fleet.boats[0].water,0);assert.equal(fleet.boats[0].resetIn,0);assert.equal(fleet.boats[0].sinking,0);assert.equal(events.length,1);
 }
});
test('idle, dry, absent and nearby spray cannot magically flood or farm a moored tender',()=>{
 for(const changes of [{speed:0,throttle:0,drive:{flow:0}},{airborne:true},{wipeout:1}]){
  const f=new MooringFlood([{x:0,z:0,heading:0}]),v={...attacker(),...changes};for(let i=0;i<600;i++)f.update(1/60,v,i/60);assert.equal(f.boats[0].water,0);assert.equal(f.boats[0].sinks,0);
 }
 const f=new MooringFlood([{x:40,z:0,heading:0}]);for(let i=0;i<1800;i++)f.update(1/60,attacker(),i/60);assert.equal(f.boats[0].water,0);assert.equal(f.packets.length,MOORING_FLOOD.maxPackets);
 assert(insideTender(0,0,{x:0,z:0,heading:1}));assert(!insideTender(.6,0,{x:0,z:0,heading:0}));
});
test('residential pontoons keep mapped channels, race legs and bridge passages open',()=>{
 const sites=planResidentialMoorings(mappedResidentialHomes());assert(sites.length>15);
 const before=solids.length;try{
  for(const p of sites){
   assert.equal(collision(p.x,p.z,1.5),null);
   const w=mapData.world;assert(p.x>w.minX+35&&p.x<w.maxX-35&&p.z>w.minZ+35&&p.z<w.maxZ-35);
   const c=Math.cos(p.heading),s=Math.sin(p.heading);
   solids.push({name:'House pontoon',a:[p.dock.x-c*3,p.dock.z+s*3],b:[p.dock.x+c*3,p.dock.z-s*3],width:2.5,height:1.05},{name:'House gangway',a:p.shore,b:[p.dock.x,p.dock.z],width:1.15,height:1.05},{name:'Moored tender',x:p.x,z:p.z,w:2.9,d:2.9,height:1.6});
  }
  for(const channel of [...mapData.channels,{name:'Race',points:mapData.race}])for(let i=1;i<channel.points.length;i++){
   const a=channel.points[i-1],b=channel.points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4);for(let j=0;j<=steps;j++)assert.equal(collision(a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps,2),null,channel.name);
  }
  const boat=sites[0],object={name:'Sunk tender',x:boat.x,z:boat.z,w:2.9,d:2.9,height:1.6,disabled:true};solids.length=before;solids.push(object);assert.equal(collision(boat.x,boat.z,.5),null);
 }finally{solids.length=before;}
});

test('distant moorings retain their simulation while instance counts follow the viewer',()=>{
 const root=new THREE.Group(),collider={disabled:false},render=createMooredTinnies(root,[{x:0,z:0,heading:0},{x:900,z:0,heading:0,collider}],undefined,320);
 render(0,{x:0,z:0});assert.equal(render.visibleCount,1);const drawsNear=root.children.reduce((s,m)=>s+(m.count||0),0);assert(drawsNear>0);
 const remote=render.fleet.boats[1];remote.water=MOORING_FLOOD.capacityLitres;remote.resetIn=3;remote.sinking=.8;
 render.fleet.update(1/60,attacker(),1,false);assert(collider.disabled);render(1,{x:5000,z:0});assert.equal(render.visibleCount,0);assert(root.children.every(m=>m.count===0));assert(remote.water>0);
 render(1,{x:900,z:0});assert.equal(render.visibleCount,1);assert(root.children.some(m=>m.count>0));
 for(let i=0;i<240;i++)render.fleet.update(1/60,attacker(),2+i/60,false);assert(!collider.disabled);assert.equal(remote.water,0);
});

test('the pontoon approach gives the tender enough run-up to land a powered side spray across wave phases',()=>{
 setSeaState('calm',0,true);const boat=planResidentialMoorings(mappedResidentialHomes())[0];
 for(const phase of [0,3,10,20,30,60]){
  const v=new VehiclePhysics('tinny'),f=new MooringFlood([boat]);v.respawnAt(pontoonApproach([boat],'tinny',collision),phase);let start,done=false;
  for(let i=0;i<600;i++){
   const t=i/60;if(!start&&v.speed>7)start={heading:v.heading};if(start&&start.heading-v.heading>.8)done=true;const turning=!!start&&!done;
   v.update(1/60,{...input,throttle:done?0:1,steer:turning?-1:0,freestyle:turning},phase+t);f.update(1/60,v,phase+t);
  }
  assert(f.status[0].water>28,`clean spray pass should leave useful flooding at wave phase ${phase}`);
 }
});

test('loaded tender turns kick the stern and settle without a separate turn-bounce cycle',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('tinny');v.x=-200;v.z=-1000;v.heading=0;advance(v,6,{throttle:1});const h=v.heading;let low=Infinity,high=-Infinity,maxSlip=0;
 for(let i=0;i<240;i++){
  v.update(1/60,{...input,throttle:1,steer:1,freestyle:true},6+i/60);maxSlip=Math.max(maxSlip,Math.abs(v.slip));assert(!v.airborne&&!v.wipeout);
  if(i>60){const pivot=Math.sin(Math.max(0,v.pitch))*v.config.length*TINNY_HANDLING.sternSupport*Math.max(0,Math.min(1,(v.pitch-.18)/.4)),heave=v.y-waveHeight(v.x,v.z,6+i/60)-v.config.rideHeight-pivot;low=Math.min(low,heave);high=Math.max(high,heave);}
 }
 // More visible catch/drop travel is intentional in the supplied video reference.
 assert(v.heading-h>6);assert(maxSlip>10);assert(high-low>.25&&high-low<.65);assert(v.sprayTurnLoad<.01);
 advance(v,2,{throttle:1},10);assert(v.sprayTurnLoad<.001);assert(Math.abs(v.slip)<1.5);assert(Math.abs(v.roll)<.15);assert(!v.airborne&&!v.wipeout);
});
test('tender bounce needs powered wet steering load; idle, gentle steering and airtime cannot trigger it',()=>{
 for(const changes of [{speed:0},{throttle:0},{steer:0},{airborne:true},{wipeout:1},{drive:{wetness:0}}]){
  const v={...attacker(),steer:1,config:VEHICLES.tinny,...changes};for(let i=0;i<120;i++){const turn=tenderTurn(v,{freestyle:true},1/60);assert.equal(turn.lift,0);assert.equal(turn.pitch,0);assert.equal(Math.abs(turn.roll),0);}
 }
 const v={...attacker(),steer:.2,config:VEHICLES.tinny};for(let i=0;i<120;i++)assert.equal(tenderTurn(v,{freestyle:false},1/60).lift,0);
});

test('tinny spray stays a compact falling fan under a fixed loaded turn',()=>{
 setSeaState('calm',0,true);const v=attacker(),state=sprayState(v,false,0),drop=launchSpray(v,state,-1,()=>.5);
 assert(Math.abs(drop.vx)>7&&Math.abs(drop.vx)<9.5);assert(drop.vy>4&&drop.vy<7);assert(drop.lifetime>0&&drop.lifetime<3.4);
});

test('clip-inspired outboards lift early, hold a stern-supported bow and retain powered steering',()=>{
 setSeaState('calm',0,true);
 for(const type of ['tinny','cat']){
  const v=new VehiclePhysics(type);v.x=-200;v.z=-1000;v.heading=0;
  if(type==='tinny')balancedBow(v,3);else advance(v,3,{throttle:1,freestyle:true});assert(v.pitch>(type==='tinny'?.85:.90),`${type}: early bow lift`);
  for(let i=0;i<900;i++){
   if(type==='tinny')balancedBow(v,1/60,3+i/60);else v.update(1/60,{...input,throttle:1,freestyle:true},3+i/60);
   assert(!v.airborne&&!v.wipeout);assert(v.pitch>.65&&v.pitch<v.config.wipeoutAngle);
   const deck=bodyPoint(v,[0,type==='cat'?.5:.38,type==='cat'?-1.38:-.90]);assert(deck.y>waveHeight(deck.x,deck.z,3+i/60),`${type}: stern remains supported`);
  }
  const heading=v.heading;if(type==='tinny')balancedBow(v,2,18,.4);else advance(v,2,{throttle:1,steer:.4,freestyle:true},18);
  assert(v.heading-heading>.5);assert(v.pitch>.4);assert(!v.airborne&&!v.wipeout);
  advance(v,3,{throttle:1},20);assert(Math.abs(v.pitch)<.25);assert(Math.abs(v.slip)<1);assert(!v.wipeout);
 }
});

test('Thundercat loaded turns catch and rock without acquiring tender-like instant rotation or flight',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('cat');v.x=-200;v.z=-1000;v.heading=0;
 advance(v,6,{throttle:1});const h=v.heading;let min=Infinity,max=-Infinity,peakFan=0;
 for(let i=0;i<240;i++){
  const t=6+i/60;v.update(1/60,{...input,throttle:1,steer:1,freestyle:true},t);
  assert(!v.airborne&&!v.wipeout);assert(Math.abs(v.yawRate)<=CAT_HANDLING.slideYawLimit+.0001);
  const s=sprayState(v,false,t);peakFan=Math.max(peakFan,s.left,s.right);
  if(i>60){const stern=bodyPoint(v,[0,0,-v.config.length*CAT_HANDLING.sternSupport]),height=stern.y-waveHeight(stern.x,stern.z,t);min=Math.min(min,height);max=Math.max(max,height);}
 }
 assert(v.heading-h>4&&v.heading-h<6);assert(max-min>.2&&max-min<.8);assert(peakFan>1);
 advance(v,3,{throttle:1},10);assert(v.sprayTurnLoad<.001);assert(Math.abs(v.roll)<.2);assert(Math.abs(v.slip)<1.5);
});

test('ordinary sharp tinny turns retain powered steering without artificial bounce',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('tinny');v.x=-200;v.z=-1000;v.heading=0;advance(v,6,{throttle:1});const heading=v.heading;
 for(let i=0;i<180;i++){v.update(1/60,{...input,throttle:1,steer:1},6+i/60);assert.equal(v.bounceLoad,0);assert.equal(v.sprayTurnLoad,0);assert(!v.wipeout&&!v.airborne);}
 assert(v.heading-heading>2);advance(v,4,{throttle:1},9);assert(Math.abs(v.pitch)<.15);assert(Math.abs(v.roll)<.15);assert(Math.abs(v.slip)<1);
});
