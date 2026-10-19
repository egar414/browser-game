import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{waveHeight}from'../config.js';
// One inexpensive distant draw keeps boat silhouettes present beyond detail range.
export function distantBoats(scene,capacity){
 const shape=new THREE.Shape([new THREE.Vector2(-.5,-1.05),new THREE.Vector2(.5,-1.05),new THREE.Vector2(.5,.25),new THREE.Vector2(0,1.2),new THREE.Vector2(-.5,.25)]),hull=new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:false});hull.rotateX(Math.PI/2);hull.translate(0,.26,0);const engine=new THREE.BoxGeometry(.3,.45,.3);engine.translate(.12,.32,-1.15);const geometry=mergeGeometries([hull.index?hull.toNonIndexed():hull,engine.toNonIndexed()]);hull.dispose();engine.dispose();
 const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:'#a5b7b9',roughness:.65,metalness:.35}),Math.max(1,capacity));mesh.name='Persistent distant boats';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;scene.add(mesh);const dummy=new THREE.Object3D();
 return{mesh,update(boats,time){mesh.count=boats.length;for(const [i,p]of boats.entries()){dummy.position.set(p.x,p.y??waveHeight(p.x,p.z,time),p.z);dummy.rotation.set(-(p.pitch||0),p.heading||0,p.roll||0,'YXZ');dummy.scale.set(p.type==='cat'?1.5:1,1,p.type==='cat'?1.7:1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;}};
}
