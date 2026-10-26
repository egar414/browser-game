import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
// Extra silhouette detail stays inside the existing head/cap draw calls.
export function coastalHeadGeometry(){const head=new THREE.SphereGeometry(1,20,14),nose=new THREE.SphereGeometry(1,8,6);nose.scale(.18,.19,.32);nose.translate(0,-.12,.94);const ears=[-1,1].map(side=>{const g=new THREE.SphereGeometry(1,8,6);g.scale(.16,.24,.14);g.translate(side*.97,-.03,0);return g;}),parts=[head,nose,...ears],geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());return geometry;}
export function coastalCapGeometry(){const crown=new THREE.SphereGeometry(1,20,10),brim=new THREE.BoxGeometry(1.80,.15,1.35);brim.translate(0,-.32,1.06);const geometry=mergeGeometries([crown,brim],false);crown.dispose();brim.dispose();return geometry;}
