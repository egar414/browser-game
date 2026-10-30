import {isTinny,isJet,waveHeight,VEHICLES} from '../config.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const CAPSIZE={rightSeconds:2.4,settleSeconds:1.5,overloadSeconds:3.3};
export const canCapsize=type=>isTinny(type)||isJet(type)||type==='cat';
// The existing roll field carries overturning online; no new pose/schema token.
export const capsizedPose=v=>canCapsize(v.type)&&(v.capsized===true||Math.abs(v.roll||0)>1.05);
export function beginCapsize(v,reason='Spray turn capsize',side=0){
 if(v.capsized||!canCapsize(v.type))return false;
 const sign=side||-Math.sign(v.steer||v.slip||1),fx=Math.sin(v.heading),fz=Math.cos(v.heading),speed=Math.hypot(v.vx||0,v.vz||0),carry=Math.min(1,6/(speed||1));
 v.capsized=true;v.capsizeAge=0;v.capsizeSide=sign;v.capsizeStartPitch=v.pitch;v.capsizeStartRoll=v.roll;v.rightProgress=0;v.wipeout=1;v.wipeoutReason=reason;v.looping=reason==='Looped the tinny';v.capsizePitchTarget=v.looping?Math.PI*2:0;
 v.ejection={x:v.x+fz*sign*.5,y:v.y+.8,z:v.z-fx*sign*.5,vx:v.vx*carry+fz*sign*3.5,vy:4.4,vz:v.vz*carry-fx*sign*3.5,age:0,floating:false};
 v.airborne=false;v.vx*=.18;v.vz*=.18;v.vy=0;v.throttle=0;v.steer=0;v.shaftLoad=0;v.wompLoad=0;v.loopLoad=0;v.wheelieTime=v.donut=v.driftTime=v.spin=v.airTime=v.sprayTurnLoad=0;v.airTricks?.reset();v.propulsion?.reset();if(v.propulsion)v.drive=v.propulsion.state;
 if(v.shaft)v.shaft={...v.shaft,active:false,cue:'CAPSIZED · HOLD R',seconds:0};
 v.onEvent?.({type:'wipeout',label:reason});v.onEvent?.({type:'capsize',label:'Overboard · hold R to roll upright'});return true;
}
export function checkSprayCapsize(v,input,dt){
 if(!canCapsize(v.type)||v.capsized)return false;
 const committed=!v.airborne&&!v.wipeout&&input.freestyle&&Math.abs(input.steer)>.9&&v.throttle>.8&&(v.drive?.wetness||0)>.15;
 if(!committed)v.sprayEntrySpeed=0;else if(!v.sprayEntrySpeed)v.sprayEntrySpeed=v.speed;
 const demand=Math.max(v.speed,(v.sprayEntrySpeed||0)*.65)*Math.abs(v.yawRate||0)+Math.abs(v.lateralAcceleration||0),hard=committed&&v.speed>3&&(v.sprayEntrySpeed||0)>9&&Math.abs(v.steer)>.9&&Math.abs(v.slip)>3;
 const overload=hard?clamp((demand-8)/12):0;
 v.capsizeRisk=clamp((v.capsizeRisk||0)+dt*(overload>0?overload*(isTinny(v.type)?1.3:1)/CAPSIZE.overloadSeconds:committed?-.06:-.8));
 return v.capsizeRisk>=1?beginCapsize(v,'Spray turn capsize'):false;
}
export function updateCapsize(v,dt,input,time){
 v.capsizeAge+=dt;const age=v.capsizeAge,sign=v.capsizeSide,water=waveHeight(v.x,v.z,time);
 v.vx*=Math.exp(-1.4*dt);v.vz*=Math.exp(-1.4*dt);const x=v.x+v.vx*dt,z=v.z+v.vz*dt;
 if(!v.collision(x,z,v.config.width*.5+.35,water)){v.x=x;v.z=z;}else v.vx=v.vz=0;
 v.speed=Math.hypot(v.vx,v.vz);v.throttle=0;v.steer=0;v.yawRate=0;v.vy=0;v.wipeout=1;
 const e=v.ejection;e.age+=dt;
 if(!e.floating){e.vy-=9.81*dt;const x=e.x+e.vx*dt,z=e.z+e.vz*dt;if(!v.collision(x,z,.3,e.y)){e.x=x;e.z=z;}else{e.vx*= -.2;e.vz*= -.2;}e.y+=e.vy*dt;if(e.vy<0&&e.y<=waveHeight(e.x,e.z,time)+.08){e.floating=true;e.vy=0;}}
 if(e.floating)e.y=waveHeight(e.x,e.z,time)+.08;
 if(v.looping&&age<1.45){v.pitch=v.capsizeStartPitch+4.2*age;v.roll=sign*.6*smooth(age/1.45);v.y=water+.4+Math.sin(Math.min(1,age/1.45)*Math.PI)*.4;}
 else{
  v.looping=false;v.pitch+=((v.capsizePitchTarget||0)-v.pitch)*(1-Math.exp(-5*dt));
  const target=sign*(Math.PI-.015);v.roll+=(target-v.roll)*(1-Math.exp(-4*dt));v.y=water+.24;
  v.rightProgress=age>CAPSIZE.settleSeconds&&input.righting?Math.min(1,v.rightProgress+dt/CAPSIZE.rightSeconds):Math.max(0,v.rightProgress-dt*2);
  if(v.rightProgress>0){v.roll=target*(1-smooth(v.rightProgress));v.y=water+.24*(1-v.rightProgress)+v.config.rideHeight*v.rightProgress;}
 }
 if(v.rightProgress>=1){
  v.capsized=false;v.wipeout=0;v.looping=false;v.ejection=null;v.capsizeRisk=0;v.sprayEntrySpeed=0;v.rightProgress=0;v.trickCooldown=0;v.pitch=v.roll=v.pitchRate=v.rollRate=0;v.vx=v.vz=v.speed=v.vy=v.riderAft=v.shaftLoad=v.shaftStrain=v.bounceLoad=v.wompEnergy=0;v.wompReady=false;v.contactDepths=null;v.contactCooldowns=null;v.hullWashCooldown=v.hullSplashCooldown=0;v.supportWater=null;v.y=waveHeight(v.x,v.z,time)+VEHICLES[v.type].rideHeight;v.previous=v.snapshot();v.onEvent?.({type:'righted',label:'Back aboard · craft upright'});
 }
}
