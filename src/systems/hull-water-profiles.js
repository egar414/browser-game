import {marineProfile,marineStation} from '../vehicles/marine-hull.js';
import {VEHICLES} from '../config.js';
import {anglerSurface,WASP_SCALE} from '../vehicles/angler-hull.js';
import {sportfisherZ} from '../vehicles/sportfisher-shape.js';

// Closed displacement volumes follow the actual model sections, not a box or
// circle around each boat. +Z is forward. A catamaran has two separate volumes:
// the channel between its pontoons must still show the ocean.
export const MASK_SPANS=32, MASK_RING=8;
const lerp=(a,b,t)=>a+(b-a)*t;
function sample(rows,t){
 const z=lerp(rows[0][0],rows.at(-1)[0],t);
 const i=Math.min(rows.length-2,Math.max(0,rows.findIndex((r,j)=>j<rows.length-1&&z>=r[0]&&z<=rows[j+1][0])));
 const a=rows[i],b=rows[i+1],u=(z-a[0])/(b[0]-a[0]);return a.map((v,k)=>lerp(v,b[k],u));
}
function chine(rows,{x=0,sx=1,sz=1,ratio=.72,rise=.05,smooth=true,zMap=z=>z}={}){
 if(smooth){const profile=marineProfile(rows,{ratio,rise});return t=>profile(t).map(([px,py,z])=>[(px+x)*sx,py,zMap(z)*sz]);}
 return t=>{const[z,w,top,bottom]=sample(rows,t),c=w*ratio,y=bottom+rise;
  return [[-w,top],[-c,y],[-c*.5,lerp(bottom,y,.5)],[0,bottom],[c*.5,lerp(bottom,y,.5)],[c,y],[w,top],[0,top]].map(([px,py])=>[(px+x)*sx,py,z*sz]);};
}
function tube(rows,x){return t=>{const[z,rx,ry,y]=marineStation(rows,t);return Array.from({length:MASK_RING},(_,i)=>{const a=(i/ MASK_RING+.5)*Math.PI*2;return[x+Math.cos(a)*rx,y+Math.sin(a)*ry,z];});};}
const tender=[[-1.08,.52,.39,-.23],[-.82,.59,.43,-.27],[.12,.58,.47,-.23],[.68,.42,.51,-.10],[1.09,.14,.55,.08],[1.17,.015,.56,.18]];
const pontoons=[[-1.98,.07,.07,.12],[-1.76,.29,.28,.16],[-1.1,.31,.3,.18],[.55,.31,.3,.2],[1.25,.27,.28,.29],[1.72,.17,.2,.42],[2.07,.008,.015,.55]];
const racing=[[-5.5,.62,.65,-.32],[-4.4,.73,.73,-.38],[-1.5,.75,.78,-.39],[1.9,.72,.91,-.28],[4.15,.48,.94,-.08],[5.8,.13,.79,.19],[6.2,.008,.58,.40]];
const spark=[[-1.43,.52,.23,-.14],[-1.24,.575,.28,-.23],[-.83,.585,.32,-.285],[-.2,.59,.35,-.27],[.35,.565,.39,-.22],[.82,.47,.40,-.14],[1.13,.31,.36,-.04],[1.34,.13,.3,.1],[1.43,.012,.25,.22]];
export const HULL_WATER_PROFILES={
 tinny:[chine(tender,{ratio:.76,rise:.06})],
 dinghy:[chine(tender,{sx:VEHICLES.dinghy.width/1.22,sz:VEHICLES.dinghy.length/2.25,ratio:.76,rise:.06})],
 skua:[chine(tender,{sx:VEHICLES.skua.width/1.22,sz:VEHICLES.skua.length/2.25,ratio:.76,rise:.06})],
 angler:[t=>{const ring=[-1,-.81,-.62,0,.62,.81,1].map(s=>anglerSurface(t,s).multiplyScalar(WASP_SCALE).toArray());ring.push([0,ring[0][1],ring[0][2]]);return ring;}],
 ski:[chine(spark,{ratio:.92,rise:.17,smooth:false})],
 seago:[chine([[-1.82,.4,.14,-.23],[-1.55,.58,.25,-.36],[-.8,.66,.32,-.4],[.3,.66,.43,-.34],[1.05,.55,.43,-.24],[1.6,.27,.33,-.10],[1.85,.01,.24,.02]])],
 hyper:[chine([[-1.79,.43,.16,-.22],[-1.55,.6,.25,-.34],[-.8,.65,.3,-.38],[.32,.64,.36,-.34],[1.02,.52,.39,-.23],[1.6,.27,.29,-.08],[1.83,.008,.18,.02]],{rise:.03})],
 cat:[tube(pontoons,-.73),tube(pontoons,.73)],
 racer:[chine(racing,{x:-1.45,ratio:.66,rise:0}),chine(racing,{x:1.45,ratio:.66,rise:0})],
 cruiser:[chine([[-5,1.72,.55,-.75],[-3.7,1.98,.72,-.75],[0,1.95,.95,-.75],[2.9,1.65,1.3,-.75],[4.7,.75,1.6,-.75],[5.65,.02,1.72,-.75]],{ratio:.82,rise:.53,zMap:sportfisherZ})],
 dive:[chine([[-4,1.38,.65,-.5],[-2,1.5,.73,-.5],[1,1.35,.85,-.5],[3,.7,1.15,-.5],[4.3,.01,1.3,-.5]],{rise:.2})],
 rib:[chine([[-2.8,.9,.33,-.5],[-1.8,1.02,.4,-.5],[.8,.93,.47,-.5],[2.2,.64,.58,-.5],[3.3,.015,.72,-.5]],{rise:.2})],
 yacht:[chine([[-9,2.7,.8,-1.1],[-6,3.05,1.3,-1.1],[-1,3.1,1.6,-1.1],[5,2.45,2,-1.1],[9,.95,2.2,-1.1],[11.5,.02,2.4,-1.1]],{ratio:.7,rise:.55})],
};
export function hullWaterVertices(profile){
 const p=[];for(let i=0;i<=MASK_SPANS;i++)p.push(...profile(i/MASK_SPANS).flat());return new Float32Array(p);
}
export function hullWaterIndices(){
 const ix=[];for(let i=0;i<MASK_SPANS;i++)for(let j=0;j<MASK_RING;j++){const a=i*MASK_RING+j,b=i*MASK_RING+(j+1)%MASK_RING;ix.push(a,b,b+MASK_RING,a,b+MASK_RING,a+MASK_RING);}
 for(let j=1;j<MASK_RING-1;j++){ix.push(0,j+1,j);const n=MASK_SPANS*MASK_RING;ix.push(n,n+j,n+j+1);}return ix;
}
