import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Monotone cubic station interpolation: curved sheer/beam without overshooting
// the transom, chine or knife bow. Shared with the ocean exclusion volumes.
export function marineStation(rows,t){
 const z=THREE.MathUtils.lerp(rows[0][0],rows.at(-1)[0],THREE.MathUtils.clamp(t,0,1));
 let i=0;while(i<rows.length-2&&z>rows[i+1][0])i++;
 const a=rows[i],b=rows[i+1],h=b[0]-a[0],u=(z-a[0])/h;
 const slope=(j,k)=>{
  const sec=n=>(rows[n+1][k]-rows[n][k])/(rows[n+1][0]-rows[n][0]);
  if(j===0)return sec(0);if(j===rows.length-1)return sec(j-1);
  const left=sec(j-1),right=sec(j);return left*right<=0?0:2*left*right/(left+right);
 };
 return a.map((v,k)=>k===0?z:(2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*h*slope(i,k)+(-2*u**3+3*u*u)*b[k]+(u**3-u*u)*h*slope(i+1,k));
}
export function marineSurface(rows,t,s,{ratio=.72,rise=.05}={}){
 const[z,w,top,bottom]=marineStation(rows,t),a=Math.abs(s),sign=s<0?-1:1;
 if(a<=.62){const u=a/.62;return new THREE.Vector3(sign*w*ratio*u,bottom+rise*u**1.2,z);}
 const u=(a-.62)/.38;return new THREE.Vector3(sign*w*(ratio+(1-ratio)*u),THREE.MathUtils.lerp(bottom+rise,top,u),z);
}
export function marineProfile(rows,options={}){
 return t=>{const ring=[-1,-.81,-.62,0,.62,.81,1].map(s=>marineSurface(rows,t,s,options).toArray());ring.push([0,ring[0][1],ring[0][2]]);return ring;};
}
export function marineHullGeometry(rows,{stations=40,panelSteps=3,thickness=.006,closedTop=false,...shape}={}){
 const outer=(t,s)=>marineSurface(rows,t,s,shape);
 const inner=(t,s)=>{
  const e=.0001,ds=outer(t,Math.min(1,s+e)).sub(outer(t,Math.max(-1,s-e))),dt=outer(Math.min(1,t+e),s).sub(outer(Math.max(0,t-e),s));
  const n=ds.cross(dt).normalize(),width=marineStation(rows,t)[1];return outer(t,s).addScaledVector(n,-Math.min(thickness,width*.22));
 };
 const parts=[],ranges=[[-1,-.62],[-.62,0],[0,.62],[.62,1]],layers=closedTop?[false]:[false,true];
 for(const inside of layers)for(const[lo,hi]of ranges){
  const p=[],uv=[],ix=[];
  for(let i=0;i<=stations;i++)for(let j=0;j<=panelSteps;j++){const t=i/stations,s=THREE.MathUtils.lerp(lo,hi,j/panelSteps),v=(inside?inner:outer)(t,s);p.push(...v.toArray());uv.push(v.z*1.8,(Math.abs(s)>.62?v.y:v.x)*3);}
  for(let i=0;i<stations;i++)for(let j=0;j<panelSteps;j++){const a=i*(panelSteps+1)+j,b=a+panelSteps+1;if(inside)ix.push(a,b,a+1,a+1,b,b+1);else ix.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();parts.push(g);
 }
 // Rim strips close the real plate thickness; a closed deck is used for PWCs
 // and the race cat. End plates prevent see-through stems and transoms.
 const strip=(rowsOfPoints,reverse=false)=>{
  const p=rowsOfPoints.flatMap(r=>r.flatMap(v=>v.toArray())),uv=rowsOfPoints.flatMap(r=>r.flatMap(v=>[v.x,v.z])),ix=[];
  for(let i=0;i<rowsOfPoints.length-1;i++){const a=i*2,b=a+2;ix.push(...(reverse?[a,b+1,a+1,a,b,b+1]:[a,a+1,b+1,a,b+1,b]));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();parts.push(g);
 };
 if(closedTop)strip(Array.from({length:stations+1},(_,i)=>[outer(i/stations,-1),outer(i/stations,1)]),true);
 else for(const side of[-1,1])strip(Array.from({length:stations+1},(_,i)=>side<0?[inner(i/stations,side),outer(i/stations,side)]:[outer(i/stations,side),inner(i/stations,side)]));
 for(const t of[0,1]){
  const ring=Array.from({length:25},(_,i)=>outer(t,-1+i/12)),shape2=new THREE.Shape(ring.map(v=>new THREE.Vector2(v.x,v.y)));
  if(!closedTop){const g=new THREE.ExtrudeGeometry(shape2,{depth:thickness,bevelEnabled:false,steps:1});g.translate(0,0,ring[0].z-(t===1?thickness:0));parts.push(g);}
  else{const g=new THREE.ShapeGeometry(shape2);g.translate(0,0,ring[0].z);if(t===0){const ix=g.index;for(let i=0;i<ix.count;i+=3){const b=ix.getX(i+1);ix.setX(i+1,ix.getX(i+2));ix.setX(i+2,b);}g.computeVertexNormals();}parts.push(g);}
 }
 // Extruded transoms are non-indexed. Unify before the final merge while
 // retaining the smooth normals already calculated on each indexed panel.
 const expanded=parts.map(g=>g.index?g.toNonIndexed():g);const result=mergeGeometries(expanded);expanded.forEach(g=>{if(!parts.includes(g))g.dispose();});parts.forEach(g=>g.dispose());result.userData={marineLoft:true,stations,thickness:closedTop?0:thickness};return result;
}
export function marineRibGeometry(rows,t,{width=.028,height=.022,shape={}}={}){
 const parts=[];for(const[lo,hi]of[[-.98,-.62],[-.62,0],[0,.62],[.62,.98]]){
  const points=Array.from({length:7},(_,i)=>{const s=THREE.MathUtils.lerp(lo,hi,i/6),e=.0001,ds=marineSurface(rows,t,s+e,shape).sub(marineSurface(rows,t,s-e,shape)),dt=marineSurface(rows,Math.min(1,t+e),s,shape).sub(marineSurface(rows,Math.max(0,t-e),s,shape));return marineSurface(rows,t,s,shape).addScaledVector(ds.cross(dt).normalize(),-(width*.5+.008+height*.15));});
  const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),6,width/2,4,false);parts.push(g);
 }
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;
}

export function marineSaddleGeometry(rows,{stations=32,segments=20}={}){
 const p=[],uv=[],ix=[];
 for(let i=0;i<=stations;i++){const[z,w,top,bottom]=marineStation(rows,i/stations);for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;p.push(Math.sin(a)*w,(top+bottom)/2+Math.cos(a)*(top-bottom)/2,z);uv.push(j/segments,i/stations*3);}}
 for(let i=0;i<stations;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;ix.push(a,b,a+1,a+1,b,b+1);}
 for(const end of[0,stations]){const n=end*(segments+1);for(let j=1;j<segments-1;j++)end===0?ix.push(n,n+j,n+j+1):ix.push(n,n+j+1,n+j);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
