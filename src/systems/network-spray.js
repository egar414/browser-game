import {sprayState,pumpDischarge,jetPlumeSource,launchSpray} from './spray-model.js';
// Relative emission points follow the interpolated boat. Detached particles
// remain in world space once emitted; no victim IDs or damage amounts are sent.
export function packSpray(v,time,emitting=true){
 if(!emitting||!v.config||!v.drive||v.airborne||v.wipeout)return [];
 const state=sprayState(v,false,time),plume=jetPlumeSource(v,pumpDischarge(v,time),time,state),sources=[];
 const add=(kind,p,velocity,power)=>{const round=n=>Math.round(n*100)/100;sources.push({kind,ox:round(p.x-v.x),oy:round(p.y-v.y),oz:round(p.z-v.z),vx:round(velocity.x),vy:round(velocity.y),vz:round(velocity.z),power:round(Math.min(2,power))});};
 if(plume)add('rear',plume.origin,plume.velocity,plume.power);
 for(const side of [-1,1]){const power=side<0?state.left:state.right;if(power>.05){const p=launchSpray(v,state,side,()=>.5);add(side<0?'left':'right',p,{x:p.vx,y:p.vy,z:p.vz},power);}}
 return sources;
}
export function remoteSpray(p){const sources=p.spray||[];return sources.filter(s=>['rear','left','right'].includes(s.kind)&&['ox','oy','oz','vx','vy','vz','power'].every(k=>Number.isFinite(s[k]))).map(s=>({...s,x:p.x+s.ox,y:p.y+s.oy,z:p.z+s.oz}));}
