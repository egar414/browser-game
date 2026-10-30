import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeVehicle} from '../src/vehicles/models.js';
import {PROPULSION} from '../src/config.js';
import {HULL_WATER_PROFILES} from '../src/systems/hull-water-profiles.js';
test('Seago uses the uploaded mesh for every account with a tapering bow and bounded geometry',()=>{
 for(const access of[{}, {creator:true}]){
  const model=makeVehicle('seago','#3a91ba','classic',access);assert.equal(model.userData.source,'single_color_261030124659_AOMZ.stl');assert.equal(model.userData.sourceTriangles,500000);assert.equal(model.userData.meshTriangles,20000);
  let triangles=0,source;model.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(o.material.vertexColors)source=o;for(const a of['position','normal'])assert([...o.geometry.attributes[a].array].every(Number.isFinite));});assert(triangles<36000);assert(source);
  const p=source.geometry.attributes.position;let beam=0,bow=0;for(let i=0;i<p.count;i++){if(Math.abs(p.getZ(i))<.4)beam=Math.max(beam,Math.abs(p.getX(i)));if(p.getZ(i)>1.45)bow=Math.max(bow,Math.abs(p.getX(i)));}assert(beam>.6);assert(bow<beam*.4,'pointed nose is substantially narrower than midships');assert([...source.geometry.attributes.color.array].every(Number.isFinite));
  assert.deepEqual(model.userData.nozzle.position.toArray(),PROPULSION.seago.nozzleMount);assert(model.userData.bucket.parent);assert(model.userData.rider.parent);
 }
 const profile=HULL_WATER_PROFILES.seago[0],body=profile(.5),tip=profile(.98);assert(Math.abs(tip[0][0])<Math.abs(body[0][0])*.2);
});
test('Seago rider grips follow its real steering bar, with trim and reverse assemblies independent of the hull',()=>{
 const m=makeVehicle('seago','#b83836'),parts=m.userData,v={type:'seago',steer:.7,riderAft:0,surgeAcceleration:0,pitch:0,roll:0};parts.handlebars.rotation.y=-v.steer*.43;parts.rider.userData.update(v,1,parts);
 for(const side of[-1,1]){const expected=new THREE.Vector3(side*.3,0,-.12).applyAxisAngle(new THREE.Vector3(0,1,0),parts.handlebars.rotation.y).add(parts.handlebars.position);assert(parts.rider.getObjectByName(side===1?'right-hand':'left-hand').position.distanceTo(expected)<1e-7);}
 assert.notEqual(parts.nozzle,parts.bucket);assert.equal(parts.nozzle.userData.dynamic,true);assert.equal(parts.handlebars.userData.dynamic,true);
});
