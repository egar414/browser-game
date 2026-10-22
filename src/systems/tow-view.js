import * as THREE from 'three';
import {makeBoard,poseSurfer} from '../surf/boards.js';
import {BoardSpray} from '../surf/board-spray.js';
import {waveHeight} from '../config.js';
import {towHitch,wakeAt,TOW} from './tow-physics.js';
export function makeTowActor(board='wake'){
 const a=makeBoard('body');a.userData.towBoard=board;
 if(board==='wake'){
  a.userData.boardType='short';const hull=a.children[0];hull.scale.set(.90,.8,1.30);hull.material.color.set('#f15c3e');
  for(const z of [-.29,.29]){const binding=new THREE.Mesh(new THREE.BoxGeometry(.19,.14,.24),new THREE.MeshStandardMaterial({color:'#1c3038',roughness:.65}));binding.position.set(0,.08,z);a.add(binding);}
 }
 return a;
}
export function animateTowActor(a,s,time,firstPerson=false){
 poseSurfer(a,'ride',time,s.steer,s.crouch,s.airborne);
 const r=a.userData.rider;r.visible=!firstPerson;
 const rProne=s.board==='body';
 if(!rProne)r.rotation.y=Math.PI/2;
 for(const side of[-1,1]){
  const hand=r.getObjectByName('hand'+side),arm=r.getObjectByName('arm'+side),shoulder=r.getObjectByName('sleeve'+side);
  hand.position.set(rProne?side*.13:-.43,rProne?1.93:1.17-(s.crouch||0)*.35,rProne?-.114:side*.14);hand.rotation.set(0,0,0);
  const delta=hand.position.clone().sub(shoulder.position);arm.position.copy(shoulder.position).addScaledVector(delta,.5);arm.scale.y=delta.length()/2;arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 }
 if(!rProne)for(const part of r.userData.faceParts||[])part.rotation.y=-Math.PI/2;

 a.position.set(s.x,s.y,s.z);a.rotation.set(-s.pitch,s.heading,s.roll,'YXZ');
}
export class TowLine{
 constructor(scene){
  this.group=new THREE.Group();scene.add(this.group);this.positions=new Float32Array(25*3);this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.material=new THREE.LineBasicMaterial({color:'#ffd17b'});this.line=new THREE.Line(this.geometry,this.material);this.line.frustumCulled=false;this.group.add(this.line);
  this.handle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.38,7),new THREE.MeshStandardMaterial({color:'#192c32'}));this.group.add(this.handle);
  this.wakePositions=new Float32Array(2*48*6*3);this.wakeGeometry=new THREE.BufferGeometry();this.wakeGeometry.setAttribute('position',new THREE.BufferAttribute(this.wakePositions,3));this.wakeMaterial=new THREE.MeshBasicMaterial({color:'#dbf4ed',transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false});this.wake=new THREE.Mesh(this.wakeGeometry,this.wakeMaterial);this.wake.frustumCulled=false;this.group.add(this.wake);this.group.visible=false;
 }
 update(s,d,time){this.group.visible=!!s&&!!d;if(!s||!d)return;const h=towHitch(d),f=new THREE.Vector3(Math.sin(s.heading),0,Math.cos(s.heading)),end=new THREE.Vector3(s.x,s.y+(s.board==='body'?.32:1.03-(s.crouch||0)*.31),s.z).addScaledVector(f,s.board==='body'?.85:.38),length=Math.hypot(h.x-end.x,h.y-end.y,h.z-end.z),sag=Math.min(1.8,Math.max(0,TOW.line-length)*.25);
  for(let i=0;i<25;i++){const t=i/24;this.positions.set([h.x+(end.x-h.x)*t,Math.max(waveHeight(h.x+(end.x-h.x)*t,h.z+(end.z-h.z)*t,time)+.025,h.y+(end.y-h.y)*t-Math.sin(t*Math.PI)*sag),h.z+(end.z-h.z)*t],i*3);}this.geometry.attributes.position.needsUpdate=true;this.handle.position.copy(end);this.handle.rotation.set(0,s.heading,Math.PI/2);
  let k=0;const fx=Math.sin(d.heading),fz=Math.cos(d.heading);const point=(dist,side,width)=>{const lateral=side*(1+dist*TOW.wakeSpread+width),x=d.x-fx*dist+fz*lateral,z=d.z-fz*dist-fx*lateral;return[x,waveHeight(x,z,time)+wakeAt(x,z,d)+.025,z];};
  for(const side of[-1,1])for(let i=0;i<48;i++){const a=2+i*.65,b=a+.65,verts=[point(a,side,-.25),point(b,side,-.25),point(b,side,.25),point(a,side,-.25),point(b,side,.25),point(a,side,.25)];for(const v of verts){this.wakePositions.set(v,k);k+=3;}}this.wakeGeometry.attributes.position.needsUpdate=true;this.wake.visible=d.speed>2;this.wakeMaterial.opacity=Math.min(.38,(d.speed-2)*.04);
 }
 dispose(){this.group.removeFromParent();for(const v of[this.geometry,this.material,this.handle.geometry,this.handle.material,this.wakeGeometry,this.wakeMaterial])v.dispose();}
}
export class TowView{
 constructor(scene){this.actor=makeTowActor();this.actors=new Map([['wake',this.actor]]);scene.add(this.actor);this.actor.visible=false;this.line=new TowLine(scene);this.spray=new BoardSpray(scene,180);}
 render(dt,s,d,time,camera,firstPerson){if(s&&this.actor.userData.towBoard!==s.board){this.actor.visible=false;if(!this.actors.has(s.board)){const actor=makeTowActor(s.board);this.actors.set(s.board,actor);this.line.group.parent.add(actor);}this.actor=this.actors.get(s.board);}this.actor.visible=!!s;if(s)animateTowActor(this.actor,s,time,firstPerson);this.line.update(s,d,time);this.spray.update(dt,s||{active:false},time,camera);}
}
