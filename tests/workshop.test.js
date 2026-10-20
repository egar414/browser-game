import test from 'node:test';import assert from 'node:assert/strict';
import {WorkshopEconomy,UPGRADES} from '../src/systems/workshop-economy.js';
import {canDock,wharfPoint} from '../src/systems/dry-wharf.js';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {VEHICLES,SPAWN} from '../src/config.js';
import {collision} from '../src/systems/environment.js';
import * as THREE from 'three';import {Activities} from '../src/systems/activities.js';
const store=()=>{const m=new Map();return{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
test('tricks earn spendable money once, non-tricks and duplicate spam do not; progress survives reload and is separate for accounts',()=>{
 const storage=store(),w=new WorkshopEconomy(storage);assert.equal(w.earn('Spray carve',75,0),15);assert.equal(w.earn('Spray carve',75,1),0);assert.equal(w.earn('Tender swamped',150,4),0);assert.equal(w.earn('Clean air',0,4),0);assert.equal(w.earn('Clean air',200,4),40);assert.equal(new WorkshopEconomy(storage).status.balance,55);
 w.switchAccount('Ewan');assert.equal(w.status.balance,0);w.earn('Bow rider',100,5);w.switchAccount('Other');assert.equal(w.status.balance,0);w.switchAccount('Ewan');assert.equal(w.status.balance,20);w.switchAccount(null);assert.equal(w.status.balance,55);
});
test('purchase is atomic, per boat and persistent; stock/reinstall is free and trick gates cannot be bypassed with cash',()=>{
 const storage=store(),w=new WorkshopEconomy(storage);assert.throws(()=>w.transact('tinny','engine'),/more trick money/);w.earn('Clean air',5000,1);w.transact('tinny','engine');assert.equal(w.status.balance,820);assert.equal(w.effects('tinny').power,1.08);assert.equal(w.effects('ski').power,1);assert.throws(()=>w.transact('tinny','pro-engine'),/3 different/);
 w.earn('Spray carve',75,5);w.earn('Bow rider',100,9);w.transact('tinny','pro-engine');assert.equal(w.effects('tinny').power,1.15);const balance=w.status.balance;w.transact('tinny','pro-engine');assert.equal(w.effects('tinny').power,1);w.transact('tinny','pro-engine');assert.equal(w.status.balance,balance);assert.equal(new WorkshopEconomy(storage).effects('tinny').power,1.15);
});
test('corrupt, hostile and unavailable storage stays bounded without granting invalid equipment',()=>{
 const w=new WorkshopEconomy({getItem:()=>JSON.stringify({balance:-1,earned:1e20,moves:{bow:NaN},boats:{ski:{owned:['unknown'],active:{engine:'pro-engine'}}}}),setItem(){throw Error('blocked');}});assert.equal(w.status.balance,0);assert.equal(w.status.earned,1e9);assert.equal(w.effects('ski').power,1);w.earn('Bow rider',100,1);assert.equal(w.status.saved,false);w.switchAccount('Other');w.switchAccount(null);assert.equal(w.status.balance,20);
 assert.equal(new WorkshopEconomy({getItem(){throw Error('blocked');}}).status.balance,0);
});
test('dry wharf accepts every craft only at controlled speed, with no pursuit, wipeout or airborne bypass',()=>{
 for(const type of Object.keys(VEHICLES)){const v={type,...wharfPoint(0,0),speed:2,airborne:false,wipeout:0};assert(canDock(v));for(const change of [{speed:10},{airborne:true},{wipeout:1},{...wharfPoint(9,0)}])assert(!canDock({...v,...change}));assert(!canDock(v,true));}
 for(const x of [-7,0,7])for(const z of [-15,0,15]){const p=wharfPoint(x,z);assert(!collision(p.x,p.z,1,0));}
 assert(Math.hypot(wharfPoint(0,0).x-SPAWN.x,wharfPoint(0,0).z-SPAWN.z)>30);
});
test('workshop engine tuning improves actual acceleration across jet, propeller, cruiser and racer without changing speed ceilings',()=>{
 for(const type of ['ski','tinny','cat','cruiser','racer']){const run=power=>{const v=new VehiclePhysics(type,()=>null);v.x=2300;v.z=-2600;v.heading=0;v.workshop={power};for(let i=0;i<60;i++)v.update(1/60,{throttle:1,steer:0,trim:0},i/60);return v;};const base=run(1),tuned=run(1.15);assert(tuned.speed>base.speed,`${type} acceleration`);assert.equal(tuned.config.maxSpeed,base.config.maxSpeed);assert(Number.isFinite(tuned.y));}
});
test('Activities banks trick cash after its repeat penalty, not from idle frames or wipeout events',()=>{
 const w=new WorkshopEconomy(store()),a=new Activities(new THREE.Scene(),{careerPoints:0},()=>{});a.onTrick=(...args)=>w.earn(...args);a.event({type:'score',label:'Spray carve',points:75});const start=w.status.balance;assert.equal(start,15);a.event({type:'wipeout',label:'Rough landing'});assert.equal(w.status.balance,start);for(let i=0;i<10;i++){a.totalTime+=4;a.event({type:'score',label:'Spray carve',points:75});}const capped=w.status.balance;a.totalTime+=100;a.event({type:'score',label:'Spray carve',points:75});assert.equal(w.status.balance,capped);
});
test('installed steering and ride-control parts change actual handling on each physics family',()=>{
 for(const type of ['ski','tinny','cat','cruiser','racer']){
  const turn=yaw=>{const v=new VehiclePhysics(type,()=>null);Object.assign(v,{x:2300,z:-2600,heading:0,workshop:{yaw}});for(let i=0;i<120;i++)v.update(1/60,{throttle:1,steer:.25,trim:0},i/60);return Math.abs(v.heading);};assert(turn(1.2)>turn(1),`${type} steering kit changes turning`);
  const drop=damping=>{const v=new VehiclePhysics(type,()=>null);Object.assign(v,{x:2300,z:-2600,y:1,vy:-2,heading:0,workshop:{damping}});v.update(1/60,{throttle:0,steer:0,trim:0},0);return v;},a=drop(1),b=drop(1.12);assert(type==='cruiser'?b.y>a.y:b.vy>a.vy,`${type} ride control damps a vertical descent`);
 }
});
test('verified Creator parts are free without trick/video gates, while account switches revoke the transient access',()=>{
 const e=new WorkshopEconomy({getItem:()=>JSON.stringify({balance:0,creator:true}),setItem(){}});assert.equal(e.creator,false);assert.throws(()=>e.transact('ski','pro-engine'));e.switchAccount('owner');e.setCreator(true);assert.equal(e.eligible('ski',UPGRADES.find(u=>u.id==='pro-engine')),'');e.transact('ski','pro-engine');e.transact('dive','pro-steering');assert.equal(e.status.balance,0);assert.equal(e.effects('ski').power,1.15);assert.equal(e.effects('dive').yaw,1.2);e.earn('Bow rider',500,0);e.stowCatch(Array(9).fill('reef-snapper'));assert.equal(e.confiscateCatch().paid,0);assert.equal(e.status.balance,100);e.switchAccount('other');assert.equal(e.creator,false);assert.equal(e.effects('ski').power,1);assert.throws(()=>e.transact('ski','pro-engine'));e.switchAccount('owner');assert.equal(e.creator,false);assert.equal(e.effects('ski').power,1.15);
});
