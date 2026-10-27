import{hullContactSplash}from'./tinny-bounce.js';
import{assistedYaw}from'./steering-assist.js';
import{constrainHullWater}from'./shafting.js';
import{WORLD,waveHeight,RIDE_MODES}from'../config.js';
import{bodyPoint}from'./propulsion.js';
export const RACER_HANDLING={acceleration:11.5,braking:17,coastDrag:1.8,steerResponse:10,lowTurnRate:.85,turnSpeedScale:24,grip:3.8,waterSpring:30,waterDamping:11,boundaryMargin:700};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export function updateRacer(v,dt,input,time){
 v.previous=v.snapshot();if(v.wipeout>0){v.wipeout-=dt;if(v.wipeout<=0)v.recover(true);return;}
 v.trickCooldown=Math.max(0,v.trickCooldown-dt);
 const T=RACER_HANDLING,c=v.config;v.throttle=damp(v.throttle,input.throttle,2.8,dt);v.steer=damp(v.steer,input.steer,T.steerResponse,dt);v.setTrim(v.trimDegrees+(input.trim||0)*3*dt);
 const oldForward=v.vx*Math.sin(v.heading)+v.vz*Math.cos(v.heading),braking=input.throttle<0&&oldForward>1;
 const target=braking?0:v.throttle*(v.throttle>=0?c.maxSpeed*(RIDE_MODES[v.rideMode]?.power||1):c.reverseMax);
 const rate=braking?T.braking:Math.abs(input.throttle)<.05?T.coastDrag:T.acceleration*(v.workshop?.power||1);
 let forward=oldForward+clamp(target-oldForward,-rate*dt,rate*dt);if(Math.abs(target-forward)<.05)forward=target;
 const yaw=v.steer*T.lowTurnRate*(v.workshop?.yaw||1)/(1+Math.abs(forward)/T.turnSpeedScale)*Math.min(1,Math.abs(forward)/5)*Math.sign(forward||1);const previousYaw=v.yawRate;v.yawRate=damp(v.yawRate,yaw,3,dt);v.yawRate=assistedYaw(v,input,dt,previousYaw,v.yawRate,{forward,wet:1});v.heading+=v.yawRate*dt;
 const fx=Math.sin(v.heading),fz=Math.cos(v.heading),oldX=v.x,oldZ=v.z;
 const lateral=(v.vx*fz-v.vz*fx)*Math.exp(-T.grip*(v.workshop?.grip||1)*dt);v.vx=fx*forward+fz*lateral;v.vz=fz*forward-fx*lateral;v.speed=Math.hypot(v.vx,v.vz);if(v.speed>c.maxSpeed){v.vx*=c.maxSpeed/v.speed;v.vz*=c.maxSpeed/v.speed;v.speed=c.maxSpeed;}v.slip=v.vx*fz-v.vz*fx;v.surgeAcceleration=(forward-oldForward)/dt;v.lateralAcceleration=v.yawRate*forward;
 // Sweep the full long hull at <=1.2 m intervals: no high-speed tunnelling.
 const travel=v.speed*dt,steps=Math.max(1,Math.ceil(travel/1.2));let hit=null;
 for(let j=1;j<=steps&&!hit;j++){const x=oldX+v.vx*dt*j/steps,z=oldZ+v.vz*dt*j/steps;for(const along of[-4.8,0,4.8]){hit ||=v.collision(x+fx*along,z+fz*along,c.width*.48,0);if(hit)break;}}
 if(hit){v.vx=0;v.vz=0;v.speed=0;if(Math.abs(oldForward)>14){v.wipe('Racing hull collision');return;}if(v.trickCooldown<=0){v.onEvent({type:'bump',label:'Racing hull blocked'});v.trickCooldown=.6;}}else{v.x+=v.vx*dt;v.z+=v.vz*dt;}
 const samples=[-1,1].flatMap(side=>[-1,1].map(end=>waveHeight(v.x+fx*4.4*end+fz*1.35*side,v.z+fz*4.4*end-fx*1.35*side,time))),water=samples.reduce((a,b)=>a+b,0)/4;
 v.planing=damp(v.planing,clamp((v.speed-6)/13,0,1),3,dt);v.pitch=damp(v.pitch,Math.atan2((samples[1]+samples[3]-samples[0]-samples[2])/2,8.8)+.025*v.planing+v.trimDegrees*.002,5,dt);v.roll=damp(v.roll,clamp(Math.atan2((samples[2]+samples[3]-samples[0]-samples[1])/2,2.7)-v.yawRate*v.speed*.012,-.25,.25),4,dt);
 v.vy+=((water+c.rideHeight-v.y)*T.waterSpring-v.vy*T.waterDamping*(v.workshop?.damping||1))*dt;v.y+=v.vy*dt;v.y=Math.max(v.y,water-.18);v.airborne=false;hullContactSplash(v,dt,time);constrainHullWater(v,time,dt);v.wettedFraction=1-v.planing*.65;v.riderAft=0;
 const origin=bodyPoint(v,[0,-.18,-6.28]);v.drive={...v.propulsion.empty(),kind:'surface-propeller',rpm:850+Math.abs(v.throttle)*6150,rpmFraction:.12+Math.abs(v.throttle)*.88,wetness:1,ventilation:0,flow:Math.abs(v.throttle)*6,neutral:Math.abs(v.throttle)<.04,reverse:forward<0?1:0,braking,origin,trimAngle:v.trimDegrees*Math.PI/180,steeringAngle:v.steer*.25,exitSpeed:34,dischargeLocal:[0,.15,-1]};
 v.boundary=v.x<WORLD.minX+T.boundaryMargin||v.x>WORLD.maxX-T.boundaryMargin||v.z<WORLD.minZ+T.boundaryMargin||v.z>WORLD.maxZ-T.boundaryMargin;
 if(v.x<WORLD.minX||v.x>WORLD.maxX||v.z<WORLD.minZ||v.z>WORLD.maxZ){v.recover(true);v.onEvent({type:'boundary',label:'Back inside the offshore course'});return;}
 if(!hit&&!v.boundary&&v.speed<6&&!v.collision(v.x,v.z,8,0))v.safe={x:v.x,z:v.z,heading:v.heading};
 if(![v.x,v.y,v.z,v.vx,v.vz,v.pitch,v.roll].every(Number.isFinite))v.recover(true);
}
