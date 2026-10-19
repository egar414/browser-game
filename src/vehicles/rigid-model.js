import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Batch static surfaces without consuming child steering assemblies or rider IK.
export function batchRigidAssembly(group){
  group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),groups=new Map(),remove=[];
  group.traverse(o=>{if(!o.isMesh)return;for(let p=o.parent;p&&p!==group;p=p.parent)if(p.userData.dynamic)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);remove.push(o);});
  for(const[m,gs]of groups){const mesh=new THREE.Mesh(mergeGeometries(gs),m);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);mesh.name='Batched craft assembly';gs.forEach(g=>g.dispose());}for(const o of remove){o.removeFromParent();o.geometry.dispose();}
 }
