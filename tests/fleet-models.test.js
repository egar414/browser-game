import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeVehicle} from '../src/vehicles/models.js';
import {buildTender,TENDER_SECTIONS} from '../src/vehicles/tender.js';
import {marineStation,marineSurface,marineHullGeometry} from '../src/vehicles/marine-hull.js';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {waveHeight,setSeaState,VEHICLES,PROPULSION} from '../src/config.js';

test('the upgraded fleet stays within the existing Wasp-class player geometry budget with finite surfaces and animation attachments',()=>{
 for(const type of ['tinny','dinghy','skua','cat','seago','hyper','racer','dive','rib','cruiser']){
  const m=makeVehicle(type,'#b9c3c8','classic',{creator:true});let triangles=0,draws=0;
  m.traverse(o=>{if(!o.isMesh)return;draws++;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;triangles+=(o.geometry.index?.count||p.count)/3;for(const values of [p.array,n.array])assert.ok([...values].every(Number.isFinite),type);});
  assert.ok(triangles<48000,`${type}: ${triangles} triangles`);assert.ok(draws<=54,`${type}: ${draws} draws`);assert.equal(m.userData.waterMaskType,type);assert.ok(m.userData.rider);assert.equal(m.userData.modelRevision,'fleet-craft-2');
  if(['tinny','dinghy','skua','cat'].includes(type)){assert.deepEqual(m.userData.motor.position.toArray(),PROPULSION[type].motorMount);assert.ok(m.userData.propeller.parent);}
 }
});
test('curved tender sections remain symmetric and bounded, with actual inside plate thickness and separate benches',()=>{
 for(let i=0;i<=80;i++){
  const t=i/80,s=marineStation(TENDER_SECTIONS,t);assert.ok(s[1]>0&&s[1]<=.59001);
  for(const u of[.2,.62,.8,1]){const a=marineSurface(TENDER_SECTIONS,t,-u),b=marineSurface(TENDER_SECTIONS,t,u);assert.ok(Math.abs(a.x+b.x)<1e-9);assert.equal(a.y,b.y);}
 }
 const g=marineHullGeometry(TENDER_SECTIONS,{ratio:.76,rise:.06,thickness:.005});assert.equal(g.userData.thickness,.005);const model=buildTender();assert.equal(model.userData.benches.length,2);assert.ok(model.userData.hull.children.length);assert.ok(model.userData.structure.children.length);assert.ok(model.userData.benches.every(b=>b.children.length&&b.userData.fullWidth));
 const moored=buildTender('#bdc9cc','classic',{detail:'moored'});let cost=0;moored.traverse(o=>{if(o.isMesh)cost+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert.ok(cost<15000,'instanced moorings use the lighter hull variant');
});
test('Wasp floats eight centimetres higher at rest while preserving its planing height, speed class and submerged propeller',()=>{
 setSeaState('calm',0,true);const float=(lift)=>{const v=new VehiclePhysics('angler',()=>null);v.config={...VEHICLES.angler,restLift:lift};v.x=-200;v.z=-1000;v.heading=0;for(let i=0;i<600;i++)v.update(1/60,{throttle:0,steer:0},i/60);return v;};
 const normal=float(0),raised=float(.08);assert.ok(raised.y-normal.y>.075&&raised.y-normal.y<.085);
 assert.ok(Number.isFinite(raised.y));assert.equal(VEHICLES.angler.maxSpeed,VEHICLES.skua.maxSpeed);assert.equal(VEHICLES.angler.rideHeight,VEHICLES.skua.rideHeight);
 const point=new THREE.Vector3(...PROPULSION.angler.motorMount).add(new THREE.Vector3(...PROPULSION.angler.propeller));assert.ok(raised.y+point.y<waveHeight(raised.x,raised.z,10)-.08);
});
