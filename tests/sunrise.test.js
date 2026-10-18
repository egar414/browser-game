import test from'node:test';import assert from'node:assert/strict';
import{DayCycle,dayState,fishingConditions}from'../src/systems/day-cycle.js';
import{Fishing,FISHING_LAUNCH}from'../src/systems/fishing.js';
import{dolphinState}from'../src/systems/dolphins.js';
import{Pedestrians}from'../src/systems/pedestrians.js';
import{VehiclePhysics}from'../src/vehicles/physics.js';
import{setSeaState,PROPULSION,VEHICLES,SPORTFISHER_HEIGHT,WORLD}from'../src/config.js';
import{collision}from'../src/systems/environment.js';
import{loadSettings}from'../src/systems/storage.js';
test('daylight wraps smoothly, fixed presets stay put and dawn/dusk improve bites',()=>{
 const d=new DayCycle('changing');d.hour=23.99;d.update(2);assert(d.hour<.1);d.setMode('sunset');d.update(600);assert.equal(d.hour,18);assert.equal(d.status.label,'SUNSET');assert(dayState(12).sunIntensity>dayState(22).sunIntensity);assert(dayState(6).direction.x>0,'sunrise is east');assert(dayState(18).direction.x<0,'sunset is west');assert(fishingConditions(6).waitMultiplier<fishingConditions(12).waitMultiplier);assert(fishingConditions(18).rareBonus>fishingConditions(12).rareBonus);
 const v={...FISHING_LAUNCH,speed:0},sunrise=new Fishing(()=>{},()=>.93),noon=new Fishing(()=>{},()=>.93);sunrise.hour=6;noon.hour=12;sunrise.action(v);noon.action(v);assert(sunrise.wait<noon.wait);assert.equal(sunrise.fish.name,'Little black marlin');assert.notEqual(noon.fish.name,'Little black marlin');
});
test('Seago reaches its 120 km/h game ceiling with a separate long hull and functional trim',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('seago',()=>null);v.respawnAt({x:-1500,z:3000,heading:Math.PI/2},0);let max=0;
 for(let i=0;i<20*60;i++){v.update(1/60,{throttle:1,steer:0,trim:0,freestyle:false},i/60);max=Math.max(max,v.speed);}
 assert(max*3.6>119&&max*3.6<121);assert.equal(v.drive.kind,'waterjet');assert(VEHICLES.seago.length>VEHICLES.ski.length);assert(PROPULSION.seago.effectiveMass>PROPULSION.ski.effectiveMass);
 v.respawnAt({x:0,z:2000,heading:0},20);for(let i=0;i<7*60;i++)v.update(1/60,{throttle:1,steer:0,trim:1,freestyle:true},20+i/60);assert.equal(v.trimDegrees,19);assert(v.pitch>.6);assert(Number.isFinite(v.y));assert.equal(v.wipeout,0);
 for(let i=0;i<180;i++)v.update(1/60,{throttle:-1,steer:0,trim:-1,freestyle:false},27+i/60);assert(v.pitch<.6);assert(v.trimDegrees<0);
});
test('dolphin pods stay offshore inside the world and periodically leap above the waves',()=>{
 let peak=0;for(let i=0;i<6;i++)for(let t=0;t<40;t+=.1){const p=dolphinState(i,t);assert(Number.isFinite(p.y));assert(p.x>WORLD.minX&&p.x<WORLD.maxX&&p.z>WORLD.minZ&&p.z<WORLD.maxZ);assert.equal(collision(p.x,p.z,2,0),null);peak=Math.max(peak,p.leap);}assert(peak>.98);
});
test('walkers stay on solid pier paths and only actual falling spray causes a temporary tumble',()=>{
 const events=[],p=new Pedestrians(e=>events.push(e));assert.equal(p.people.length,16);const v=new VehiclePhysics('ski',collision),spawn=p.approach(collision);assert(spawn);v.respawnAt(spawn,0);
 for(let i=0;i<120;i++)p.update(1/60,v,i/60);assert.equal(events.length,0);assert(p.people.every(w=>w.fall===0));
 const target=p.people[0];p.flood.emit({x:target.x,y:target.y+2.5,z:target.z,vx:0,vy:-5,vz:0,diameter:.006,lifetime:2},12);for(let i=0;i<60;i++)p.update(1/60,v,2+i/60);assert(events.length>0);assert(p.people.some(w=>w.fall>0));
 for(let i=0;i<360;i++)p.update(1/60,v,3+i/60);assert(p.people.every(w=>w.fall===0));assert(p.people.every(w=>w.progress>=2.5&&w.progress<=w.len-2.5));
});
test('new preferences survive validation and tall towers respect all estimated low bridge clearances',()=>{
 assert(SPORTFISHER_HEIGHT>9);const s=loadSettings({getItem:()=>JSON.stringify({vehicle:'seago',dayMode:'sunrise',camera:2,trimSeago:999})});assert.equal(s.vehicle,'seago');assert.equal(s.dayMode,'sunrise');assert.equal(s.camera,2);assert.equal(s.trimSeago,19);
});

test('a real powered carving fan hits a walker, who then gets back up without free points',()=>{
 setSeaState('calm',0,true);const events=[],people=new Pedestrians(e=>events.push(e)),v=new VehiclePhysics('ski',collision),spawn=people.approach(collision);v.respawnAt(spawn,0);const target=people.people.find(p=>p.id===spawn.targetId);let carve=null,fallen=false;
 for(let i=0;i<900;i++){const ahead=(target.x-v.x)*Math.sin(v.heading)+(target.z-v.z)*Math.cos(v.heading);if(carve===null&&ahead<12)carve=v.heading;const turning=carve!==null&&Math.abs(v.heading-carve)<1;v.update(1/60,{throttle:carve===null||turning?1:0,steer:turning?-1:0,trim:0,freestyle:turning},i/60);people.update(1/60,v,i/60);fallen ||= people.people.some(p=>p.fall>0);}
 assert(fallen);assert.equal(events.length,1);assert(events.every(e=>!e.points));assert(people.people.every(p=>p.fall===0));
});

test('cockpit fishing keeps a boat-motion anchor while casting along the character’s heading',()=>{
 const f=new Fishing(()=>{},()=>.2),v={...FISHING_LAUNCH,speed:0},cast={x:v.x-2,z:v.z+1,heading:v.heading+Math.PI};assert(f.action(v,cast));assert.deepEqual(f.castOrigin,cast);assert.equal(f.origin.x,v.x);assert.equal(f.origin.z,v.z);f.update(.5,v,false);assert(f.active);f.update(.1,{...v,x:v.x+12},false);assert.equal(f.active,false);
});
