import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildTender} from '../src/vehicles/tender.js';
import {makeVehicle} from '../src/vehicles/models.js';
import {PROPULSION} from '../src/config.js';
test('225 Tender uses the supplied STL with separate benches and an independently animated outboard',()=>{
 const hull=buildTender();assert.equal(hull.userData.source,'single_color_261030100313_WUGV.stl');assert.equal(hull.userData.sourceTriangles,500000);assert.equal(hull.userData.meshTriangles,20000);
 assert.equal(hull.userData.benches.length,2);assert.notEqual(hull.userData.benches[0],hull.userData.benches[1]);
 let triangles=0;hull.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert([...o.geometry.attributes.normal.array].every(Number.isFinite));});assert(triangles<30000);
 for(const access of[{}, {creator:true}]){const model=makeVehicle('tinny','#bdc9cc','classic',access);assert.equal(model.userData.referenceHull.userData.source,hull.userData.source);assert.deepEqual(model.userData.motor.position.toArray(),PROPULSION.tinny.motorMount);assert(model.userData.rider&&model.userData.passenger&&model.userData.propeller.parent);}
 const bounds=new THREE.Box3().setFromObject(hull.userData.hull);assert(bounds.max.z>1.10&&bounds.min.z<-1.10);assert(bounds.max.x-bounds.min.x>1.1);
});
test('moored Tender uses the same uploaded hull with a smaller mesh and retains real interior geometry',()=>{
 const model=buildTender('#bdc9cc','classic',{detail:'moored'});assert.equal(model.userData.meshTriangles,5500);assert.equal(model.userData.sourceTriangles,500000);let total=0;model.traverse(o=>{if(o.isMesh)total+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert(total<15000);assert(model.userData.structure.children[0].geometry.index.count>100);
});
