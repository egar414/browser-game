import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeRider} from './rider.js';
import {PROPULSION} from '../config.js';

// Original compact freestyle PWC, referenced against the supplied blue ski and
// manufacturer studio photographs. +Z is bow; all dimensions are game metres.
// Dynamic attachment locations match rider IK and the existing propulsion model.
export const SPARK_MODEL={handlebars:[0,1.24,.35],hullLength:2.86,hullWidth:1.18};
export function makeSpark(colour='#1679e8',design='classic'){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const material=(color,roughness,metalness=0)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:metalness>.4?.1:.24,clearcoatRoughness:.4});
 const hull=material('#161e23',.62),charcoal=material('#262e34',.48),edge=material('#394047',.53),rubber=material('#10181d',.94),accent=material(colour,.41),alloy=material('#aab8bf',.28,.82),fastener=material('#5a6971',.38,.7),glass=material('#163d4c',.22,.25);
 const vinyl=material(colour,.85);vinyl.clearcoat=0;
 // Tiny original procedural weave; no remote textures or licensed image assets.
 const pixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const v=232+((x*13+y*19+(x*y)%17)%19)-(x%4===0||y%4===0?14:0),i=(y*64+x)*4;pixels.set([v,v,v,255],i);}
 const weave=new THREE.DataTexture(pixels,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(4,8);weave.colorSpace=THREE.SRGBColorSpace;weave.needsUpdate=true;vinyl.map=weave;
 const add=(geometry,m,parent=body,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(w,h,d,x,y,z,m,parent=body)=>add(new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.18),m,parent,x,y,z);
 const tube=(points,r,m,parent=body,segments=18)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,6,false),m,parent);
 // Separate bands retain sharp chines across the hull while smoothing along it.
 function loft(sections,profile,m,parent=body){
  const rings=sections.map(row=>profile(row)),vertices=[],indices=[];const edges=rings[0].length;
  for(let edgeIndex=0;edgeIndex<edges;edgeIndex++){
   const start=vertices.length/3;
   for(let j=0;j<rings.length;j++)for(const k of[edgeIndex,(edgeIndex+1)%edges])vertices.push(rings[j][k][0],rings[j][k][1],sections[j][0]);
   for(let j=0;j<rings.length-1;j++){const a=start+j*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  for(const j of[0,rings.length-1]){const start=vertices.length/3;for(const p of rings[j])vertices.push(p[0],p[1],sections[j][0]);for(let k=1;k<edges-1;k++)j===0?indices.push(start,start+k,start+k+1):indices.push(start,start+k+1,start+k);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return add(g,m,parent);
 }
 const shellProfile=([z,w,bottom,chine,rail,deck])=>[[0,bottom],[-w*.58,bottom+.035],[-w*.92,chine],[-w,rail],[-w*.94,deck],[0,deck+.012],[w*.94,deck],[w,rail],[w*.92,chine],[w*.58,bottom+.035]];
 const shell=loft([[-1.43,.43,-.14,-.10,.19,.23],[-1.24,.54,-.23,-.08,.23,.28],[-.83,.585,-.285,-.07,.26,.32],[-.2,.59,-.27,-.035,.3,.35],[.35,.565,-.22,.02,.34,.39],[.82,.47,-.14,.10,.36,.40],[1.13,.31,-.04,.17,.34,.36],[1.34,.13,.10,.20,.29,.30],[1.43,.012,.22,.23,.245,.25]],shellProfile,hull);shell.name='Closed multi-chine compact hull';
 const panelProfile=([z,w,top,bottom])=>[[-w*.78,bottom],[-w,top-.035],[-w*.67,top],[0,top+.018],[w*.67,top],[w,top-.035],[w*.78,bottom]];
 const panel=(sections,m,parent=body)=>loft(sections,panelProfile,m,parent);
 const sidePanel=(sections,side,m)=>loft(sections,row=>panelProfile(row).map(([x,y])=>[x+side*row[4],y]),m);
 // Split side fairings leave genuine open, low footwells beside the seat.
 for(const side of[-1,1]){
  sidePanel([[-1.27,.075,.31,.21,.36],[-.89,.078,.38,.25,.36],[-.3,.075,.43,.29,.36],[.18,.11,.50,.32,.36],[.57,.15,.64,.37,.34],[.93,.12,.54,.32,.27],[1.24,.035,.35,.27,.14]],side,accent);
  box(.255,.045,1.30,side*.44,.292,-.44,rubber);
  for(let j=0;j<13;j++)box(.21,.008,.026,side*.44,.319,-1.02+j*.092,edge);
  tube([[side*.44,.235,-1.38],[side*.56,.29,-.85],[side*.58,.33,-.13],[side*.54,.36,.48],[side*.37,.36,1.04],[side*.14,.28,1.34]],.021,rubber);
  // Rising aft step wedges, rather than square blocks standing on the deck.
  const wedge=panel([[-1.38,.10,.29,.23],[-1.23,.12,.42,.25],[-1.03,.10,.39,.28],[-.94,.06,.33,.29]],rubber);wedge.position.x=side*.43;
  for(let j=0;j<5;j++)box(.18,.008,.022,side*.43,.413-j*.012,-1.21+j*.045,edge);
  sidePanel([[.26,.035,.57,.43,.27],[.48,.12,.68,.46,.27],[.76,.125,.60,.42,.24],[1.02,.07,.44,.34,.18],[1.2,.008,.33,.28,.11]],side,accent);
  for(let j=0;j<3;j++){const vent=box(.026,.035,.20,side*(.366+j*.017),.49+j*.018,.26+j*.085,rubber);vent.rotation.z=-side*.35;vent.rotation.y=-side*.22;}
  tube([[side*.21,.38,-1.01],[side*.28,.43,-.77],[side*.29,.45,-.31],[side*.27,.49,.03]],.017,rubber,body,12);
  // Small original graphics and exposed panel screws, without copied logos.
  for(const z of[-.8,-.2,.59]){const screw=add(new THREE.CylinderGeometry(.012,.012,.009,8),fastener,body,side*.53,.34,z);screw.rotation.z=side*.9;}
 }
 // Angular front hood with a centre ridge and recessed triangular shoulder facets.
 panel([[.05,.17,.59,.43],[.32,.255,.75,.43],[.56,.28,.785,.44],[.81,.255,.65,.39],[1.05,.17,.47,.32],[1.28,.055,.32,.27],[1.38,.008,.27,.245]],charcoal);
 panel([[.33,.033,.765,.72],[.58,.035,.799,.72],[.94,.021,.545,.49],[1.22,.006,.35,.31]],edge);
 for(const side of[-1,1])tube([[side*.17,.607,.83],[side*.21,.67,.65],[side*.16,.73,.44]],.006,rubber,body,8);
 // Narrow, contoured saddle: taper at the knees, broad rear pad and black plinth.
 panel([[-1.1,.15,.44,.27],[-.88,.225,.57,.30],[-.48,.225,.60,.34],[-.08,.17,.62,.39],[.18,.105,.57,.43]],rubber);
 panel([[-1.03,.15,.60,.46],[-.88,.205,.68,.51],[-.59,.205,.705,.53],[-.27,.18,.68,.55],[.03,.13,.65,.53],[.14,.085,.59,.49]],vinyl);
 for(const side of[-1,1])tube([[side*.14,.614,-.99],[side*.19,.674,-.84],[side*.19,.699,-.56],[side*.164,.677,-.24],[side*.115,.647,.02]],.0035,edge,body,20);
 tube([[-.17,.47,-1.10],[-.2,.54,-1.17],[0,.56,-1.23],[.2,.54,-1.17],[.17,.47,-1.10]],.026,rubber);
 box(.75,.035,.26,0,.24,-1.30,rubber);for(let i=0;i<11;i++)box(.027,.007,.20,-.30+i*.06,.262,-1.3,edge);
 // Handlebar pedestal, digital display, grips, trigger levers and cable runs.
 panel([[.13,.095,.66,.50],[.32,.12,.70,.48],[.49,.09,.64,.47]],hull);
 tube([[0,.63,.48],[0,1.19,.36]],.041,alloy,body,10);tube([[0,.64,.48],[0,.91,.42]],.061,rubber,body,8);
 const handlebars=new THREE.Group();handlebars.userData.dynamic=true;handlebars.position.fromArray(SPARK_MODEL.handlebars);body.add(handlebars);
 tube([[-.39,0,-.12],[-.17,.025,-.02],[0,.018,.018],[.17,.025,-.02],[.39,0,-.12]],.023,hull,handlebars,16);
 for(const side of[-1,1]){
  const guard=panel([[-.055,.075,.045,.015],[.015,.13,.065,.018],[.11,.095,.05,.018]],charcoal,handlebars);guard.position.x=side*.32;
  tube([[side*.22,-.012,-.07],[side*.25,.005,.025],[side*.40,.025,.04]],.009,alloy,handlebars,8);
  box(.18,.048,.068,side*.33,0,-.12,rubber,handlebars);box(.018,.055,.072,side*.423,0,-.12,accent,handlebars);
  tube([[side*.22,-.025,-.10],[side*.31,-.048,-.17],[side*.40,-.022,-.17]],.009,alloy,handlebars,8);
  box(.065,.04,.075,side*.21,.018,-.05,charcoal,handlebars);box(.025,.012,.022,side*.21,.043,-.045,side===-1?accent:rubber,handlebars);
 }
 const dash=box(.18,.045,.14,0,.018,.065,rubber,handlebars);dash.rotation.x=.3;const screen=box(.132,.006,.085,0,.044,.063,glass,handlebars);screen.rotation.x=.3;
 for(let j=0;j<4;j++)box(.008,.002,.018, -.035+j*.022,.049,.067,alloy,handlebars);
 for(const side of[-1,1])tube([[side*.20,-.02,-.05],[side*.13,-.16,.05],[side*.055,-.35,.08]],.007,rubber,handlebars,10);
 // Compact, recessed pump assembly aligned to the actual spray emitter.
 box(.33,.23,.045,0,.005,-1.435,hull);
 const nozzle=new THREE.Group();nozzle.userData.dynamic=true;nozzle.position.fromArray(PROPULSION.ski.nozzleMount);body.add(nozzle);
 const duct=add(new THREE.CylinderGeometry(.09,.067,.16,20),charcoal,nozzle,0,0,-.075);duct.rotation.x=Math.PI/2;
 add(new THREE.TorusGeometry(.068,.009,6,24),alloy,nozzle,0,0,-.156);
 const darkness=add(new THREE.CircleGeometry(.061,20),rubber,nozzle,0,0,-.153);darkness.rotation.y=Math.PI;
 for(const side of[-1,1])box(.018,.075,.036,side*.102,0,-.035,alloy,nozzle);
 const bucket=new THREE.Group();bucket.userData.dynamic=true;bucket.position.set(0,.105,-1.50);body.add(bucket);
 for(const side of[-1,1])tube([[side*.115,0,.03],[side*.12,.025,.095],[side*.12,.06,.12]],.012,fastener,bucket,8);
 const gate=box(.245,.033,.13,0,.071,.11,charcoal,bucket);gate.rotation.x=-.16;
 box(.245,.055,.025,0,.04,.177,edge,bucket);
 for(const side of[-1,1]){const bolt=add(new THREE.CylinderGeometry(.014,.014,.012,8),alloy,body,side*.14,.03,-1.469);bolt.rotation.x=Math.PI/2;}
 if(design!=='classic')for(const side of[-1,1])tube([[side*.46,.33,-.9],[side*.48,.39,-.20],[side*.40,.52,.4],[side*.28,.52,.89]],design==='race'?.012:.02,material(design==='race'?'#f5e9c5':'#efad4c',.45),body,18);
 const rider=makeRider(body,'ski');rider.userData.dynamic=true;
 // Batch each rigid assembly separately; steering, trim, gate and IK stay live.
 function batch(group){
  group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),groups=new Map(),remove=[];
  group.traverse(o=>{if(!o.isMesh)return;for(let p=o.parent;p&&p!==group;p=p.parent)if(p.userData.dynamic)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);remove.push(o);});
  for(const[m,gs]of groups){const mesh=add(mergeGeometries(gs),m,group);mesh.name='Batched Spark assembly';gs.forEach(g=>g.dispose());}for(const o of remove){o.removeFromParent();o.geometry.dispose();}
 }
 for(const group of[body,handlebars,nozzle,bucket])batch(group);
 root.userData={body,rider,handlebars,nozzle,bucket,detailedModel:true,modelSource:'original-reference-sculpt',modelRevision:'compact-spark-2'};
 rider.userData.update({riderAft:0,steer:0,surgeAcceleration:0},1,root.userData);
 return root;
}
