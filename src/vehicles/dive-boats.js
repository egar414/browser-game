import * as THREE from 'three';
import {batchRigidAssembly} from './rigid-model.js';
import {marineHullGeometry,marineSurface} from './marine-hull.js';
import {gelcoat,deckTeak,marineSteel,roundedBlock,detailTube,deckFittings} from './marine-details.js';
import {makeAnglerOutboard} from './angler-outboard.js';
import {makeDeckCharacter} from './wardrobe.js';
// Original geometry from the supplied silhouettes; no copied branding or assets.
export function makeDiveBoat(type,colour){
 const g=new THREE.Group(),rib=type==='rib';
 const white=gelcoat('#e9eee7'),accent=gelcoat(colour),dark=new THREE.MeshStandardMaterial({color:'#172b33',roughness:.68}),wood=deckTeak(),metal=marineSteel(),glass=new THREE.MeshPhysicalMaterial({color:'#184c60',metalness:.22,roughness:.13,clearcoat:1,clearcoatRoughness:.08});
 const box=(w,h,d,x,y,z,m)=>roundedBlock(g,w,h,d,x,y,z,m);
 const rod=(a,b,r=.025,m=metal)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),10),m);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(o);return o;};
 const tube=(points,r,m)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const o=new THREE.Mesh(new THREE.TubeGeometry(curve,48,r,10,false),m);g.add(o);return o;};
 const sections=rib?[[-2.8,.9,.33],[-1.8,1.02,.4],[.8,.93,.47],[2.2,.64,.58],[3.3,.015,.72]]:[[-4,1.38,.65],[-2,1.5,.73],[1,1.35,.85],[3,.7,1.15],[4.3,.01,1.3]],rows=sections.map(r=>[...r,-.5]);
 const hull=new THREE.Mesh(marineHullGeometry(rows,{ratio:.72,rise:.2,stations:48,thickness:.018}),white);hull.name='Smooth moulded V hull with solid gunwale';g.add(hull);
 for(const side of[-1,1]){const ps=Array.from({length:41},(_,i)=>marineSurface(rows,i/40,side,{ratio:.72,rise:.2}));detailTube(g,ps,.026,metal,48);detailTube(g,ps.map(p=>p.clone().add(new THREE.Vector3(0,-.08,0))),.025,dark,48);}
 box(rib?1.8:2.65,.12,rib?4.9:6.0,0,.46,rib?-.35:-.8,rib?wood:white);
 if(rib){
  tube([[-1.02,.35,-2.9],[-1.17,.4,-1.6],[-1.15,.45,.8],[-.86,.58,2.3],[0,.72,3.25],[.86,.58,2.3],[1.15,.45,.8],[1.17,.4,-1.6],[1.02,.35,-2.9]],.28,accent);
  for(const s of [-1,1]){for(const z of [-2,-.7,.6,1.8])rod([s*1.2,.66,z-.12],[s*1.2,.66,z+.12],.028,dark);box(.6,.1,.85,s*.72,.48,-2.85,wood);}
  box(.92,1.05,1,0,1,.15,dark);const wind=box(1.05,.55,.04,0,1.7,.53,glass);wind.rotation.x=-.2;
  box(1.4,.12,.55,0,1.05,-1.3,wood);box(1.4,.55,.1,0,1.35,-1.55,wood);
  for(const s of [-1,1])for(const z of [-.6,.65])rod([s*.57,.85,z],[s*.57,2.65,z],.038,dark);box(1.85,.1,2.4,0,2.7,.05,accent);
 }else{
  box(2.1,1.8,2.5,0,1.35,1.4,white);box(2.7,.12,4.6,0,2.5,.4,white);
  const wind=box(1.9,.8,.05,0,1.94,2.67,glass);wind.rotation.x=-.12;for(const s of [-1,1]){box(.03,.8,1.6,s*1.06,1.96,1.55,glass);rod([s*1.23,.62,-2.1],[s*1.23,2.45,-2.1]);box(.6,.25,2,s*.93,.75,-1.2,white);}
  for(const s of [-1,1])for(let i=0;i<3;i++){const z=-1.9+i*.65,c=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.65,12),white);c.position.set(s*.95,1.2,z);g.add(c);rod([s*.95,1.55,z],[s*.95,1.69,z],.045,dark);box(.07,.06,.17,s*.95,1.66,z,accent);}
  box(2.8,.13,.85,0,.45,-4.2,white);
  for(const s of [-1,1]){tube([[s*1.2,.72,-1.9],[s*1.2,1.15,-2],[s*1.2,1.18,-3.8],[s*1.2,.7,-4.5]],.025,metal);}
  rod([-1.2,2.45,-1.9],[-1.2,3.45,-1.9],.018);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.65,.43),new THREE.MeshStandardMaterial({color:'#e45742',side:THREE.DoubleSide}));flag.position.set(-.88,3.15,-1.9);g.add(flag);const stripe=box(.65,.07,.015,-.88,3.15,-1.885,white);stripe.rotation.z=.55;
 }
 box(.8,.45,.6,rib?.65:0,.75,rib?-2.05:-2.9,white);box(.83,.07,.63,rib?.65:0,1.01,rib?-2.05:-2.9,accent);
 const stern=rib?-2.8:-4.3,side=rib?-.7:-.9;
 for(const x of [side-.22,side+.22])rod([x,.85,stern],[x,-.6,stern-.35]);for(let y=-.5;y<.8;y+=.25)rod([side-.22,y,stern-.3],[side+.22,y,stern-.3],.025);
 for(const s of [-1,1])tube([[s*.85,.95,1.35],[s*.95,1.15,2],[s*.55,1.35,rib?2.8:3.6],[0,1.4,rib?3.12:4.0]],.025,metal);
 let motor,propeller;
 if(rib){({motor,propeller}=makeAnglerOutboard({hp:0}));motor.position.set(0,.35,-3.128);motor.scale.setScalar(.8/.65);motor.userData.dynamic=true;g.add(motor);}
 deckFittings(g,{width:rib?1.8:2.6,length:rib?4.5:6,y:rib?.53:.75,z:rib?-.3:-.7,material:metal});
 // Recessed access hatches, flush hinges and a proper console instrument panel.
 for(const z of rib?[-1.7,1.9]:[-2.7,-1.1]){box(rib?.60:.82,.018,.62,0,.535,z,dark);box(rib?.57:.79,.025,.59,0,.547,z,rib?wood:white);for(const x of[-.17,.17])box(.06,.017,.018,x,.567,z-.21,metal);}
 for(const x of[-.18,.18]){const gauge=new THREE.Mesh(new THREE.CylinderGeometry(.064,.064,.018,16),dark);gauge.rotation.x=Math.PI/2;gauge.position.set(x,1.54,rib?-.413:1.10);g.add(gauge);box(.008,.067,.01,x,1.55,rib?-.427:1.087,white);}
 for(const side of[-1,1]){box(.17,.06,.08,side*(rib?1.05:1.29),rib?.62:.82,rib?-2.6:-3.5,metal);if(!rib)for(let i=0;i<3;i++)box(.13,.022,.8,side*1.075,1.35+i*.12,1.4,dark);}

 const wheel=new THREE.Mesh(new THREE.TorusGeometry(.17,.024,6,16),dark);wheel.position.set(0,rib?1.55:1.55,rib?-.4:1.12);wheel.rotation.x=-.6;g.add(wheel);
 batchRigidAssembly(g);
 const rider=makeDeckCharacter();rider.position.set(0,rib?.53:.52,rib?-.85:.6);rider.userData.update=v=>rider.userData.animate(v.animationTime||0,0,false,true);g.add(rider);g.userData={body:g,rider,motor,propeller,detailedModel:true,diveBoat:true,modelRevision:'fleet-craft-2'};return g;
}
