import * as THREE from 'three';
import {box,tube} from '../vehicles/models.js';
import {batchRigidAssembly} from '../vehicles/rigid-model.js';
import {makeDeckCharacter} from '../vehicles/wardrobe.js';
// Original white flybridge yacht, teak stern beach and a PWC loading platform.
export function makeSurfYacht(){const g=new THREE.Group(),white=new THREE.MeshPhysicalMaterial({color:'#eef4eb',roughness:.3,metalness:.08,clearcoat:.7}),navy=new THREE.MeshStandardMaterial({color:'#224756',roughness:.18,metalness:.25}),wood=new THREE.MeshStandardMaterial({color:'#bc9160',roughness:.85}),silver=new THREE.MeshStandardMaterial({color:'#a6bdc3',metalness:.75,roughness:.3});
 const sections=[[-9,2.7,.8],[-6,3.05,1.3],[-1,3.1,1.6],[5,2.45,2],[9,.95,2.2],[11.5,.02,2.4]],positions=[],indices=[];
 for(const[z,w,h]of sections)positions.push(-w,h,z,-w*.7,-.55,z,0,-1.1,z,w*.7,-.55,z,w,h,z);
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<4;j++){const a=i*5+j,b=a+5;indices.push(a,a+1,b,a+1,b+1,b);}indices.push(0,2,1,0,4,2,2,4,3);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,white));
 box(g,5.3,.16,7.5,0,1.1,-4.5,wood);box(g,5.4,.2,2.5,0,.75,-9,white);box(g,5.2,.07,2.35,0,.89,-9,wood);
 for(const s of [-1,1]){box(g,.25,1,7,s*2.65,1.65,-3.8,white);box(g,.8,.48,3,s*2.1,1.55,-5,white);tube(g,[[s*2.5,1.95,-5],[s*2.65,2,-1],[s*2.45,2.1,4],[s*1.4,2.6,8.5],[0,2.8,11.2]],.04,silver,28);
 const glass=box(g,.055,1.1,6.8,s*2.34,2.7,-.2,navy);glass.rotation.z=s*.12;const upper=box(g,.06,.9,3.6,s*1.9,4.5,-.3,navy);upper.rotation.z=s*.1;for(const z of [-3,-1,1])box(g,.03,.5,.3,s*2.94,.7,z,navy,true);}
 box(g,4.6,1.8,7.6,0,2.2,-.2,white);box(g,4.8,.18,8.5,0,3.2,-.4,white);const screen=box(g,4.2,1.2,.08,0,2.7,3.68,navy);screen.rotation.x=-.3;
 box(g,4.2,.17,5.3,0,3.5,-1.1,wood);box(g,4.4,.2,5.4,0,4.3,-1.0,white);box(g,3.2,.9,3.8,0,3.95,-.4,white);box(g,3.8,.15,5.6,0,5.15,-.4,white);
 for(const s of [-1,1])for(const z of [-2,1.7])tube(g,[[s*1.7,3.6,z],[s*1.7,5.12,z]],.035,silver,4);
 box(g,2.8,.5,1.2,0,3.8,-2.8,white);box(g,2.7,.07,1.1,0,4.1,-2.8,wood);tube(g,[[0,5.3,-1],[0,6.7,-1]],.025,silver,4);
 for(let i=0;i<6;i++)box(g,1.05,.18,.42,1.7,1.25+i*.34,-6.6+i*.36,white);
 for(let i=0;i<10;i++)box(g,4.7,.012,.022,0,1.21,-7.9+i*.59,navy);
 batchRigidAssembly(g);const lift=new THREE.Group();box(lift,2.2,.14,2.0,0,0,0,white);box(lift,1.9,.04,1.8,0,.1,0,wood);lift.position.set(0,.75,-11.1);g.add(lift);g.userData.lift=lift;const captain=makeDeckCharacter();captain.position.set(-.6,3.7,.2);g.add(captain);captain.userData.animate(0,0,false,true);g.userData.captain=captain;return g;
}
