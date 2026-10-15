import {WORLD} from '../config.js';
export const ONLINE_TUNING={sendInterval:.125,heartbeat:2,interpolation:.18,staleAfter:8,maxPeers:48,visibleLow:4,visibleMedium:8,visibleHigh:12};
export const pilotId=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
export function inviteCode(text){return String(text||'').trim().toUpperCase().replace(/[- ]/g,'');}
export function formatCode(text){return inviteCode(text).match(/.{1,4}/g)?.join('-')||'';}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validatePose(p){
 if(!p||typeof p.epoch!=='string'||! /^[a-z0-9-]{8,40}$/i.test(p.epoch)||p.version!==1||!['ski','cat'].includes(p.type)||!Number.isSafeInteger(p.seq)||p.seq<0)return null;
 const limits={x:[WORLD.minX-10,WORLD.maxX+10],y:[-5,40],z:[WORLD.minZ-10,WORLD.maxZ+10],heading:[-1e6,1e6],pitch:[-2,2],roll:[-2,2],vx:[-80,80],vy:[-30,30],vz:[-80,80],speed:[0,85],steer:[-1,1],throttle:[-1,1],riderAft:[0,1],trim:[-.5,.6],nozzle:[-1,1],rpm:[0,12000],flow:[0,3],exitSpeed:[0,80],reverse:[0,1],planing:[0,1],slip:[-60,60],yawRate:[-4,4],lateralAcceleration:[-60,60]};
 const result={version:1,type:p.type,seq:p.seq,epoch:p.epoch};
 for(const [key,[min,max]]of Object.entries(limits)){if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<min||p[key]>max)return null;result[key]=p[key];}
 result.heading=Math.atan2(Math.sin(result.heading),Math.cos(result.heading));result.airborne=!!p.airborne;result.away=!!p.away;
 result.colour=Number.isInteger(p.colour)?clamp(p.colour,0,2):0;
 result.design=['classic','race','heritage'].includes(p.design)?p.design:'classic';
 result.pose=['hangman','nohander','superman'].includes(p.pose)?p.pose:'';
 return result;
}
export function packPose(v,settings,seq,away=false,epoch='local-test'){
 const d=v.drive||{},r=n=>Math.round((n||0)*1000)/1000;
 return validatePose({version:1,seq,epoch,type:v.type,x:r(v.x),y:r(v.y),z:r(v.z),heading:r(v.heading),pitch:r(v.pitch),roll:r(v.roll),vx:r(v.vx),vy:r(v.vy),vz:r(v.vz),speed:r(v.speed),steer:r(v.steer),throttle:r(v.throttle),riderAft:r(v.riderAft),trim:r(d.trimAngle),nozzle:r(d.steeringAngle),rpm:r(d.rpm),flow:r(d.flow),exitSpeed:r(d.exitSpeed),reverse:r(d.reverse),planing:r(v.planing),slip:r(v.slip),yawRate:r(v.yawRate),lateralAcceleration:r(v.lateralAcceleration),airborne:v.airborne,pose:v.airTricks?.pose||'',colour:settings.colour||0,design:settings.design,away});
}
export function blendPose(a,b,t){
 const p={...b};for(const key of ['x','y','z','pitch','roll','vx','vy','vz','speed','steer','throttle','riderAft'])p[key]=a[key]+(b[key]-a[key])*t;
 p.heading=a.heading+Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))*t;return p;
}
