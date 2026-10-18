import test from 'node:test';
import assert from 'node:assert/strict';
import{CruisePath,LocalTraffic}from'../src/systems/local-traffic.js';
import{VehiclePhysics}from'../src/vehicles/physics.js';
import{collision,solids}from'../src/systems/environment.js';
import{setSeaState,VEHICLES}from'../src/config.js';
import{loadSettings}from'../src/systems/storage.js';
import{makeVehicle}from'../src/vehicles/models.js';
import * as THREE from'three';
const idle={throttle:0,steer:0,trim:0,freestyle:false};
function fleet(type='ski'){
 setSeaState('calm',0,true);const events=[],player=new VehiclePhysics(type,collision),traffic=new LocalTraffic(collision,e=>events.push(e));
 solids.push(...traffic.colliders);traffic.setEnabled(true);return{traffic,player,events};
}
test('open canal patrol follows both directions and wraps without crossing the end',()=>{
 const p=new CruisePath([[0,0],[0,50],[0,100]],false);assert.equal(p.length,200);
 assert.equal(p.at(25).z,25);assert.equal(p.at(125).z,75);assert.equal(p.at(225).z,25);
 assert.equal(p.follow(0,74,124),126);assert.equal(p.follow(0,26,24),26);
});
test('ten locals cruise mapped water, pass in canals and do not flood from inactivity',()=>{
 const n=solids.length;try{
  const{traffic:t,player:p,events}=fleet(),initial=t.status.boats;
  for(let i=0;i<120*60;i++)t.update(1/60,p,i/60);
  for(const [i,b]of t.status.boats.entries()){
   assert(Math.hypot(b.x-initial[i].x,b.z-initial[i].z)>100,b.name);assert(b.speed>1,b.name);assert.equal(b.recoveries,0,b.name);assert.equal(b.water,0);assert.equal(b.sinking,0);
  }
  assert.equal(events.length,0);const stopped=t.status;t.setEnabled(false);for(let i=0;i<120;i++)t.update(1/60,p,121+i/60);
  assert.deepEqual(t.status.boats,stopped.boats);assert(t.colliders.every(c=>c.disabled));t.setEnabled(true);assert(t.colliders.every(c=>!c.disabled));
 }finally{solids.length=n;}
});
test('all three playable craft can land an actual powered spray on a moving local',()=>{
 const n=solids.length;try{
  for(const type of ['ski','tinny','cat']){
   solids.length=n;const{traffic:t,player:p,events}=fleet(type);
   for(let i=0;i<300;i++)t.update(1/60,p,i/60);
   const spawn=t.meetPosition(p);assert(spawn);assert.equal(collision(spawn.x,spawn.z,2),null);p.respawnAt(spawn,5);
   const target=t.boats.reduce((a,b)=>Math.hypot(a.v.x-p.x,a.v.z-p.z)<Math.hypot(b.v.x-p.x,b.v.z-p.z)?a:b);
   let carve=null,done=false,peak=0,reaction=0;
   for(let i=0;i<720;i++){
    const dx=target.v.x-p.x,dz=target.v.z-p.z,ahead=dx*Math.sin(p.heading)+dz*Math.cos(p.heading);
    if(!carve&&ahead<5)carve={heading:p.heading};if(carve&&carve.heading-p.heading>.8)done=true;
    const turning=carve&&!done;p.update(1/60,{...idle,throttle:done?0:1,steer:turning?-1:0,freestyle:!!turning},5+i/60);t.update(1/60,p,5+i/60);
    peak=Math.max(peak,...t.status.boats.map(b=>b.water));reaction=Math.max(reaction,...t.status.boats.map(b=>b.reaction));
   }
   assert(peak>3,type);assert.equal(reaction,1);assert.equal(p.wipeout,0);assert(events.some(e=>e.type==='local-soaked'));assert(events.every(e=>e.points===undefined));
  }
 }finally{solids.length=n;}
});
test('moving receivers reindex falling packets, reject old positions and reset swamping without points',()=>{
 const n=solids.length;try{
  const{traffic:t,player:p,events}=fleet(),b=t.boats[0],f=b.flood;
  f.x+=80;f.deckY=.6;t.flood.reindex();
  t.flood.emit({x:b.v.x,y:.7,z:b.v.z,vx:0,vy:-5,vz:0,diameter:.006},55);t.flood.update(1/30,p,0,false);assert.equal(f.water,0);
  t.flood.emit({x:f.x,y:.7,z:f.z,vx:0,vy:-5,vz:0,diameter:.006},55);t.flood.update(1/30,p,0,false);
  assert.equal(f.water,55);assert.equal(events[0].type,'local-swamped');assert.equal(events[0].points,undefined);
  for(let i=0;i<17*60;i++)t.flood.update(1/60,p,i/60,false);
  assert.equal(f.resetIn,0);assert.equal(f.water,0);assert.equal(f.sinking,0);assert.equal(events.length,1);
 }finally{solids.length=n;}
});
test('local driver ducks when soaked while the tiller hand remains connected',()=>{
 const model=makeVehicle('tinny','#bdc9cc'),v=new VehiclePhysics('tinny'),r=model.userData.rider;
 r.userData.update(v,1,model.userData);const dry=r.userData.balance;v.sprayReaction=1;r.userData.update(v,1,model.userData);
 assert.equal(r.userData.balance.soaked,1);assert.equal(dry.soaked,0);assert(r.userData.balance.hip[1]<dry.hip[1]);
 const motor=model.userData.motor,expected=new THREE.Vector3(-.32,.27,.54).applyEuler(motor.rotation).add(motor.position);
 assert(r.getObjectByName('right-hand').position.distanceTo(expected)<1e-6);assert.equal(v.config,VEHICLES.tinny);
});
test('local traffic preference defaults on and safely validates saved settings',()=>{
 assert.equal(loadSettings({getItem:()=>null}).locals,true);assert.equal(loadSettings({getItem:()=>'{"locals":false}'}).locals,false);
 assert.equal(loadSettings({getItem:()=>'{"locals":"false"}'}).locals,true);assert.equal(loadSettings({getItem:()=>'{broken'}).locals,true);
});
