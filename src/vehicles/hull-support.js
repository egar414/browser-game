import {HULL_WATER_PROFILES} from '../systems/hull-water-profiles.js';
import {waveHeight,isTinny,isJet} from '../config.js';
import {bodyPoint,bodyVector} from './propulsion.js';

const cache=new Map();
const frames=new WeakMap();
export const HULL_CONTACT_LIMIT=12;
export function hullSections(type){
 if(cache.has(type))return cache.get(type);const profiles=HULL_WATER_PROFILES[type]||[],sections=[];
 for(let part=0;part<profiles.length;part++)for(let i=0;i<=8;i++)sections.push({id:sections.length,part,t:i/8,closed:type==='cat',points:profiles[part](i/8).slice(0,type==='cat'?8:7)});
 cache.set(type,sections);return sections;
}
export function sampleHullContacts(v,time){
 let frame=frames.get(v);
 if(frame&&frame.type===v.type&&frame.time===time&&['x','y','z','heading','pitch','roll'].every(k=>frame[k]===v[k]))return frame.rows;
 if(!frame||frame.type!==v.type){frame={type:v.type,rows:hullSections(v.type).map(section=>({section,points:section.points.map(()=>({x:0,y:0,z:0,depth:0}))}))};frames.set(v,frame);}
 const cr=Math.cos(v.roll||0),sr=Math.sin(v.roll||0),cp=Math.cos(v.pitch||0),sp=Math.sin(v.pitch||0),ch=Math.cos(v.heading||0),sh=Math.sin(v.heading||0);
 const xx=cr*ch-sr*sp*sh,xy=-sr*ch-cr*sp*sh,xz=cp*sh,yx=sr*cp,yy=cr*cp,yz=sp,zx=-cr*sh-sr*sp*ch,zy=sr*sh-cr*sp*ch,zz=cp*ch;
 for(const row of frame.rows)for(let j=0;j<row.points.length;j++){const[x,y,z]=row.section.points[j],p=row.points[j];p.x=v.x+x*xx+y*xy+z*xz;p.y=v.y+x*yx+y*yy+z*yz;p.z=v.z+x*zx+y*zy+z*zz;p.depth=p.y-waveHeight(p.x,p.z,time);}
 Object.assign(frame,{time,x:v.x,y:v.y,z:v.z,heading:v.heading,pitch:v.pitch,roll:v.roll});return frame.rows;
}
export function raiseHullSamples(v,delta){const frame=frames.get(v);if(!frame)return;frame.y=v.y;for(const row of frame.rows)for(const p of row.points){p.y+=delta;p.depth+=delta;}}
export function lowestHullDepth(v,time){
 let depth=Infinity;for(const row of sampleHullContacts(v,time))for(const p of row.points)depth=Math.min(depth,p.depth);return depth;
}
export function hullDraftAllowance(v){
 const base=({ski:.25,seago:.34,hyper:.29,cat:.22,racer:.27,cruiser:.80,dive:.55,rib:.55})[v.type]??.30;
 // Sealed PWCs retain a wetted aft intake when the bow rises. Their rear
 // quarters may immerse; open-boat gunwales must remain above the surface.
 return base+(isJet(v.type)?Math.max(0,Math.sin(v.pitch||0))*(v.type==='ski'?.35:.45):0);
}
export function hullSupportCorrection(v,time,allow=hullDraftAllowance(v)){
 const rows=sampleHullContacts(v,time),frame=frames.get(v);if(frame)frame.support=null;
 let correction=0;for(const {section,points}of rows)for(let j=0;j<points.length;j++){
  const open=isTinny(v.type)||v.config?.diveBoat||v.type==='cruiser',rim=open&&(j===0||j===6);
  const next=(rim?.035:-allow)-points[j].depth;if(next>correction){correction=next;frame.support={point:points[j],local:section.points[j]};}
 }
 return Math.max(0,correction);
}
export function hullSupportVelocity(v,time,dt){
 const support=frames.get(v)?.support;if(!support||!v.previous||!(dt>0))return 0;
 const old=bodyPoint(v.previous,support.local),p=support.point;
 return Math.max(0,Math.min(3.5,(waveHeight(p.x,p.z,time)-waveHeight(old.x,old.z,time-dt))/dt))*.8;
}
// Waterline intersections stay on the genuine hull sections. A shaft can have
// just one wetted stern quarter; raised bow samples never become spray origins.
export function hullWaterlineContacts(v,time,impacts=null,sampled=null){
 const rows=sampled||sampleHullContacts(v,time),result=[];
 for(const row of rows){
  const impact=impacts?.get(row.section.id);if(impacts&&!impact)continue;
  const profile=HULL_WATER_PROFILES[v.type][row.section.part];
  for(let j=0;j<row.points.length-(row.section.closed?0:1);j++){
   const next=(j+1)%row.points.length,a=row.points[j],b=row.points[next];if(a.depth*b.depth>0)continue;
   let lo=0,hi=1,dl=a.depth,dh=b.depth,u=dl/(dl-dh||1),p;
   for(let k=0;k<5;k++){p={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u};const d=p.y-waveHeight(p.x,p.z,time);if(Math.abs(d)<.0005)break;if((d>0)===(dl>0)){lo=u;dl=d;}else{hi=u;dh=d;}u=lo+(hi-lo)*dl/(dl-dh||1);}
   const local=row.section.points,across=local[next].map((n,k)=>n-local[j][k]),near=profile(Math.max(0,row.section.t-.001))[j],far=profile(Math.min(1,row.section.t+.001))[j],along=far.map((n,k)=>n-near[k]);
   const n=bodyVector(v,[across[1]*along[2]-across[2]*along[1],across[2]*along[0]-across[0]*along[2],across[0]*along[1]-across[1]*along[0]]),length=Math.hypot(n.x,n.y,n.z)||1;
   result.push({...p,nx:n.x/length,ny:n.y/length,nz:n.z/length,impact:impact||1,hullContact:true,station:row.section.id});
  }
 }
 // Spatially retain both sides, rather than emitting only from the first bow
 // or stern stations, while keeping one impact within a fixed visual budget.
 if(result.length<=HULL_CONTACT_LIMIT)return result;
 return Array.from({length:HULL_CONTACT_LIMIT},(_,i)=>result[Math.floor(i*result.length/HULL_CONTACT_LIMIT)]);
}
