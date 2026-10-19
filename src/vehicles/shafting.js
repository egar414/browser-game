import{sportfisherZ}from'./sportfisher-shape.js';
import{waveHeight}from'../config.js';
import{bodyPoint}from'./propulsion.js';
export const SHAFTING={balancePitch:.90,lowerPitch:.75,upperPitch:1.05,minimumSpeed:2.4,throttleBalance:.56,throttleMoment:.12,speedMoment:.004,speedTarget:7.2,sternPivot:1.10,hullClearance:.12,bankAngle:.20,passengerResponse:2.4};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export function updatePassenger(v,dt){
 if(v.type!=='tinny')return;
 const aft=v.riderAft>.4&&v.speed>4.5?1:v.planing>.6||v.speed>7?1:Math.abs(v.throttle)>.15?0:.35;
 v.passengerAft=damp(v.passengerAft??.35,aft,SHAFTING.passengerResponse,dt);
}
export function shaftPitch(v,input,surfacePitch,dt){
 if(v.type!=='tinny')return null;
 const wanted=input.freestyle&&!v.airborne&&!v.wipeout&&v.speed>SHAFTING.minimumSpeed&&v.throttle>.04&&Math.abs(v.steer)<.4;
 v.shaftLoad=damp(v.shaftLoad||0,wanted?1:0,wanted?3.2:4,dt);
 if(v.shaftLoad<.01||Math.abs(v.steer)>.4)return null;
 const speedRise=clamp((v.speed-SHAFTING.minimumSpeed)/3.4),balance=SHAFTING.balancePitch+(v.throttle-SHAFTING.throttleBalance)*SHAFTING.throttleMoment+(v.speed-SHAFTING.speedTarget)*SHAFTING.speedMoment+v.trimDegrees*.004-Math.abs(v.steer)*.35;
 // Weight forward helps takeoff; the second rider then moves aft on the plane.
 return clamp(surfacePitch*.22+balance*speedRise-(1-(v.passengerAft??.35))*.08,0,SHAFTING.upperPitch)*v.shaftLoad;
}
// Prop torque and crew weight cant the raised hull onto one quarter.
// This feeds the roll spring and water contacts, rather than tilting only the mesh.
export function shaftRoll(v){
 if(v.type!=='tinny'||v.airborne||v.wipeout)return 0;
 return -SHAFTING.bankAngle*(v.shaftLoad||0)*clamp((v.pitch-.55)/.3)*clamp(1-Math.abs(v.steer||0)/.5);
}
export function updateShaftStatus(v,dt){
 if(v.type!=='tinny')return;
 const active=!v.airborne&&!v.wipeout&&(v.shaftLoad||0)>.35&&v.pitch>.6&&Math.abs(v.steer)<.4,projected=v.pitch+(v.pitchRate||0)*.24,error=(projected-SHAFTING.balancePitch)/.24;
 const cue=!active?'BUILD SPEED':v.throttle<.25?'MORE THROTTLE':'STABLE BOW RIDE';
 v.shaft={active,pitch:v.pitch,error:clamp(error,-1,1),needle:clamp(.5+error*.5),cue,seconds:active&&v.pitch>SHAFTING.lowerPitch?(v.shaft?.seconds||0)+dt:0,risk:clamp((projected-SHAFTING.upperPitch)/.22),passengerAft:v.passengerAft??.35};
}
export function clearancePoints(v){
 if(v.type==='tinny')return[[-1.08,.52,-.23],[-.82,.59,-.27],[.12,.58,-.23],[.68,.42,-.10],[1.09,.14,.08],[1.17,.015,.18]].flatMap(([z,w,bottom])=>[[0,bottom,z],[-w*.76,bottom+.06,z],[w*.76,bottom+.06,z]]);
 if(v.type==='cat')return[-1,1].flatMap(side=>[-1.5,0,1.25].map(z=>[side*.73,-.1,z]));
 if(v.type==='cruiser')return[-1,1].flatMap(side=>[-4,-1,1.5].map(z=>[side*1.5,.83,sportfisherZ(z)]));
 return[];
}
export function minimumHullClearance(v,time){
 let result=Infinity;for(const p of clearancePoints(v)){const w=bodyPoint(v,p);result=Math.min(result,w.y-waveHeight(w.x,w.z,time));}return result;
}
// A water-contact constraint in physics, shared with visible wave sampling.
// High bow rides pivot around the transom, leaving the propeller immersed.
export function constrainHullWater(v,time){
 v.hullCorrection=0;if(v.airborne||!['tinny','cat','cruiser'].includes(v.type))return;
 const bow=clamp((v.pitch-.45)/.7),dry=(v.type==='tinny'?clamp((v.pitch-.40)/.40):bow)*(v.shaftLoad||0)*clamp(1-Math.abs(v.steer||0)/.5),allow=v.type==='cruiser'?.1:v.type==='cat'?.22:.30*(1-dry)-SHAFTING.hullClearance*dry;
 if(v.type!=='cruiser'&&bow<.05)return;
 let correction=0;for(const point of clearancePoints(v)){const p=bodyPoint(v,point);correction=Math.max(correction,waveHeight(p.x,p.z,time)-allow-p.y);}
 if(correction>0){v.y+=correction;v.vy=Math.max(0,v.vy||0);v.hullCorrection=correction;}
}
