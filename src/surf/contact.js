import {waveHeight} from '../config.js';
import {surfWave,barrelRoof,curlPoint,surfWidth,SURF_BREAK as B,SURF_OPTIONS,clamp} from './break.js';
import {SURF_PHYSICS as P} from './tuning.js';
// Shared sampling contract; the overhanging lip is a separate parametric sheet.
export function sampleSurfSurface(x,z,time,wave=null){
 const w=wave||surfWave(x,z,time),roof=barrelRoof(x,z,time,w),tip=curlPoint(x,w.crest,time,Math.PI*.98,w);
 return {...w,position:{x,y:waveHeight(x,z,time),z},steepness:Math.hypot(w.slopeX,w.slopeZ),
  frame:{along:SURF_OPTIONS.direction*(x-B.x),across:w.q/surfWidth(),pocket:SURF_OPTIONS.direction*(x-w.peel)},
  lip:{x,y:tip.y,z:w.crest+tip.q,breaking:w.curl>.25},barrel:{roof,insideSpan:roof!==null&&w.q>2.3*surfWidth()&&w.q<10.5*surfWidth()}};
}
// Nose, centre and tail are persistent objects, reused by both physics and debug.
export function makeContacts(){return [P.noseSample,0,P.tailSample].map(offset=>({offset,x:0,y:0,z:0,height:0,load:0}));}
export function sampleBoardContact(s,c,time){
 const fx=Math.sin(s.heading),fz=Math.cos(s.heading),points=s.contacts||(s.contacts=makeContacts());let sum=0,load=0;
 for(const p of points){const d=p.offset*c.length;p.x=s.x+fx*d;p.z=s.z+fz*d;p.height=waveHeight(p.x,p.z,time)+P.rideHeight;p.y=s.y+Math.sin(s.pitch||0)*d;p.load=clamp(1-Math.max(0,p.y-p.height)/P.contactReach);sum+=p.height;load+=p.load;}
 s.contact=load/3;s.contactState=s.airborne?'AIR':s.contact>.8?'PLANING':s.contact>.1?'PARTIAL':'FREE';
 return {height:sum/3,pitch:Math.atan2(points[0].height-points[2].height,(P.noseSample-P.tailSample)*c.length)};
}
export function supportBoard(s,c,w,dt){
 const surface=sampleBoardContact(s,c,s.time),target=surface.height;
 const waterVy=w.surfaceVelocity.y+s.vx*w.slopeX+s.vz*w.slopeZ;
 s.relativeSpeed=Math.hypot(s.vx-w.surfaceVelocity.x,s.vz-w.surfaceVelocity.z);
 if(s.contact<.05&&s.y-target>P.contactReach){s.vy-=P.gravity*dt;s.y+=s.vy*dt;s.planing=0;return;}
 if(!Number.isFinite(s.vy))s.vy=waterVy;
 // Exact critically damped support around a moving target; no per-frame y snap.
 const omega=P.contactFrequency,error=s.y+waterVy*dt-target,relative=s.vy-waterVy;
 const decay=Math.exp(-omega*dt),t=(relative+omega*error)*dt;
 s.y=target+(error+t)*decay;s.vy=waterVy+(relative-omega*t)*decay;
 s.pitchRate=(surface.pitch+(s.foreAft||0)*.08-s.pitch)*8;
 s.pitch+=s.pitchRate*dt;
 s.relativeSpeed=Math.hypot(s.vx-w.surfaceVelocity.x,s.vz-w.surfaceVelocity.z);
 s.planing=clamp(s.relativeSpeed/5)*s.contact;
}
