import{sampleHullContacts,hullWaterlineContacts,HULL_CONTACT_LIMIT}from'./hull-support.js';
import {WOMP} from './womping.js';
import {isTinny,canWomp} from '../config.js';
export const TINNY_BOUNCE={frequency:1.05,shaftLift:.25,shaftPitch:.17,contactClearance:.035,contactCooldown:.28};
const clamp=x=>Math.max(0,Math.min(1,x));
// Bounded planing-pressure oscillation drives actual heave/pitch springs.
// It is active only in the shafting stance, never during ordinary cruising.
export function tinnyBounce(v,dt){
 if(!canWomp(v.type))return{lift:0,pitch:0};
 if(v.type==='cat'&&Math.max(v.wompLoad||0,v.bounceLoad||0)<.0001){v.bounceLoad=0;v.bounceCompression=0;return{lift:0,pitch:0};}
 const cat=v.type==='cat',stance=Math.max(cat?0:clamp(((v.shaftLoad||0)-.2)/.6),v.wompLoad||0);
 const target=stance*(!v.airborne&&!v.wipeout?clamp((v.speed-3)/5)*clamp(v.throttle*1.6)*clamp(v.drive?.wetness||0):0);
 v.bounceLoad=(v.bounceLoad||0)+(target-(v.bounceLoad||0))*(1-Math.exp(-4*dt));
 v.bouncePhase=((v.bouncePhase||0)+dt*TINNY_BOUNCE.frequency*(cat?.82:1)*Math.PI*2)%(Math.PI*2);
 const shaft=Math.max(clamp(v.shaftLoad||0),v.wompLoad||0),pulse=Math.sin(v.bouncePhase)*(1-clamp(Math.abs(v.steer||0)/.6));
 v.bounceCompression=clamp(-pulse)*v.bounceLoad*shaft;
 return{lift:pulse*v.bounceLoad*(cat?.72:1)*(Math.max(TINNY_BOUNCE.shaftLift,(v.wompLoad||0)*WOMP.lift)),pitch:pulse*v.bounceLoad*(cat?.7:1)*(Math.max(TINNY_BOUNCE.shaftPitch,(v.wompLoad||0)*WOMP.pitch))};
}
export function hullContactSplash(v,dt,time){
 if(!(dt>0))return;
 v.hullSplashCooldown=Math.max(0,(v.hullSplashCooldown||0)-dt);
 v.hullWashCooldown=Math.max(0,(v.hullWashCooldown||0)-dt);
 if(v.airborne||v.wipeout||v.type==='sled'){v.contactDepths=null;return;}
 const rows=sampleHullContacts(v,time),points=rows.flatMap(row=>row.points),impacts=new Map(),stance=Math.max(v.shaftLoad||0,v.wompLoad||0),threshold=stance>.2?.25:.70;
 v.contactCooldowns=Array.from({length:points.length},(_,i)=>Math.max(0,(v.contactCooldowns?.[i]||0)-dt));
 let index=0;
 for(const row of rows)for(const p of row.points){const old=v.contactDepths?.[index],closing=old===undefined?0:(old-p.depth)/dt;
  if(old!==undefined&&p.depth<=TINNY_BOUNCE.contactClearance&&closing>threshold&&!v.contactCooldowns[index]){
   impacts.set(row.section.id,Math.max(impacts.get(row.section.id)||0,Math.min(4,closing)));v.contactCooldowns[index]=TINNY_BOUNCE.contactCooldown;
  }index++;
 }
 v.contactDepths=points.map(p=>p.depth);
 if(!impacts.size||v.hullSplashCooldown){
  // Moving water peels away along the whole immersed hull. At rest, and at
  // raised dry bow sections, there is no invented ring of spray.
  if(isTinny(v.type)&&v.speed>3&&v.throttle>.12&&!v.hullWashCooldown){
   const cruising=stance<.2&&Math.abs(v.steer||0)<.25&&Math.abs(v.yawRate||0)<.3;
   const contacts=hullWaterlineContacts(v,time,null,rows).map(p=>({...p,sprayScale:cruising?.85:1}));
   if(contacts.length){v.hullWashCooldown=.18;v.onEvent?.({type:'splash',contact:true,wash:true,x:v.x,y:v.y,z:v.z,impact:Math.min(1.1,v.speed*.07),time,contacts});}
  }
  return;
 }
 let contacts=hullWaterlineContacts(v,time,impacts,rows);
 if(!contacts.length)contacts=rows.filter(row=>impacts.has(row.section.id)).slice(0,HULL_CONTACT_LIMIT).map(row=>{const p=row.points.reduce((a,b)=>Math.abs(a.depth)<Math.abs(b.depth)?a:b);return{...p,impact:impacts.get(row.section.id),hullContact:true,station:row.section.id};});
 if(contacts.length){const impact=contacts.reduce((a,b)=>a.impact>b.impact?a:b);v.hullHits=(v.hullHits||0)+contacts.length;v.lastHullHit={x:impact.x,y:impact.y,z:impact.z,time,count:contacts.length};v.hullSplashCooldown=.10;v.onEvent?.({type:'splash',contact:true,...impact,time,contacts});}
}
