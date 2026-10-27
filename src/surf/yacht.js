import * as THREE from 'three';
import {marineHullGeometry} from '../vehicles/marine-hull.js';
import {gelcoat,deckTeak,marineSteel,roundedBlock,deckFittings} from '../vehicles/marine-details.js';
import {tube} from '../vehicles/models.js';
import {batchRigidAssembly} from '../vehicles/rigid-model.js';
import {makeDeckCharacter} from '../vehicles/wardrobe.js';
// Original white flybridge yacht, teak stern beach and a PWC loading platform.
function box(root,w,h,d,x,y,z,m){return roundedBlock(root,w,h,d,x,y,z,m);}
export function makeSurfYacht(){const g=new THREE.Group(),white=gelcoat('#eef4eb'),navy=new THREE.MeshStandardMaterial({color:'#224756',roughness:.18,metalness:.25}),wood=deckTeak(),silver=marineSteel();
 const sections=[[-9,2.7,.8],[-6,3.05,1.3],[-1,3.1,1.6],[5,2.45,2],[9,.95,2.2],[11.5,.02,2.4]],geo=marineHullGeometry(sections.map(r=>[...r,-1.1]),{ratio:.7,rise:.55,stations:56,thickness:.035});g.add(new THREE.Mesh(geo,white));

 box(g,5.3,.16,7.5,0,1.1,-4.5,wood);box(g,5.4,.2,2.5,0,.75,-9,white);box(g,5.2,.07,2.35,0,.89,-9,wood);
 for(const s of [-1,1]){box(g,.25,1,7,s*2.65,1.65,-3.8,white);box(g,.8,.48,3,s*2.1,1.55,-5,white);tube(g,[[s*2.5,1.95,-5],[s*2.65,2,-1],[s*2.45,2.1,4],[s*1.4,2.6,8.5],[0,2.8,11.2]],.04,silver,28);
 const glass=box(g,.055,1.1,6.8,s*2.34,2.7,-.2,navy);glass.rotation.z=s*.12;const upper=box(g,.06,.9,3.6,s*1.9,4.5,-.3,navy);upper.rotation.z=s*.1;for(const z of [-3,-1,1])box(g,.03,.5,.3,s*2.94,.7,z,navy,true);}
 box(g,4.6,1.8,7.6,0,2.2,-.2,white);box(g,4.8,.18,8.5,0,3.2,-.4,white);const screen=box(g,4.2,1.2,.08,0,2.7,3.68,navy);screen.rotation.x=-.3;
 box(g,4.2,.17,5.3,0,3.5,-1.1,wood);box(g,4.4,.2,5.4,0,4.3,-1.0,white);box(g,3.2,.9,3.8,0,3.95,-.4,white);box(g,3.8,.15,5.6,0,5.15,-.4,white);
 for(const s of [-1,1])for(const z of [-2,1.7])tube(g,[[s*1.7,3.6,z],[s*1.7,5.12,z]],.035,silver,4);
 box(g,2.8,.5,1.2,0,3.8,-2.8,white);box(g,2.7,.07,1.1,0,4.1,-2.8,wood);tube(g,[[0,5.3,-1],[0,6.7,-1]],.025,silver,4);
 for(let i=0;i<6;i++)box(g,1.05,.18,.42,1.7,1.25+i*.34,-6.6+i*.36,white);
 for(let i=0;i<10;i++)box(g,4.7,.012,.022,0,1.21,-7.9+i*.59,navy);
 deckFittings(g,{width:5.3,length:12,y:1.98,z:-.8,material:silver});for(const side of[-1,1]){box(g,1.0,.026,1.6,side*1.35,1.205,-5.6,navy);box(g,.95,.035,1.55,side*1.35,1.235,-5.6,wood);box(g,.22,.025,.06,side*1.35,1.26,-6.1,silver);}
 batchRigidAssembly(g);const lift=new THREE.Group();box(lift,2.2,.14,2.0,0,0,0,white);box(lift,1.9,.04,1.8,0,.1,0,wood);lift.position.set(0,.75,-11.1);g.add(lift);g.userData.lift=lift;const captain=makeDeckCharacter();captain.position.set(-.6,3.7,.2);g.add(captain);captain.userData.animate(0,0,false,true);g.userData.captain=captain;g.userData.waterMaskType='yacht';g.userData.modelRevision='fleet-craft-2';return g;
}
