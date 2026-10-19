import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeSpark} from '../src/vehicles/spark-model.js';
import {PROPULSION} from '../src/config.js';

test('reference-shaped Spark fits its physics envelope with recessed footwells and a raised saddle',()=>{
 const m=makeSpark();m.userData.rider.removeFromParent();m.updateMatrixWorld(true);
 const size=new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());assert(size.x>1.16&&size.x<1.24);assert(size.z>2.85&&size.z<3.15);
 const height=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0)).intersectObject(m,true)[0]?.point.y;
 assert(height(0,-.5)>.68&&height(0,-.5)<.73);
 for(const side of[-1,1])assert(height(side*.44,-.5)>.31&&height(side*.44,-.5)<.34,'feet rest in low open wells');
 let meshes=0,triangles=0;const caps={bow:0,stern:0};m.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal;triangles+=(g.index?.count||p.count)/3;for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));assert(Number.isFinite(n.getX(i))&&Number.isFinite(n.getY(i))&&Number.isFinite(n.getZ(i)));if(Math.abs(p.getZ(i)-1.43)<1e-5&&n.getZ(i)>.99)caps.bow++;if(Math.abs(p.getZ(i)+1.43)<1e-5&&n.getZ(i)<-.99)caps.stern++;}});
 assert(meshes<=22&&triangles<20000,'bounded rigid model cost');assert(caps.bow>0&&caps.stern>0,'outer hull end faces point outwards');
});

test('batching preserves separate steering, trim, reverse gate and rider attachments',()=>{
 const m=makeSpark(),p=m.userData;assert.deepEqual(p.nozzle.position.toArray(),PROPULSION.ski.nozzleMount);assert(p.detailedModel);
 const transforms=[p.handlebars,p.nozzle,p.bucket].map(o=>o.matrix.clone());p.handlebars.rotation.y=-.43;p.nozzle.rotation.set(.25,-.3,0);p.bucket.rotation.x=1.3;p.rider.userData.update({steer:1,riderAft:1,pitch:1},1,p);m.updateMatrixWorld(true);
 for(const[i,o]of[p.handlebars,p.nozzle,p.bucket].entries()){assert(o.children.some(c=>c.isMesh));assert(!o.matrix.equals(transforms[i]));}
 for(const side of[-1,1]){const grip=new THREE.Vector3(side*.3,0,-.12).applyAxisAngle(new THREE.Vector3(0,1,0),-.43).add(p.handlebars.position);const hand=p.rider.getObjectByName(side===1?'right-hand':'left-hand');assert(hand.position.distanceTo(grip)<1e-6);const foot=p.rider.getObjectByName(side===1?'right-foot':'left-foot');assert(Math.abs(foot.position.x-side*.44)<1e-6);assert.equal(foot.position.y,.32);}
 const other=makeSpark('#ed522d');assert.notEqual(other.userData.nozzle,p.nozzle);assert.equal(other.userData.nozzle.rotation.x,0);
});
