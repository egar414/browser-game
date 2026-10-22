import{isTowPose}from'./tow-protocol.js';
import{isSledPose}from'./sled-protocol.js';
import {isTenderPassenger} from './tender-crew.js';
import {packSpray} from './network-spray.js';
import {availableCraft} from './craft-access.js';
export const ONLINE_TYPES = ['ski','cat','tinny','dinghy','skua','cruiser','seago','racer','hyper'];
const ranges={x:[-2600,9600],y:[-20,60],z:[-4700,3900],heading:[-Math.PI,Math.PI],pitch:[-25,25],roll:[-25,25],vx:[-160,160],vz:[-160,160],speed:[0,160],steer:[-1,1],throttle:[-1,1],trim:[-20,40],rpm:[0,15000],riderAft:[0,1],planing:[0,1],passengerAft:[0,1],trimAngle:[-1,1],steeringAngle:[-2,2],deckX:[-2,2],deckZ:[-8,8],deckHeading:[-Math.PI,Math.PI]};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:0));
export const wrapAngle=a=>Math.atan2(Math.sin(a||0),Math.cos(a||0));
// Keep a reloaded player's sequence above their old tab's packets. Advancing
// within a session also tolerates a local clock adjustment without rewinding.
export const nextSequence=(previous,now=Date.now())=>Math.max(previous+1,now*1000);
export function packPose(v,settings,deck,active,time=0,emitting=active){
 const result={type:availableCraft(v.type,settings.creatorAccess),colour:settings.colour,design:settings.design,active:!!active,airborne:!!v.airborne,pose:v.airTricks?.pose||null,deck:!!deck.active};
 const values={...v,heading:wrapAngle(v.heading),roll:wrapAngle(v.roll),trim:v.trimDegrees,rpm:v.drive?.rpm,trimAngle:v.drive?.trimAngle,steeringAngle:v.drive?.steeringAngle,deckX:deck.x,deckZ:deck.z,deckHeading:wrapAngle(deck.heading)};
 for(const [key,[lo,hi]]of Object.entries(ranges))result[key]=clamp(values[key],lo,hi);
 result.spray=packSpray(v,time,emitting);return result;
}
export function validPose(p){return p&&ONLINE_TYPES.includes(p.type)&&Object.entries(ranges).every(([key,[lo,hi]])=>Number.isFinite(p[key])&&p[key]>=lo&&p[key]<=hi)&&[0,1,2].includes(p.colour);}
export class RemoteStates{
 constructor(){this.players=new Map();}
 clear(){this.players.clear();}
 accept(players,self,now){
  const ids=new Set();
  for(const p of players.slice(0,8)){
   if(typeof p.id!=='string'||p.id===self)continue;ids.add(p.id);
   if(p.pose?.type==='hyper'&&p.creator!==true){this.players.delete(p.id);continue;}
   if(!validPose(p.pose)||!Number.isSafeInteger(p.seq))continue;
   let r=this.players.get(p.id);
   if(r){r.combat=p.combat;r.combatAt=now;r.creator=p.creator===true;r.name=String(p.name||'Boater').slice(0,20);}
   if(r&&p.seq<=r.seq){r.seen=now;continue;}
   if(!r){r={id:p.id,history:[]};this.players.set(p.id,r);}
   r.combat=p.combat;r.combatAt=now;r.name=String(p.name||'Boater').slice(0,20);r.creator=p.creator===true;r.seq=p.seq;r.seen=now;r.history.push({time:now,...p.pose});
   if(r.history.length>8)r.history.shift();
  }
  for(const [id,r]of this.players)if(!ids.has(id)||now-r.seen>12000)this.players.delete(id);
 }
 sample(r,now){
  const h=r.history,target=now-400;
  let a=h[0],b=h.at(-1);
  for(let i=1;i<h.length;i++)if(h[i].time>=target){a=h[i-1];b=h[i];break;}
  if(!a)return null;
  // Seat identity is discrete; never interpolate a passenger token or marker.
  if(isTowPose(a)!==isTowPose(b)||(isTowPose(b)&&a.rpm!==b.rpm))return {...b};
  if(isTenderPassenger(a)||isTenderPassenger(b)||isSledPose(a)!==isSledPose(b))return {...b};
  // Recover/teleport immediately instead of sailing a ghost across town.
  if(Math.hypot(b.x-a.x,b.z-a.z)>180)return {...b};
  const t=clamp((target-a.time)/Math.max(1,b.time-a.time),0,1),p={...b};
  for(const key of Object.keys(ranges))p[key]=a[key]+(b[key]-a[key])*t;
  if(Array.isArray(a.spray)&&Array.isArray(b.spray))p.spray=b.spray.map(s=>{const prev=a.spray.find(q=>q.kind===s.kind);if(!prev)return s;const value={...s};for(const key of ['ox','oy','oz','vx','vy','vz','power'])value[key]=prev[key]+(s[key]-prev[key])*t;return value;});
  if(isTowPose(b)){p.deck=true;p.deckX=-2;p.deckZ=8;p.trim=40;p.rpm=b.rpm;}
  if(isSledPose(b)){p.deckX=-1;p.deckZ=8;p.trim=40;p.deck=true;}
  p.heading=a.heading+wrapAngle(b.heading-a.heading)*t;
  if(target>b.time&&b.active){const seconds=Math.min(.25,(target-b.time)/1000);p.x+=b.vx*seconds;p.z+=b.vz*seconds;}
  return p;
 }
}
