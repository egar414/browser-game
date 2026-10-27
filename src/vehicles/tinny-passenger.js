import {tinnySeat} from './tinny-seat.js';
import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{makeDeckCharacter}from'./wardrobe.js';
export function makeTinnyPassenger(parent,options={}){
 const source=makeDeckCharacter();source.userData.animate(0,0,false,true);
 if(Number.isFinite(options.floorY))for(const side of[-1,1]){const foot=source.getObjectByName('foot'+side),leg=source.getObjectByName('leg'+side),footY=(options.floorY+.24)/.72+.04,kneeY=.87;foot.position.y=footY;leg.position.y=(kneeY+footY)/2;leg.scale.y=(kneeY-footY)/2;}
 source.updateMatrixWorld(true);const buckets=new Map();source.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);});
 const root=new THREE.Group();root.name='Tinny passenger';for(const [material,geometries]of buckets){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);geometries.forEach(g=>g.dispose());}root.scale.setScalar(.72);parent.add(root);
 let aft=.35;root.userData.update=(v,dt)=>{aft+=((v.passengerAft??.35)-aft)*(1-Math.exp(-dt*5));const seat=tinnySeat(v,aft);root.position.fromArray(seat.position);root.rotation.fromArray([...seat.rotation,'XYZ']);root.userData.aft=aft;};root.userData.update({},1);return root;
}
