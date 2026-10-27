import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {marineAlloyMaterial} from './marine-finish.js';
import {batchRigidAssembly} from './rigid-model.js';
import {ANGLER_SHAPE,WASP_SCALE,WASP_DIMENSIONS,anglerStation,anglerSurface,anglerInner,anglerInsideWidth,anglerHullGeometry,anglerRibGeometry} from './angler-hull.js';
import {makeAnglerOutboard} from './angler-outboard.js';

const add=(root,g,m,p=[0,0,0])=>{const o=new THREE.Mesh(g,m);o.position.fromArray(p);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
const box=(root,w,h,d,m,p,r=.003)=>add(root,new RoundedBoxGeometry(w,h,d,2,r),m,p);
function tube(root,points,r,m,steps=36){return add(root,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p))),steps,r,6,false),m);}
function plate(root,points,thickness,mat,y,bevel=.002){const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))),g=new THREE.ExtrudeGeometry(shape,{depth:thickness,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2});g.rotateX(-Math.PI/2);return add(root,g,mat,[0,y-thickness,0]);}
function group(parent,name){const g=new THREE.Group();g.name=name;parent.add(g);return g;}

export function makeAnglerShell(colour='#c6ccce',design='classic'){
 const root=new THREE.Group();root.name='310 Wasp';root.userData.dynamic=true;
 const metal=tint=>{const m=marineAlloyMaterial(tint);m.map=null;m.color.multiplyScalar(.70);m.metalness=.84;m.roughness=.54;m.normalScale.set(.45,.45);m.name='Brushed silver aluminium';return m;};
 const alloy=metal(colour),formed=metal('#aeb9bf'),polished=new THREE.MeshStandardMaterial({color:'#c0c8cd',metalness:.88,roughness:.28}),weld=new THREE.MeshStandardMaterial({color:'#99a6ac',metalness:.7,roughness:.52}),dark=new THREE.MeshStandardMaterial({color:'#26333b',metalness:.25,roughness:.7});
 const hull=group(root,'Hull'),structure=group(root,'Interior ribs and stringers'),fittings=group(root,'Handles and fittings'),benches=[];
 const shell=add(hull,anglerHullGeometry(),alloy);shell.name='Six-millimetre curved hull skin';
 // Flat transom with a small bevel and a real inner and outer face.
 const ring=[];for(let i=0;i<=24;i++){const p=anglerSurface(0,-1+i/12);ring.push(new THREE.Vector2(p.x,p.y));}
 const tg=new THREE.ExtrudeGeometry(new THREE.Shape(ring),{depth:.012,steps:1,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2});const transom=add(hull,tg,alloy,[0,0,-ANGLER_SHAPE.length/2]);transom.name='Flat transom plate';
 box(hull,ANGLER_SHAPE.beam*.956,.035,.045,polished,[0,.36,-1.845],.008);
 for(const side of[-1,1]){
  const railPoints=Array.from({length:49},(_,i)=>anglerSurface(i/48,side));tube(hull,railPoints,.021,polished,72).name=side<0?'Port aluminium gunwale':'Starboard aluminium gunwale';
  // The flange under the rolled edge is a solid strip, not a decal.
  tube(hull,Array.from({length:41},(_,i)=>anglerInner(i/40,side*.965)),.009,formed,56);
  for(const s of[.32,.76])tube(hull,Array.from({length:41},(_,i)=>anglerSurface(i/40,side*s)),.008,formed,48);
  for(const t of[.09,.23,.39,.54,.69,.82]){
   const p=anglerInner(t,side*.985,.001);const rivet=add(fittings,new THREE.SphereGeometry(.0045,8,5),polished,p.toArray());rivet.scale.y=.45;
  }
  // Flat triangular stern knees join the gunwale to the transom corners.
  const a=anglerStation(.005),points=[[side*(a.w-.015),-1.83],[side*(a.w-.015),-1.57],[side*(a.w-.25),-1.83]];plate(fittings,points,.009,alloy,.352);
  tube(fittings,[[side*.57,.28,-1.87],[side*.57,.23,-1.94],[side*.72,.23,-1.94],[side*.72,.28,-1.87]],.009,polished,20);
 }
 // Welded keel seam and transverse hat ribs follow the genuine inner shell.
 tube(hull,Array.from({length:41},(_,i)=>anglerSurface(i/40,0)),.007,formed,48);
 for(const t of[.12,.30,.46,.64,.80]){const rib=add(structure,anglerRibGeometry(t),formed);rib.name='Formed aluminium support rib';}
 for(const side of[-1,1])for(const x of[.23,.48]){
  const points=[];for(let i=0;i<=48;i++){const t=.025+i/48*.80,a=anglerStation(t);if(a.w*.75<x)break;const s=side*x/(a.w*.77)*.62;points.push(anglerInner(t,s,.006));}
  if(points.length>2)tube(structure,points,.009,formed,40);
 }
 for(const spec of ANGLER_SHAPE.seats){
  const seat=group(root,spec.name),z=(spec.t-.5)*ANGLER_SHAPE.length,back=z-spec.depth/2,front=z+spec.depth/2,t0=back/ANGLER_SHAPE.length+.5,t1=front/ANGLER_SHAPE.length+.5,w0=anglerInsideWidth(t0,spec.y)-.006,w1=anglerInsideWidth(t1,spec.y)-.006;
  const top=plate(seat,[[-w0,back],[w0,back],[w1,front],[-w1,front]],.018,alloy,spec.y,.004);top.name='Solid bevelled bench top';
  for(const [zz,w]of[[back,w0],[front,w1]])box(seat,w*2,.052,.008,formed,[0,spec.y-.032,zz],.002);
  for(const side of[-1,1]){
   const w=anglerInsideWidth(spec.t,spec.y-.065),bracket=new THREE.Shape([new THREE.Vector2(-.10,0),new THREE.Vector2(.10,0),new THREE.Vector2(.065,-.14),new THREE.Vector2(-.065,-.14)]),g=new THREE.ExtrudeGeometry(bracket,{depth:.008,steps:1,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1});g.rotateY(Math.PI/2);
   const bp=g.attributes.position;for(let i=0;i<bp.count;i++){const y=spec.y-.018+bp.getY(i),zz=z+bp.getZ(i),width=anglerInsideWidth(zz/ANGLER_SHAPE.length+.5,y);bp.setXYZ(i,side*(width-.005-bp.getX(i)),y,zz);}g.computeVertexNormals();add(seat,g,formed);
   for(const dz of[-.075,.075])add(seat,new THREE.SphereGeometry(.005,8,5),polished,[side*(w-.02),spec.y-.028,z+dz]);
   tube(seat,[-.09,.09].map(dz=>[side*(anglerInsideWidth((z+dz)/ANGLER_SHAPE.length+.5,spec.y-.03)-.009),spec.y-.03,z+dz]),.002,weld,12);
  }
  seat.userData={seatHeight:spec.y,seatZ:z,fullWidth:true};benches.push(seat);
 }
 // Small triangular foredeck and the raised stem eye.
 const bow=group(root,'Bow foredeck'),start=.855,a=anglerStation(start);plate(bow,[[-a.w,a.z],[a.w,a.z],[.003,1.85],[-.003,1.85]],.012,alloy,.443,.003);
 tube(fittings,[[-.022,.475,1.82],[-.022,.52,1.85],[.022,.52,1.85],[.022,.475,1.82]],.006,polished,16);
 // Inside transom stiffener and corner welds.
 box(structure,1.42,.032,.036,formed,[0,.12,-1.827],.005);
 for(const side of[-1,1])tube(structure,Array.from({length:17},(_,i)=>anglerInner(.004,side*i/16)),.002,weld,24);
 if(design!=='classic')for(const side of[-1,1]){const stripe=new THREE.MeshStandardMaterial({color:design==='race'?'#194d65':'#bc863a',metalness:.3,roughness:.4});tube(fittings,Array.from({length:33},(_,i)=>anglerSurface(i/32,side*.91)),.005,stripe,40);}
 const {motor,propeller}=makeAnglerOutboard();root.add(motor);
 for(const part of[hull,structure,fittings,...benches,bow]){batchRigidAssembly(part);part.scale.setScalar(WASP_SCALE);part.userData.dynamic=true;if(part.userData.seatHeight){part.userData.seatHeight*=WASP_SCALE;part.userData.seatZ*=WASP_SCALE;}}
 root.userData={dynamic:true,motor,propeller,hull,structure,fittings,benches,bow,modelSource:'multi-angle-aluminium-sheet',modelRevision:'wasp-310-1',dimensions:{...WASP_DIMENSIONS},powerLabel:25};return root;
}
