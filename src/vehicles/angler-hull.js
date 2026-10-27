import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Dimensions are inferred from the supplied multi-angle sheet, not surveyed.
// +Z is forward, Y=0 is the game waterline reference; all values are metres.
export const ANGLER_SHAPE={length:3.7,beam:1.65,plate:.006,stations:64,panelSteps:6,
  seats:[{name:'Aft bench',t:.25,depth:.37,y:.285},{name:'Forward bench',t:.57,depth:.35,y:.30},{name:'Bow seat',t:.77,depth:.22,y:.32}]};
// The reference loft is uniformly sized to the requested new 3.10 m Wasp.
// Keep the real 25 hp outboard at full size rather than stretching its parts.
export const WASP_SCALE=3.10/ANGLER_SHAPE.length;
export const WASP_DIMENSIONS={length:3.10,beam:ANGLER_SHAPE.beam*WASP_SCALE,plate:ANGLER_SHAPE.plate*WASP_SCALE};
const widths=[[0,.485],[.12,.5],[.28,.499],[.45,.469],[.60,.400],[.76,.277],[.90,.128],[1,.006]];
function beam(t){
 const i=Math.min(widths.length-2,Math.max(0,widths.findIndex((p,j)=>j<widths.length-1&&t>=p[0]&&t<=widths[j+1][0]))),a=widths[i],b=widths[i+1],u=(t-a[0])/(b[0]-a[0]);
 const tangent=j=>j===0?(widths[1][1]-widths[0][1])/(widths[1][0]-widths[0][0]):j===widths.length-1?(widths[j][1]-widths[j-1][1])/(widths[j][0]-widths[j-1][0]):(widths[j+1][1]-widths[j-1][1])/(widths[j+1][0]-widths[j-1][0]);
 const h=b[0]-a[0];return ((2*u**3-3*u*u+1)*a[1]+(u**3-2*u*u+u)*h*tangent(i)+(-2*u**3+3*u*u)*b[1]+(u**3-u*u)*h*tangent(i+1))*ANGLER_SHAPE.beam;
}
export function anglerStation(t){t=THREE.MathUtils.clamp(t,0,1);const keel=-.29+.06*t+.50*t**5;return{z:(t-.5)*ANGLER_SHAPE.length,w:beam(t),sheer:.36+.03*t+.09*t**4,keel,chine:keel+.095+.055*t};}
export function anglerSurface(t,s){
 const a=anglerStation(t),u=Math.abs(s),sign=s<0?-1:1;let x,y;
 if(u<=.62){const k=u/.62;x=a.w*.77*k;y=a.keel+(a.chine-a.keel)*k**1.30;}
 else{const k=(u-.62)/.38;x=a.w*(.77+.23*k)+.012*Math.sin(k*Math.PI)*(1-t);y=a.chine+(a.sheer-a.chine)*k;}
 return new THREE.Vector3(sign*x,y,a.z);
}
export function anglerNormal(t,s){
 const e=.0001,a=anglerSurface(t,Math.min(1,s+e)).sub(anglerSurface(t,Math.max(-1,s-e))),b=anglerSurface(Math.min(1,t+e),s).sub(anglerSurface(Math.max(0,t-e),s));return a.cross(b).normalize();
}
export function anglerInner(t,s,offset=0){
 // The narrow bow ends in a solid reinforced stem. Terminate the inner bowl
 // slightly aft so a constant normal offset cannot fold through itself at
 // the knife edge. Everywhere aft of this stem the sheet is exactly 6 mm.
 const tt=t-.025*THREE.MathUtils.smoothstep(t,.90,1);return anglerSurface(tt,s).addScaledVector(anglerNormal(tt,s),-ANGLER_SHAPE.plate-offset);
}
export function anglerInsideWidth(t,y){let lo=.62,hi=1;for(let i=0;i<24;i++){const s=(lo+hi)/2;if(anglerInner(t,s).y<y)lo=s;else hi=s;}return anglerInner(t,(lo+hi)/2).x;}

// Independent indexed panels have continuous longitudinal normals, while
// their shared boundaries retain the pressed-aluminium chine creases.
export function anglerHullGeometry(){
 const parts=[],N=ANGLER_SHAPE.stations,M=ANGLER_SHAPE.panelSteps,ranges=[[-1,-.62],[-.62,0],[0,.62],[.62,1]];
 for(const inside of[false,true])for(const [lo,hi]of ranges){
  const p=[],uv=[],ix=[];
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){const t=i/N,s=lo+(hi-lo)*j/M,v=inside?anglerInner(t,s):anglerSurface(t,s);p.push(v.x,v.y,v.z);uv.push(t*5.5,s*1.8);}
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;if(inside)ix.push(a,b,a+1,a+1,b,b+1);else ix.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();parts.push(g.toNonIndexed());g.dispose();
 }
 const p=[],uv=[];
 const quad=(a,b,c,d)=>{for(const v of[a,b,c,b,d,c]){p.push(v.x,v.y,v.z);uv.push(v.z*1.5,v.x*1.5);}};
 // Close plate thickness at the two sheer edges, bow and stern.
 for(const side of[-1,1])for(let i=0;i<N;i++){const a=i/N,b=(i+1)/N;const q=[anglerSurface(a,side),anglerSurface(b,side),anglerInner(a,side),anglerInner(b,side)];if(side===-1)quad(q[0],q[2],q[1],q[3]);else quad(...q);}
 for(const t of[0,1])for(const [lo,hi]of ranges)for(let j=0;j<M;j++){const a=lo+(hi-lo)*j/M,b=lo+(hi-lo)*(j+1)/M;const q=[anglerSurface(t,a),anglerInner(t,a),anglerSurface(t,b),anglerInner(t,b)];if(t===0)quad(q[0],q[2],q[1],q[3]);else quad(...q);}
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(p,3));cap.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));cap.computeVertexNormals();parts.push(cap);
 const result=mergeGeometries(parts);parts.forEach(g=>g.dispose());result.computeBoundingBox();result.computeBoundingSphere();return result;
}

// A formed hat-channel rib. The flanges rest on the inner skin; the raised
// centre and both walls are actual geometry, including the cut end caps.
export function anglerRibGeometry(t){
 const profile=[[-.039,0],[-.020,0],[-.015,.022],[.015,.022],[.020,0],[.039,0],[.039,.003],[.023,.003],[.018,.025],[-.018,.025],[-.023,.003],[-.039,.003]],p=[],uv=[],ix=[],count=33;
 for(let i=0;i<count;i++){const s=-.94+i/(count-1)*1.88;for(const [u,v]of profile){const tt=THREE.MathUtils.clamp(t+u/ANGLER_SHAPE.length,0,1),q=anglerInner(tt,s,.001+v);p.push(q.x,q.y,q.z);uv.push(i/8,u*12);}}
 for(let i=0;i<count-1;i++)for(let j=0;j<profile.length;j++){const a=i*profile.length+j,b=i*profile.length+(j+1)%profile.length,c=a+profile.length,d=b+profile.length;ix.push(a,c,b,b,c,d);}
 const endTriangles=THREE.ShapeUtils.triangulateShape(profile.map(p=>new THREE.Vector2(...p)),[]);
 for(const [i,flip]of[[0,false],[count-1,true]])for(const tri of endTriangles){const q=tri.map(j=>i*profile.length+j);ix.push(...(flip?q.reverse():q));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

// Plate collision samples use this boat's actual curved shell, including the
// bow and both chine lines, rather than the older tender's coarse outline.
export function anglerClearancePoints(){return[0,.14,.34,.55,.74,.90,1].flatMap(t=>[-.62,0,.62].map(s=>anglerSurface(t,s).multiplyScalar(WASP_SCALE).toArray()));}
