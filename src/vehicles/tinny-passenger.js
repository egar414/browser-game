import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{makeDeckCharacter}from'./wardrobe.js';
export function makeTinnyPassenger(parent){
 const source=makeDeckCharacter();source.userData.animate(0,0,false,true);source.updateMatrixWorld(true);const buckets=new Map();source.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);});
 const root=new THREE.Group();root.name='Tinny passenger';for(const [material,geometries]of buckets){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);geometries.forEach(g=>g.dispose());}root.scale.setScalar(.72);parent.add(root);
 let aft=.35;root.userData.update=(v,dt)=>{aft+=((v.passengerAft??.35)-aft)*(1-Math.exp(-dt*5));root.position.set(.24-(v.steer||0)*.025-(v.roll||0)*.10,-.24,(.35-aft*(.93+Math.max(0,(v.pitch||0)-.7)*.15))*((v.config?.length||2.25)/2.25));root.rotation.set(Math.max(0,v.pitch||0)*.53,0,-(v.steer||0)*.10-(v.roll||0)*.35);root.userData.aft=aft;};root.userData.update({},1);return root;
}
