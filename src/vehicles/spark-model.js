import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchRigidAssembly} from './rigid-model.js';
import {makeRider} from './rider.js';
import {PROPULSION} from '../config.js';

// Original compact freestyle PWC, referenced against the supplied blue ski and
// manufacturer studio photographs. +Z is bow; all dimensions are game metres.
// Dynamic attachment locations match rider IK and the existing propulsion model.
export const SPARK_MODEL={handlebars:[0,1.12,.35],hullLength:2.86,hullWidth:1.18};
export function makeSpark(colour='#1260f4',design='classic',personal=true){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const material=(color,roughness,metalness=0)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:metalness>.4?.1:.24,clearcoatRoughness:.4});
 const hull=material('#151719',.68),charcoal=material('#25272a',.54),edge=material('#343639',.58),rubber=material('#101113',.94),accent=material(colour,.32),alloy=material('#aab8bf',.28,.82),fastener=material('#5a6971',.38,.7),glass=material('#163d4c',.22,.25);
 accent.clearcoat=.6;const vinyl=material(colour,.68);vinyl.clearcoat=0;
 // Tiny original procedural weave; no remote textures or licensed image assets.
 const pixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const v=232+((x*13+y*19+(x*y)%17)%19)-(x%4===0||y%4===0?14:0),i=(y*64+x)*4;pixels.set([v,v,v,255],i);}
 const weave=new THREE.DataTexture(pixels,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(4,8);weave.colorSpace=THREE.SRGBColorSpace;weave.magFilter=THREE.LinearFilter;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.needsUpdate=true;vinyl.map=weave;
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
 function saddle(rows){
  const sections=[];for(let j=0;j<rows.length-1;j++)for(let k=0;k<4;k++)sections.push(rows[j].map((v,i)=>THREE.MathUtils.lerp(v,rows[j+1][i],k/4)));sections.push(rows.at(-1));const vertices=[],uv=[],indices=[],n=24;
  for(const [j,[z,w,top,bottom]]of sections.entries())for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;vertices.push(Math.sin(a)*w,bottom+(top-bottom)*(.5+.5*Math.cos(a)),z);uv.push(i/n,j/(sections.length-1));}
  for(let j=0;j<sections.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,a+1,b,b+1);}for(const j of[0,sections.length-1]){const start=j*(n+1);for(let k=1;k<n-1;k++)j===0?indices.push(start,start+k,start+k+1):indices.push(start,start+k+1,start+k);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const m=add(g,vinyl);m.name='Scooped blue vinyl saddle';return m;
 }
 const shellProfile=([z,w,bottom,chine,rail,deck])=>[[0,bottom],[-w*.58,bottom+.035],[-w*.92,chine],[-w,rail],[-w*.94,deck],[0,deck+.012],[w*.94,deck],[w,rail],[w*.92,chine],[w*.58,bottom+.035]];
 const shell=loft([[-1.43,.52,-.14,-.10,.19,.23],[-1.24,.575,-.23,-.08,.23,.28],[-.83,.585,-.285,-.07,.26,.32],[-.2,.59,-.27,-.035,.3,.35],[.35,.565,-.22,.02,.34,.39],[.82,.47,-.14,.10,.36,.40],[1.13,.31,-.04,.17,.34,.36],[1.34,.13,.10,.20,.29,.30],[1.43,.012,.22,.23,.245,.25]],shellProfile,hull);shell.name='Closed multi-chine compact hull';
 const panelProfile=([z,w,top,bottom])=>[[-w*.78,bottom],[-w,top-.035],[-w*.67,top],[0,top+.018],[w*.67,top],[w,top-.035],[w*.78,bottom]];
 const panel=(sections,m,parent=body)=>loft(sections,panelProfile,m,parent);
 const sidePanel=(sections,side,m)=>loft(sections,row=>panelProfile(row).map(([x,y])=>[x+side*row[4],y]),m);
 // Split side fairings leave genuine open, low footwells beside the seat.
 for(const side of[-1,1]){
  sidePanel([[-1.27,.05,.34,.23,.27],[-.89,.065,.51,.26,.27],[-.3,.07,.53,.29,.27],[.18,.085,.53,.32,.28],[.57,.10,.56,.37,.30],[.93,.09,.46,.32,.24],[1.24,.025,.31,.27,.12]],side,charcoal);
  box(.255,.045,1.30,side*.44,.292,-.44,rubber);
  for(let j=0;j<13;j++)box(.21,.008,.026,side*.44,.319,-1.02+j*.092,edge);
  tube([[side*.44,.235,-1.38],[side*.56,.29,-.85],[side*.58,.33,-.13],[side*.54,.36,.48],[side*.37,.36,1.04],[side*.14,.28,1.34]],.021,rubber);
  // Rising aft step wedges, rather than square blocks standing on the deck.
  const wedge=panel([[-1.38,.10,.29,.23],[-1.23,.12,.42,.25],[-1.03,.10,.39,.28],[-.94,.06,.33,.29]],rubber);wedge.position.x=side*.43;
  for(let j=0;j<5;j++)box(.18,.008,.022,side*.43,.413-j*.012,-1.21+j*.045,edge);
  sidePanel([[.08,.055,.55,.40,.30],[.30,.13,.62,.43,.30],[.59,.145,.58,.42,.28],[.89,.11,.45,.34,.23],[1.14,.035,.34,.28,.14]],side,accent);
  for(let j=0;j<3;j++){const vent=box(.026,.035,.20,side*(.366+j*.017),.49+j*.018,.26+j*.085,rubber);vent.rotation.z=-side*.35;vent.rotation.y=-side*.22;}
  tube([[side*.21,.38,-1.01],[side*.28,.43,-.77],[side*.29,.45,-.31],[side*.27,.49,.03]],.017,rubber,body,12);
  // Panel screws and photo-aligned trim accents.
  for(const z of(personal?[-.8,-.2,.59]:[-.2])){const screw=add(new THREE.CylinderGeometry(.012,.012,.009,8),fastener,body,side*.53,.34,z);screw.rotation.z=side*.9;}
 }
 // Angular front hood with a centre ridge and recessed triangular shoulder facets.
 panel([[.08,.18,.57,.43],[.32,.255,.68,.43],[.56,.28,.67,.41],[.82,.255,.52,.36],[1.08,.17,.39,.30],[1.30,.055,.28,.25],[1.40,.008,.255,.245]],charcoal);
 panel([[.31,.025,.705,.66],[.58,.028,.69,.65],[.93,.018,.47,.42],[1.24,.006,.31,.28]],edge);
 for(const side of[-1,1])tube([[side*.17,.52,.83],[side*.21,.61,.65],[side*.16,.66,.44]],.006,rubber,body,8);
 if(typeof document!=='undefined'){
  const decal=(text,tint,w,h,x,y,z,angle)=>{const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='900 68px Arial';ctx.fillStyle=tint;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,50);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const mesh=add(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.6,side:THREE.DoubleSide}),body,x,y,z);mesh.rotation.y=angle;};
  for(const side of[-1,1])decal('SEA-DOO',colour,.72,.13,side*.342,.425,-.48,side*Math.PI/2);
 }
 // Narrow, contoured saddle: taper at the knees, broad rear pad and black plinth.
 panel([[-1.1,.15,.44,.27],[-.88,.225,.57,.30],[-.48,.225,.60,.34],[-.08,.17,.62,.39],[.18,.105,.57,.43]],rubber);
 saddle([[-1.10,.12,.61,.47],[-.98,.18,.73,.53],[-.77,.205,.75,.54],[-.48,.205,.71,.54],[-.16,.17,.68,.53],[.10,.12,.69,.53],[.23,.07,.65,.49]]);
 for(const side of[-1,1])tube([[side*.13,.67,-1.02],[side*.17,.71,-.82],[side*.18,.676,-.50],[side*.15,.646,-.20],[side*.10,.65,.08]],.0035,edge,body,20);
 tube([[-.17,.47,-1.10],[-.2,.54,-1.17],[0,.56,-1.23],[.2,.54,-1.17],[.17,.47,-1.10]],.026,rubber);
 box(.99,.035,.26,0,.24,-1.30,rubber);for(let i=0;i<15;i++)box(.027,.007,.20,-.42+i*.06,.262,-1.3,edge);
 // Handlebar pedestal, digital display, grips, trigger levers and cable runs.
 panel([[.13,.095,.66,.50],[.32,.12,.70,.48],[.49,.09,.64,.47]],hull);
 tube([[0,.63,.48],[0,1.07,.36]],.041,alloy,body,10);tube([[0,.64,.48],[0,.91,.42]],.061,rubber,body,8);
 const pedestal=box(.15,.41,.10,0,.88,.41,charcoal);pedestal.rotation.x=-.20;const trimPlate=box(.065,.26,.012,0,.90,.465,alloy);trimPlate.rotation.x=-.20;for(const x of[-.05,.05])for(const y of[.76,1.03]){const bolt=add(new THREE.CylinderGeometry(.009,.009,.014,8),fastener,body,x,y,.46-(y-.9)*.2);bolt.rotation.x=Math.PI/2;}
 const handlebars=new THREE.Group();handlebars.userData.dynamic=true;handlebars.position.fromArray(SPARK_MODEL.handlebars);body.add(handlebars);
 tube([[-.39,0,-.12],[-.17,.025,-.02],[0,.018,.018],[.17,.025,-.02],[.39,0,-.12]],.023,accent,handlebars,16);
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
 for(const side of[-1,1]){box(.245,.115,.026,side*.345,.075,-1.447,charcoal);box(.19,.058,.012,side*.345,.075,-1.468,rubber);for(const dy of[-.018,.018])box(.17,.008,.014,side*.345,.075+dy,-1.478,edge);}
 const nozzle=new THREE.Group();nozzle.userData.dynamic=true;nozzle.position.fromArray(PROPULSION.ski.nozzleMount);body.add(nozzle);
 const duct=add(new THREE.CylinderGeometry(.12,.105,.10,24),charcoal,nozzle,0,0,-.04);duct.rotation.x=Math.PI/2;
 add(new THREE.TorusGeometry(.105,.013,8,28),edge,nozzle,0,0,-.096);
 const darkness=add(new THREE.CircleGeometry(.096,24),rubber,nozzle,0,0,-.093);darkness.rotation.y=Math.PI;
 for(let i=0;i<6;i++){const blade=box(.008,.09,.014,Math.sin(i*Math.PI/3)*.05,Math.cos(i*Math.PI/3)*.05,-.10,edge,nozzle);blade.rotation.z=-i*Math.PI/3;}
 box(.39,.30,.10,0,-.02,-1.485,hull);add(new THREE.TorusGeometry(.16,.022,8,28),hull,body,0,-.02,-1.455);
 for(const side of[-1,1])box(.018,.075,.036,side*.102,0,-.035,alloy,nozzle);
 const bucket=new THREE.Group();bucket.userData.dynamic=true;bucket.position.set(0,.105,-1.50);body.add(bucket);
 for(const side of[-1,1])tube([[side*.115,0,.03],[side*.12,.025,.095],[side*.12,.06,.12]],.012,fastener,bucket,8);
 const gate=box(.245,.033,.13,0,.071,.11,charcoal,bucket);gate.rotation.x=-.16;
 box(.245,.055,.025,0,.04,.177,edge,bucket);
 for(const side of[-1,1]){const bolt=add(new THREE.CylinderGeometry(.014,.014,.012,8),alloy,body,side*.14,.03,-1.469);bolt.rotation.x=Math.PI/2;}
 if(design!=='classic')for(const side of[-1,1])tube([[side*.46,.33,-.9],[side*.48,.39,-.20],[side*.40,.52,.4],[side*.28,.52,.89]],design==='race'?.012:.02,material(design==='race'?'#f5e9c5':'#efad4c',.45),body,18);
 const rider=makeRider(body,'ski');rider.userData.dynamic=true;
 // Batch each rigid assembly separately; steering, trim, gate and IK stay live.
 for(const group of[body,handlebars,nozzle,bucket])batchRigidAssembly(group);
 root.userData={body,rider,handlebars,nozzle,bucket,detailedModel:true,modelSource:personal?'original-reference-sculpt':'standard-spark',modelRevision:'blue-black-photo-3',personalModel:personal};
 rider.userData.update({riderAft:0,steer:0,surgeAcceleration:0},1,root.userData);
 return root;
}
