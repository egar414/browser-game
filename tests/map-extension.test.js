import test from 'node:test';
import assert from 'node:assert/strict';
import{mapData,landAt}from'../src/systems/geography.js';
import{collision,solids}from'../src/systems/environment.js';
import{bridgeLayout}from'../src/systems/bridge-layout.js';
import{UPSTREAM_LAUNCH,WORLD,FIXED_STEP}from'../src/config.js';
import{VehiclePhysics}from'../src/vehicles/physics.js';

test('extended source coverage retains mapped houses, pools, pedestrian widths and real bridge names',()=>{
 assert(WORLD.maxZ>3700&&WORLD.minX<-2400);assert(mapData.buildings.length>700);assert(mapData.pools.length>40);
 assert(mapData.source.extract_sha256['mooloolaba-map-upstream']);assert(mapData.source.extract_sha256['mooloolaba-map-west']);
 const walking=mapData.bridges.find(b=>b.name==='Mooloolaba Walk and Ride Bridge');assert(walking);assert.equal(walking.w,5);assert.equal(walking.widthSource,'mapped width');
 assert(mapData.bridges.some(b=>b.name==='McKenzies Bridge'));assert(mapData.bridges.some(b=>b.kind==='motorway'));
 for(const b of mapData.bridges){if(b.pairedRoad)assert.equal(b.gameDeckTop,mapData.bridges.find(r=>r.id===b.pairedRoad).gameDeckTop);assert(b.w>=2&&b.w<=25);assert.equal(b.clearanceSource,'gameplay estimate');}
 for(const p of mapData.pools)assert(p.points.length>=4);
});
test('bridge road approaches connect to mapped endpoints and overhead decks leave surface passages open',()=>{
 let approaches=0;
 for(const b of mapData.bridges){
  const plan=bridgeLayout(b,landAt,mapData.roads);assert(plan.passages.length);approaches+=plan.approaches.length;
  for(const ramp of plan.approaches){assert(ramp.ya>=ramp.yb-.001);assert(ramp.yb>=.69);}
  for(const [x,z]of plan.passages){assert.equal(collision(x,z,2,0),null,b.name);assert.equal(collision(x,z,.1,plan.clearance+.1),'Bridge deck');assert.equal(collision(x,z,.1,12),null);}
 }
 assert(approaches>15);assert(solids.some(s=>s.name==='Bridge deck'&&s.minY>4));
});
test('all three craft can launch and drive in the newly added Wyuna reach without a shoreline reset',()=>{
 assert(UPSTREAM_LAUNCH.z>2100);assert.equal(collision(UPSTREAM_LAUNCH.x,UPSTREAM_LAUNCH.z,12),null);
 for(const type of ['ski','cat','tinny']){
  const events=[],v=new VehiclePhysics(type,collision,e=>events.push(e));v.respawnAt(UPSTREAM_LAUNCH);
  for(let i=0;i<240;i++)v.update(FIXED_STEP,{throttle:1,steer:0,freestyle:false,trim:0},i*FIXED_STEP);
  assert(v.speed>8,type);assert(v.z>2100&&v.z<UPSTREAM_LAUNCH.z);assert.equal(collision(v.x,v.z,1),null);assert(!v.wipeout);assert(!events.some(e=>e.type==='bump'||e.type==='boundary'));
 }
});
