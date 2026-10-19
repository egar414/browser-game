import{waveHeight}from'../config.js';
import{bodyPoint}from'./propulsion.js';
import{clearancePoints}from'./shafting.js';
export const TINNY_BOUNCE={frequency:1.05,cruiseLift:.11,shaftLift:.25,cruisePitch:.07,shaftPitch:.17,contactClearance:.035,contactCooldown:.28};
const clamp=x=>Math.max(0,Math.min(1,x));
// Bounded planing-pressure oscillation drives actual heave/pitch springs.
// It continues without steering, but never generates lift at rest or in flight.
export function tinnyBounce(v,dt){
 if(v.type!=='tinny')return{lift:0,pitch:0};
 const target=!v.airborne&&!v.wipeout?clamp((v.speed-3)/5)*clamp(v.throttle*1.6)*clamp(v.drive?.wetness||0):0;
 v.bounceLoad=(v.bounceLoad||0)+(target-(v.bounceLoad||0))*(1-Math.exp(-4*dt));
 v.bouncePhase=((v.bouncePhase||0)+dt*TINNY_BOUNCE.frequency*Math.PI*2)%(Math.PI*2);
 const shaft=clamp(v.shaftLoad||0),pulse=Math.sin(v.bouncePhase)*(1-clamp(Math.abs(v.steer||0)/.6));
 v.bounceCompression=clamp(-pulse)*v.bounceLoad*shaft;
 return{lift:pulse*v.bounceLoad*(TINNY_BOUNCE.cruiseLift+shaft*(TINNY_BOUNCE.shaftLift-TINNY_BOUNCE.cruiseLift)),pitch:pulse*v.bounceLoad*(TINNY_BOUNCE.cruisePitch+shaft*(TINNY_BOUNCE.shaftPitch-TINNY_BOUNCE.cruisePitch))};
}
export function hullContactSplash(v,dt,time){
 if(v.type!=='tinny')return;
 v.contactCooldown=Math.max(0,(v.contactCooldown||0)-dt);
 if(v.airborne||v.wipeout||v.speed<3){v.contactDepths=null;return;}
 const points=clearancePoints(v).map(local=>{const p=bodyPoint(v,local);return{...p,depth:p.y-waveHeight(p.x,p.z,time)};});
 let impact=null;
 points.forEach((p,i)=>{const old=v.contactDepths?.[i],closing=old===undefined?0:(old-p.depth)/dt;
  if(old>TINNY_BOUNCE.contactClearance&&p.depth<=TINNY_BOUNCE.contactClearance&&closing>.25&&(!impact||closing>impact.impact))impact={type:'splash',contact:true,x:p.x,z:p.z,impact:Math.min(4,closing)};
 });
 v.contactDepths=points.map(p=>p.depth);
 if(impact&&!v.contactCooldown){v.contactCooldown=TINNY_BOUNCE.contactCooldown;v.hullHits=(v.hullHits||0)+1;v.lastHullHit={x:impact.x,z:impact.z,time};v.onEvent(impact);}
}
