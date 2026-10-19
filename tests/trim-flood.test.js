import test from 'node:test';
import assert from 'node:assert/strict';
import { MooringFlood } from '../src/systems/mooring-flood.js';
import { plumeTrajectory } from '../src/systems/jet-plume.js';
import { jetPlumeSource,pumpDischarge,sprayState } from '../src/systems/spray-model.js';
import { VEHICLES,setSeaState,waveHeight } from '../src/config.js';
import { SportfishingTraffic,BIG_BOAT_FLOOD } from '../src/systems/sportfishing-traffic.js';
import { VehiclePhysics } from '../src/vehicles/physics.js';
const sourceCraft=type=>({type,config:VEHICLES[type],x:2300,y:.14,z:-2600,heading:0,pitch:0,roll:0,vx:0,vy:0,vz:0,speed:8,throttle:1,steer:0,yawRate:0,slip:0,planing:1,airborne:false,wipeout:0,drive:{flow:.16,reverse:0,trimAngle:.3,steeringAngle:0,exitSpeed:35,wetness:1}});
function landing(v){const source=jetPlumeSource(v,pumpDischarge(v),0,sprayState(v)),initial={...source.origin,vx:source.velocity.x,vy:source.velocity.y,vz:source.velocity.z,drag:.32};for(let age=.1;age<4.8;age+=.005){const q=plumeTrajectory(initial,age);if(q.vy<0&&q.y<1.45)return q;}throw Error('No falling plume');}
test('rear trim plume flooding follows the rendered ballistic path, including Apex hits over 65 metres away',()=>{
 setSeaState('calm',0,true);for(const type of ['ski','seago','hyper']){const v=sourceCraft(type),hit=landing(v),f=new MooringFlood([{x:hit.x,z:hit.z,heading:0,deckY:1.45,width:3.2,length:3.8}]);if(type==='hyper')assert(Math.hypot(hit.x-v.x,hit.z-v.z)>65);for(let i=0;i<600&&!f.boats[0].sinks;i++)f.update(1/60,v,i/60);assert.equal(f.boats[0].sinks,1,type);assert.equal(sprayState(v).rate,0,'no sharp-turn fan was needed');}
});
test('detached rear water continues on the visible path after release; nearby misses, rising water and dry jets do not fill',()=>{
 setSeaState('calm',0,true);const v=sourceCraft('hyper'),hit=landing(v),f=new MooringFlood([{x:hit.x,z:hit.z,heading:0,deckY:1.45,width:3.2,length:3.8}]);f.update(.05,v,0);const packet=f.packets.find(p=>p.life>0&&p.ballistic);assert(packet);const expected=plumeTrajectory(packet.ballistic,packet.age);assert(Math.abs(packet.z-expected.z)<1e-9);for(let i=1;i<300;i++)f.update(1/60,{...v,throttle:0,drive:{flow:0}},i/60);assert(f.boats[0].water>0||f.boats[0].sinks>0);
 const miss=new MooringFlood([{x:hit.x+12,z:hit.z,heading:0,deckY:1.45}]);for(let i=0;i<480;i++)miss.update(1/60,v,i/60);assert.equal(miss.boats[0].water,0);
 for(const change of[{airborne:true},{wipeout:1},{throttle:0,drive:{flow:0}}]){const dry=new MooringFlood([{x:hit.x,z:hit.z,heading:0,deckY:1.45}]);for(let i=0;i<120;i++)dry.update(1/60,{...v,...change},i/60);assert.equal(dry.cursor,0);}
});
test('big-boat cockpit catches falling water, cabin/foredeck misses, and a full hull disables collision then resets',()=>{
 setSeaState('calm',0,true);const events=[],traffic=new SportfishingTraffic(()=>null,e=>events.push(e)),b=traffic.boats[0],f=b.flood;
 traffic.update(1/60,{x:b.x,z:b.z},0);const z=(f.captureRect.minZ+f.captureRect.maxZ)/2;
 const point=localZ=>({x:b.x+Math.sin(b.heading)*localZ,y:f.deckY+.2,z:b.z+Math.cos(b.heading)*localZ,vx:0,vy:-4,vz:0,diameter:.006});
 traffic.flood.emit(point(1),400);for(let i=0;i<20;i++)traffic.update(1/60,{x:b.x,z:b.z},i/60);assert.equal(f.water,0,'closed cabin and foredeck do not collect water');
 traffic.flood.emit(point(z),BIG_BOAT_FLOOD.capacityLitres+1);for(let i=0;i<80;i++)traffic.update(1/60,{x:b.x,z:b.z},1+i/60);assert.equal(f.sinks,1);assert(f.resetIn>0&&f.sinking>.2);assert(b.collider.disabled);assert.equal(events.length,1);assert.equal(b.speed,0);
 for(let i=0;i<26*60;i++)traffic.update(1/60,{x:-10000,z:-10000},3+i/60);assert.equal(f.resetIn,0);assert.equal(f.sinking,0);assert.equal(f.water,0);assert(!b.collider.disabled);assert.equal(events.length,1);
});
test('normal Apex drive passes can accumulate enough rear-plume water to sink a moving sportfisher',()=>{
 setSeaState('calm',0,true);const events=[],traffic=new SportfishingTraffic(()=>null,e=>events.push(e)),v=new VehiclePhysics('hyper');let time=0;
 for(let pass=0;pass<12&&!events.length;pass++){v.respawnAt(traffic.meetPosition(v),time);traffic.flood.clearSpray();for(let i=0;i<540;i++){v.update(1/60,{throttle:i<120?1:0,steer:0,trim:0},time);traffic.update(1/60,v,time);time+=1/60;}}
 assert(events.some(e=>e.label.includes('swamped')));assert(traffic.boats.some(b=>b.flood.sinks>0));assert(traffic.flood.packets.length<=1024);
});

test('trim spray collects across its wet core, contributes identifiable water and resets that contribution',async()=>{
 const {sprayCapture}=await import('../src/systems/mooring-flood.js');const target={x:0,z:0,heading:0};assert(sprayCapture(.6,0,target,.65)>0);assert(sprayCapture(.6,0,target,.65)<1);assert.equal(sprayCapture(3,0,target,.65),0);
 setSeaState('calm',0,true);for(const type of['ski','seago','hyper']){const v=sourceCraft(type),hit=landing(v),f=new MooringFlood([{x:hit.x,z:hit.z,heading:0,deckY:1.45,width:3.2,length:3.8}]);for(let i=0;i<600&&!f.boats[0].sinks;i++)f.update(1/60,v,i/60);assert(f.boats[0].rearWater>0,type);assert.equal(f.boats[0].sinks,1);for(let i=0;i<17*60;i++)f.update(1/60,{...v,throttle:0,drive:{flow:0}},10+i/60);assert.equal(f.boats[0].rearWater,0);}
});
