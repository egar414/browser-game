import {WOMP} from './womping.js';
import {isTinny} from '../config.js';
import{waveHeight}from'../config.js';
import{bodyPoint}from'./propulsion.js';
import{clearancePoints}from'./shafting.js';
export const TINNY_BOUNCE={frequency:1.05,shaftLift:.25,shaftPitch:.17,contactClearance:.035,contactCooldown:.28};
const clamp=x=>Math.max(0,Math.min(1,x));
// Bounded planing-pressure oscillation drives actual heave/pitch springs.
// It is active only in the shafting stance, never during ordinary cruising.
export function tinnyBounce(v,dt){
 if(!isTinny(v.type))return{lift:0,pitch:0};
 const stance=Math.max(clamp(((v.shaftLoad||0)-.2)/.6),v.wompLoad||0);
 const target=stance*(!v.airborne&&!v.wipeout?clamp((v.speed-3)/5)*clamp(v.throttle*1.6)*clamp(v.drive?.wetness||0):0);
 v.bounceLoad=(v.bounceLoad||0)+(target-(v.bounceLoad||0))*(1-Math.exp(-4*dt));
 v.bouncePhase=((v.bouncePhase||0)+dt*TINNY_BOUNCE.frequency*Math.PI*2)%(Math.PI*2);
 const shaft=Math.max(clamp(v.shaftLoad||0),v.wompLoad||0),pulse=Math.sin(v.bouncePhase)*(1-clamp(Math.abs(v.steer||0)/.6));
 v.bounceCompression=clamp(-pulse)*v.bounceLoad*shaft;
 return{lift:pulse*v.bounceLoad*(Math.max(TINNY_BOUNCE.shaftLift,(v.wompLoad||0)*WOMP.lift)),pitch:pulse*v.bounceLoad*(Math.max(TINNY_BOUNCE.shaftPitch,(v.wompLoad||0)*WOMP.pitch))};
}
export function hullContactSplash(v,dt,time){
 if(!isTinny(v.type))return;
 v.contactCooldowns=(v.contactCooldowns||Array(18).fill(0)).map(t=>Math.max(0,t-dt));
 if(v.airborne||v.wipeout||v.speed<3||Math.max(v.shaftLoad||0,v.wompLoad||0)<.2){v.contactDepths=null;return;}
 const points=clearancePoints(v).map(local=>{const p=bodyPoint(v,local);return{...p,depth:p.y-waveHeight(p.x,p.z,time)};});
 const contacts=[];
 points.forEach((p,i)=>{const old=v.contactDepths?.[i],closing=old===undefined?0:(old-p.depth)/dt;
  if(old!==undefined&&p.depth<=TINNY_BOUNCE.contactClearance&&closing>.25&&!v.contactCooldowns[i]){
   contacts.push({x:p.x,z:p.z,impact:Math.min(4,closing)});v.contactCooldowns[i]=TINNY_BOUNCE.contactCooldown;
  }
 });
 v.contactDepths=points.map(p=>p.depth);
 if(contacts.length){const impact=contacts.reduce((a,b)=>a.impact>b.impact?a:b);v.hullHits=(v.hullHits||0)+contacts.length;v.lastHullHit={x:impact.x,z:impact.z,time,count:contacts.length};v.onEvent({type:'splash',contact:true,...impact,contacts});}
}
