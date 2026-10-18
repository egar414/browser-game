import test from'node:test';
import assert from'node:assert/strict';
import{Fishing,FISHING_LAUNCH,FISHING_SPOTS}from'../src/systems/fishing.js';
import{SportfishingTraffic,SPORTFISHER_ROUTES,bridgeObstruction}from'../src/systems/sportfishing-traffic.js';
import{collision,solids}from'../src/systems/environment.js';
import{WORLD}from'../src/config.js';
import{loadSettings}from'../src/systems/storage.js';
const player=()=>({...FISHING_LAUNCH,speed:0,airborne:false,wipeout:0});
function hook(f,v){assert(f.action(v));for(let i=0;i<600&&f.phase!=='bite';i++)f.update(1/60,v,false);assert.equal(f.phase,'bite');f.action(v);assert.equal(f.phase,'hooked');}
test('offshore grounds and large cruiser routes stay in navigable mapped water',()=>{
 for(const p of FISHING_SPOTS){assert.equal(collision(p.x,p.z,20,0),null);assert(p.x+20<WORLD.maxX&&p.z-20>WORLD.minZ);}
 for(const [name,path]of Object.entries(SPORTFISHER_ROUTES))for(let i=0;i<path.length-(name==='canal'?1:0);i++){const a=path[i],b=path[(i+1)%path.length],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4);for(let j=0;j<=steps;j++){const t=j/steps;assert.equal(collision(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,8,0),null);}}
});
test('fishing needs an offshore cast, a timely hook and managed reel tension',()=>{
 const catches=[],f=new Fishing(c=>catches.push(c),()=>.2),v=player();assert.equal(f.action({...v,x:0,z:0}),false);assert.equal(f.action({...v,speed:5}),false);hook(f,v);
 let reel=true;for(let i=0;i<60*50&&f.active;i++){if(f.tension>.67)reel=false;if(f.tension<.22&&!f.running)reel=true;f.update(1/60,v,reel);}
 assert.equal(f.phase,'landed');assert.equal(catches.length,1);assert(catches[0].kg>0);for(let i=0;i<600;i++)f.update(1/60,v,true);assert.equal(catches.length,1);
});
test('unattended bites, holding reel forever, and driving away cannot farm catches',()=>{
 let caught=0;const f=new Fishing(()=>caught++,()=>.2),v=player();f.action(v);for(let i=0;i<900;i++)f.update(1/60,v,false);assert.equal(f.phase,'escaped');assert.equal(caught,0);
 hook(f,v);for(let i=0;i<1800&&f.active;i++)f.update(1/60,v,true);assert.equal(f.phase,'escaped');assert.equal(caught,0);
 hook(f,v);f.update(1/60,{...v,speed:3},false);assert.equal(f.phase,'idle');assert.equal(caught,0);
 hook(f,v);f.cancel();for(let i=0;i<900;i++)f.update(1/60,v,true);assert.equal(caught,0);
});
test('large boats move, yield, stop when disabled and retain finite wave-following state',()=>{
 const n=solids.length;try{const t=new SportfishingTraffic(collision);solids.push(...t.colliders);t.setEnabled(true);const start=t.status.boats,travelled=t.boats.map(()=>0);let previous=start;for(let i=0;i<15*1200;i++){t.update(1/15,{x:-220,z:-1080},i/15);const now=t.status.boats;now.forEach((b,j)=>travelled[j]+=Math.hypot(b.x-previous[j].x,b.z-previous[j].z));previous=now;}
 for(const [i,b]of t.status.boats.entries()){assert(travelled[i]>300,b.name);assert(Number.isFinite(b.y));assert.equal(collision(b.x,b.z,2,0,t.boats[i].collider),null,b.name);}
 const b=t.boats[0];b.speed=3;const p={x:b.x+Math.sin(b.heading)*15,z:b.z+Math.cos(b.heading)*15};for(let i=0;i<240;i++)t.update(1/60,p,181+i/60);assert(b.speed<.3);
 t.setEnabled(false);const before=t.status;for(let i=0;i<60;i++)t.update(1/60,p,190);assert.deepEqual(t.status,before);assert(t.colliders.every(c=>c.disabled));
 }finally{solids.length=n;}
});
test('fishing records tolerate missing, corrupt and hostile storage values',()=>{
 assert.equal(loadSettings({getItem:()=>'{'}).fishCaught,0);const saved=loadSettings({getItem:()=>JSON.stringify({fishCaught:-4,bestFishKg:1e8,bestFishSpecies:'x'.repeat(200)})});assert.equal(saved.fishCaught,0);assert.equal(saved.bestFishKg,1000);assert.equal(saved.bestFishSpecies.length,50);
});

test('cruiser height blocks a low bridge while smaller boats fit underneath',()=>{
 assert.equal(bridgeObstruction(-8,-744,6.5), 'Minyama Island');assert.equal(bridgeObstruction(-8,-744,3),null);
 assert(bridgeObstruction(-8,-744,5.1));
});

test('sportfisher has distinct heavy handling, stops for low bridges and supports bounded deck walking',async()=>{
 const{VehiclePhysics}=await import('../src/vehicles/physics.js'),{DeckWalk}=await import('../src/vehicles/cruiser.js');
 const v=new VehiclePhysics('cruiser',collision);v.respawnAt(FISHING_LAUNCH,0);for(let i=0;i<240;i++)v.update(1/60,{throttle:1,steer:0},i/60);assert(v.speed>7&&v.speed<12);const heading=v.heading;for(let i=0;i<120;i++)v.update(1/60,{throttle:1,steer:1},4+i/60);assert(v.heading-heading>.25);assert.equal(v.airborne,false);
 const deck=new DeckWalk();assert.equal(deck.toggle(v),false);for(let i=0;i<1200&&v.speed>1;i++)v.update(1/60,{throttle:-1,steer:0},6+i/60);assert(v.speed<1.5);assert(deck.toggle(v));v.deckMode=true;for(let i=0;i<600;i++){v.update(1/60,{throttle:0,steer:0},26+i/60);deck.update(1/60,{steer:-1,throttle:1},false);}assert(v.speed<.01);assert(deck.x<=1.38&&deck.z<=-2.05);const pos=[deck.x,deck.z];deck.update(1,{steer:1,throttle:-1},true);assert.deepEqual([deck.x,deck.z],pos);assert(deck.toggle(v));assert.equal(deck.active,false);
 v.deckMode=false;v.respawnAt({x:-60,z:-744,heading:Math.PI/2},0);for(let i=0;i<1800;i++)v.update(1/60,{throttle:1,steer:0},i/60);assert(v.x<-18,'tower stops before the bridge deck');assert.equal(v.speed,0);
});

test('the helm character fits below the canopy and returns to standing on deck',async()=>{
 const{makeDeckCharacter}=await import('../src/vehicles/wardrobe.js'),THREE=await import('three'),rider=makeDeckCharacter();rider.position.y=3.25;rider.userData.animate(0,0,false,true);rider.updateMatrixWorld(true);
 assert(new THREE.Box3().setFromObject(rider.getObjectByName('head')).max.y<5.3);assert(new THREE.Box3().setFromObject(rider.getObjectByName('foot1')).min.y>=3.74);
 rider.position.y=1.02;rider.userData.animate(0,0,true,false);rider.updateMatrixWorld(true);const feet=new THREE.Box3().setFromObject(rider.getObjectByName('foot1'));assert(feet.min.y>=1);assert(feet.max.y<1.2);
});

test('player and AI cruiser hulls roll toward the water beneath the correct side',async()=>{
 const{VehiclePhysics}=await import('../src/vehicles/physics.js'),{bodyPoint}=await import('../src/vehicles/propulsion.js'),{waveHeight}=await import('../src/config.js');
 const v=new VehiclePhysics('cruiser',collision);v.respawnAt(FISHING_LAUNCH,5);const traffic=new SportfishingTraffic(()=>true);traffic.setEnabled(true);
 for(let i=0;i<360;i++){v.update(1/60,{throttle:0,steer:0},5);traffic.update(1/60,{x:0,z:0},5);}
 for(const boat of [v,...traffic.boats]){const sx=Math.sin(boat.heading),cz=Math.cos(boat.heading),expected=waveHeight(boat.x-cz*1.5,boat.z+sx*1.5,5)-waveHeight(boat.x+cz*1.5,boat.z-sx*1.5,5),left=bodyPoint(boat,[-1.5,0,0]),right=bodyPoint(boat,[1.5,0,0]);assert(Math.abs((left.y-right.y)-expected)<.02,'rendered roll agrees with sampled water');}
});
