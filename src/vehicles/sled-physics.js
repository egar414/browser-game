import{waveHeight,WORLD,RIDE_MODES}from'../config.js';
// Original arcade water-skipping setup. Speeds are gameplay values, not safety
// guidance or a claim about any real snowmobile's ability to cross water.
export const SLED={shoreX:-776,z:-2000,startX:-838,length:70,halfWidth:5,entrySpeed:15,minimumSpeed:11.5,maxSpeed:34,landAcceleration:5.2,waterAcceleration:4.6,brake:9,sinkSeconds:2.2};
export const sledStart=()=>({x:SLED.startX,z:SLED.z,heading:Math.PI/2});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export const onSledLane=(x,z)=>x>=SLED.shoreX-SLED.length&&x<=SLED.shoreX&&Math.abs(z-SLED.z)<=SLED.halfWidth;
export function sledGround(x){const a=clamp((x-(SLED.shoreX-6))/6);return .82*(1-a*a*(3-2*a))+.06;}
export function resetSled(v){const start=sledStart();Object.assign(v,start,{y:sledGround(start.x)+.23,sledMode:'land',sledLoss:0,sledSink:0,sledDistance:0,sledReady:false,sledWaterStarted:false,pitch:0,roll:0});v.safe=start;v.previous=v.snapshot();}
export function updateSled(v,dt,input,time){
 v.previous=v.snapshot();const T=SLED;
 if(v.sledMode==='sinking'){
  v.sledSink+=dt;v.throttle=0;v.vx*=Math.exp(-3*dt);v.vz*=Math.exp(-3*dt);v.speed=Math.hypot(v.vx,v.vz);v.y=waveHeight(v.x,v.z,time)+.15-v.sledSink*.85;v.pitch=damp(v.pitch,-.45,2,dt);v.roll=damp(v.roll,.35,2,dt);
  if(v.sledSink>=T.sinkSeconds)v.recover();return;
 }
 v.throttle=damp(v.throttle,input.throttle,5,dt);v.steer=damp(v.steer,input.steer,10,dt);v.setTrim(v.trimDegrees+(input.trim||0)*6*dt);v.riderAft=damp(v.riderAft,input.freestyle?1:0,6,dt);
 const land=onSledLane(v.x,v.z),fx=Math.sin(v.heading),fz=Math.cos(v.heading),previousSpeed=v.speed,forward=v.vx*fx+v.vz*fz;
 const braking=input.throttle<0&&forward>.5;
 const power=(v.workshop?.power||1)*(RIDE_MODES[v.rideMode]?.power||1);
 let acceleration=braking?-T.brake:Math.max(0,v.throttle)*(land?T.landAcceleration:T.waterAcceleration)*power;
 if(land&&forward<.5&&input.throttle<0)acceleration=-2.5;
 acceleration-=Math.sign(forward)*((land?.30:.55)+forward*forward*(land?.001:.003)+Math.abs(v.steer)**2*Math.abs(forward)*.055);
 let speed=clamp(forward+acceleration*dt,land?-2:0,T.maxSpeed);
 const targetYaw=v.steer*(land?1.1:.92)*clamp(Math.abs(speed)/4)*Math.sign(speed||1)*(v.workshop?.yaw||1);
 v.yawRate=damp(v.yawRate,Math.abs(input.steer)<.01?0:targetYaw,Math.abs(input.steer)<.01?22:6,dt);v.heading+=v.yawRate*dt;
 const sx=Math.sin(v.heading),cz=Math.cos(v.heading),slip=(v.vx*cz-v.vz*sx)*Math.exp(-(land?8:input.freestyle?1.3:3.8)*dt);
 v.vx=sx*speed+cz*slip;v.vz=cz*speed-sx*slip;const magnitude=Math.hypot(v.vx,v.vz);if(magnitude>T.maxSpeed){v.vx*=T.maxSpeed/magnitude;v.vz*=T.maxSpeed/magnitude;}
 let nx=v.x+v.vx*dt,nz=v.z+v.vz*dt;
 const hit=!onSledLane(nx,nz)&&v.collision(nx,nz,.8,0);
 if(hit){v.vx=v.vz=0;speed=0;nx=v.x;nz=v.z;if(!land){loseSled(v,'Shore / obstacle contact');return;}}
 if(nx<WORLD.minX||nx>WORLD.maxX||nz<WORLD.minZ||nz>WORLD.maxZ){v.recover();v.onEvent({type:'boundary',label:'Back at the land run-up'});return;}
 v.x=nx;v.z=nz;v.speed=Math.hypot(v.vx,v.vz);v.slip=slip;v.surgeAcceleration=(v.speed-previousSpeed)/dt;v.lateralAcceleration=v.yawRate*v.speed;
 const nextLand=onSledLane(nx,nz);v.sledMode=nextLand?'land':'water';
 if(nextLand){v.sledWaterStarted=false;v.sledLoss=0;v.sledDistance=0;v.sledReady=v.speed>=T.entrySpeed;}
 else if(!v.sledWaterStarted){v.sledWaterStarted=true;if(!land||v.speed<T.entrySpeed){loseSled(v,'Not enough entry speed · build speed on land');return;}v.sledReady=true;v.onEvent({type:'bump',label:'Track skipping · keep over 42 km/h'});}
 if(!nextLand){
  v.sledDistance+=v.speed*dt;const loss=v.speed<T.minimumSpeed?1+(T.minimumSpeed-v.speed)*.32:-1.5;v.sledLoss=clamp(v.sledLoss+loss*dt,0,1.3);
  if(v.sledLoss>=1.3){loseSled(v,'Track lost support · return to the land run-up');return;}
 }
 v.planing=nextLand?0:clamp((v.speed-8)/9);v.wettedFraction=nextLand?0:.25;v.airborne=false;v.wipeout=0;
 const front=waveHeight(nx+sx,nz+cz,time),rear=waveHeight(nx-sx,nz-cz,time),wavePitch=Math.atan2(front-rear,2);
 const rideDamping=v.workshop?.damping||1;
 const bow=nextLand?0:(.12+v.riderAft*.88)*clamp((v.speed-9)/8);
 const pitch=nextLand?Math.atan2(sledGround(nx+sx)-sledGround(nx-sx),2):wavePitch*.32/rideDamping+bow+v.trimDegrees*.012;
 v.pitch=damp(v.pitch,clamp(pitch,-.35,1.16),7/rideDamping,dt);v.roll=damp(v.roll,-v.steer*(nextLand?.08:.27)/rideDamping,6,dt);
 const targetY=nextLand?sledGround(nx)+.23:waveHeight(nx-sx*.85,nz-cz*.85,time)+.22+Math.sin(v.pitch)*.85;
 v.y=damp(v.y,targetY,nextLand?24:15,dt);v.vy=(v.y-v.previous.y)/dt;v.sledReady=v.sledReady&&v.sledLoss<.2;
 v.drive={...v.propulsion.empty(),kind:'track',rpm:1100+Math.abs(v.throttle)*6900,wetness:nextLand?0:1,flow:nextLand?0:Math.max(.1,v.throttle),neutral:nextLand||v.speed<3,braking,reverse:speed<0?1:0,origin:{x:nx-sx*.85,y:nextLand?v.y-.2:waveHeight(nx-sx*.85,nz-cz*.85,time)+.04,z:nz-cz*.85},trimAngle:v.trimDegrees*Math.PI/180,steeringAngle:v.steer*.4,exitSpeed:0};
 if(![v.x,v.y,v.z,v.speed,v.pitch,v.roll].every(Number.isFinite))v.recover();
}
function loseSled(v,label){v.sledMode='sinking';v.sledSink=0;v.sledReady=false;v.drive={...v.drive,neutral:true,flow:0};v.onEvent({type:'wipeout',label});v.onEvent({type:'splash',impact:7});}
