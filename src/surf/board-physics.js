import {SURF_BREAK as B,SURF_OPTIONS as OPTIONS,surfWave,surfWidth,barrelRoof,clamp} from './break.js';
import {BOARDS} from './boards.js';
import {SURF_PHYSICS as P,SURF_ASSIST as ASSIST} from './tuning.js';
import {makeContacts,sampleBoardContact,supportBoard,sampleSurfSurface,boardHitsLip} from './contact.js';
import {waveHeight} from '../config.js';
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const SURF_ASSIST=Object.fromEntries(Object.entries(ASSIST).map(([key,value])=>[key,value.tolerance]));
export function resetBoard(s){Object.assign(s,{contacts:makeContacts(),contact:1,contactState:'PLANING',relativeSpeed:0,planing:0,compression:0,grip:0,railAngle:0,yawRate:0,pitchRate:0,rollRate:0,landingWobble:0,turnTravel:0,turnSweep:0,turnSign:0,lastRelease:-10,lastLaunch:-10,wasDropping:false,bodySpinStart:undefined,landingId:0,barrelDistance:0,barrelAwardDistance:0,airborne:false,vy:0,airTime:0,airRotation:0,airRoll:0,railLoad:0,slip:0,crouch:0,sprayPower:0,release:0,pumpCharge:0,pumpCooldown:0,pumpHeld:false,foreAft:0,lastSteer:0,lastVertical:0,landingImpact:0,whitewaterLoad:0,move:'',moveTime:0,moveTimes:{},movePositions:{},moves:[],sections:[],turnAngle:0,cutbackArmed:false,hasDownline:false});}
export function surfMove(s,name,points=0){
 if(s.time-(s.moveTimes[name]??-100)<3)return;
 if(points>0&&name!=='Takeoff'){const previous=s.movePositions[name],distance=previous?Math.hypot(s.x-previous.x,s.z-previous.z):Infinity;if(distance<P.turnMinDistance)return;s.movePositions[name]={x:s.x,z:s.z};}
 s.moveTimes[name]=s.time;s.move=name;s.moveTime=2.2;s.moves.push(name);s.ridePoints=(s.ridePoints||0)+points;
}
export function catchWave(s,step=false){
 const w=surfWave(s.x,s.z,s.time),c=BOARDS[s.board],width=surfWidth();
 if(s.mode!=='paddle'||w.influence<.9||w.setStrength<.65||w.q< -9*width||w.q>17*width||Math.cos(s.heading)<.2||s.speed<(step?3:c.paddle*.55))return false;
 resetBoard(s);s.mode='ride';s.speed=Math.max(5.8,s.speed);s.vx=Math.sin(s.heading)*s.speed;s.vz=Math.cos(s.heading)*s.speed;s.rideTime=s.tube=s.ridePoints=0;s.takeoffUntil=s.time+1.2;surfMove(s,'Takeoff',30);s.message='ANGLE DOWN THE LINE · steer with A/D · Space loads a pump · Shift crouches / stalls';return true;
}
function advanceAir(s,dt,input,w,c){
 s.airTime+=dt;s.yawRate=input.steer*c.airYaw;s.pitchRate=input.trim*P.airPitchRate;s.rollRate=0;const yaw=s.yawRate*dt;s.heading+=yaw;s.airRotation+=yaw;
 s.pitch+=s.pitchRate*dt;if(s.board==='body'&&input.pose==='nohander'&&Math.abs(s.airRoll)<Math.PI*2){s.rollRate=6.2;const roll=s.rollRate*dt;s.roll+=roll;s.airRoll+=roll;}
 s.contact=0;s.contactState='AIR';s.planing=0;s.vy-=P.gravity*dt;s.x+=s.vx*dt;s.z+=s.vz*dt;s.y+=s.vy*dt;s.sprayPower=0;
 const landing=surfWave(s.x,s.z,s.time);sampleBoardContact(s,c,s.time);const surface=waveHeight(s.x,s.z,s.time)+.12,assist=SURF_ASSIST[OPTIONS.difficulty];
 if(s.airTime>.14&&s.contact>.1&&s.y<=surface&&s.vy<landing.surfaceVelocity.y){
  const velocityHeading=Math.atan2(s.vx,s.vz),yawError=Math.abs(angle(s.heading-velocityHeading)),surfacePitch=Math.atan(landing.slopeX*Math.sin(s.heading)+landing.slopeZ*Math.cos(s.heading));
  const impact=(s.vx-landing.surfaceVelocity.x)*landing.normal.x+(s.vy-landing.surfaceVelocity.y)*landing.normal.y+(s.vz-landing.surfaceVelocity.z)*landing.normal.z;s.landingImpact=Math.abs(impact);s.landingId=(s.landingId||0)+1;
  if(yawError>1.02+assist||Math.abs(angle(s.roll))>1.05+assist||Math.abs(angle(s.pitch-surfacePitch))>.8+assist||impact< -8-assist*2){s.wipe('Heavy / sideways landing');return;}
  s.airborne=false;s.vy=landing.surfaceVelocity.y;s.landingWobble=clamp(yawError*.5+Math.abs(impact)*.04+(1-s.contact)*.15,0,.8);s.heading+=angle(velocityHeading-s.heading)*assist;s.roll=angle(s.roll)*.3;s.pitch=surfacePitch;s.vx*=1-clamp(Math.abs(impact)*.028,.03,.3);s.vz*=1-clamp(Math.abs(impact)*.028,.03,.3);
  const spin=Math.floor((Math.abs(s.airRotation)+.3)/Math.PI)*180;
  surfMove(s,Math.abs(s.airRoll)>5.3?'Bodyboard roll landed':spin>=180?`Air ${spin} landed`:'Air landed',100+spin/2);surfMove(s,'Landing',40);s.message='LANDED · keep your line for the next section';
 }
}
export function stepBoard(s,dt,input,space){
 const w=surfWave(s.x,s.z,s.time),c=BOARDS[s.board],width=surfWidth(),assist=SURF_ASSIST[OPTIONS.difficulty],direction=OPTIONS.direction;
 s.moveTime=Math.max(0,s.moveTime-dt);s.pumpCooldown=Math.max(0,s.pumpCooldown-dt);s.release=Math.max(0,s.release-dt);s.landingWobble*=Math.exp(-P.landingWobbleDecay*dt);s.lastLandingImpact=s.landingImpact;s.landingImpact=0;
 if(s.mode==='wipeout'){s.y=waveHeight(s.x,s.z,s.time)+.05;if(!s.cooldown)s.recover();return;}
 if(s.airborne){advanceAir(s,dt,input,w,c);if(s.mode!=='wipeout'&&boardHitsLip(s,s.time))s.wipe('Pitching lip contact');return;}
 sampleBoardContact(s,c,s.time);
 const paddling=s.mode==='paddle';s.compression=damp(s.compression,space&&!paddling?1:0,P.compressionResponse,dt);s.foreAft=damp(s.foreAft,input.trim||0,5,dt);s.crouch=damp(s.crouch,input.freestyle?1:w.curl>.25?assist/.45:0,8,dt);
 s.steer=damp(s.steer||0,input.steer,P.steeringResponse,dt);
 const authority=clamp(Math.max(s.speed,1)/5,.35,1.15),highSpeedArc=1/(1+Math.max(0,s.speed-8)*.035);
 const desiredYaw=s.steer*c.turn*authority*highSpeedArc*(paddling?.8:1)*(s.release>0?1.7:1)*(.5+.5*s.contact);
 s.yawRate=damp(s.yawRate,desiredYaw,P.yawResponse,dt);const yaw=s.yawRate;s.heading+=yaw*dt;s.turnAngle+=yaw*dt;s.railAngle=damp(s.railAngle,-s.steer*.48,P.railResponse,dt);
 if(paddling){
  const target=(input.throttle>0||space)?c.paddle:input.throttle<0?-c.paddle*.45:0;s.speed=damp(s.speed,target,s.speed>c.paddle?.38:1.8,dt);s.vx=damp(s.vx,Math.sin(s.heading)*s.speed,2,dt);s.vz=damp(s.vz,Math.cos(s.heading)*s.speed,2,dt);s.sprayPower=0;
  if(space)catchWave(s);
 }else{
  s.rideTime+=dt;if(!s.sections.includes(w.section.name))s.sections.push(w.section.name);
  const rx=s.vx-w.surfaceVelocity.x,rz=s.vz-w.surfaceVelocity.z,speed=Math.hypot(rx,rz),fx=Math.sin(s.heading),fz=Math.cos(s.heading),side=rx*fz-rz*fx;
  const vertical=w.surfaceVelocity.y+s.vx*w.slopeX+s.vz*w.slopeZ,steerChange=(input.steer-s.lastSteer)/dt;
  s.slip=side;s.railLoad=damp(s.railLoad,clamp(Math.abs(yaw)*speed/12+Math.max(0,-vertical)*.12),8,dt);
  const tailRelease=input.pose==='nohander'&&s.speed>3&&s.release===0&&s.time-(s.lastRelease||-10)>.9;
  if(tailRelease){s.release=.5;s.lastRelease=s.time;if(s.board==='body'&&s.bodySpinStart===undefined)s.bodySpinStart=s.heading;}
  const slipGrip=1/(1+(Math.abs(side)/P.gripSlipSpeed)**2);
  const grip=c.grip*(1+s.foreAft*.15)*(s.release>0?.15:1)*Math.max(s.board==='body'?.9:P.gripFloor,slipGrip)*(.65+.35*s.contact);s.grip=grip;
  const drag=P.baseDrag+speed*P.speedDrag+input.steer**2*P.turnDrag+(input.freestyle?P.stallDrag:0)+w.section.shoulder*.07+Math.max(0,s.foreAft)*.035-Math.max(0,-s.foreAft)*.015+(s.release>0?.2:0);
  const normalLoad=P.gravity+clamp(w.surfaceVelocity.y-(rx*w.slopeX+rz*w.slopeZ),0,2.5)*2,den=1+w.slopeX**2+w.slopeZ**2;
  s.vx+=(-normalLoad*w.slopeX/den-side*fz*grip-rx*drag)*dt;s.vz+=(-normalLoad*w.slopeZ/den+side*fx*grip-rz*drag)*dt;
  // A pump can only return bounded energy after a genuine loaded down/up transition.
  if(vertical<-.15&&speed>3&&s.compression>.35)s.pumpCharge=clamp(s.pumpCharge+dt*P.pumpLoadRate,0,P.pumpMaxCharge);else s.pumpCharge=Math.max(0,s.pumpCharge-dt*.12);
  if(!space&&s.pumpHeld&&s.pumpCooldown===0&&s.pumpCharge>.16&&vertical>-.2){const boost=Math.min(P.pumpMaxBoost,s.pumpCharge);s.vx+=fx*boost;s.vz+=fz*boost;s.pumpCharge=0;s.pumpCooldown=P.pumpCooldown;surfMove(s,'Pump',15);}
  s.pumpHeld=space;
  const sampled=sampleSurfSurface(s.x,s.z,s.time,w),roof=sampled.barrel.roof,stance=s.board==='body'?.28:1.18-s.crouch*.65,under=roof!==null&&w.q>2.3*width&&w.q<10.5*width;
  const ridingDistance=speed*dt;
  if(under&&s.y+stance<roof+.12&&speed>2){s.tube+=dt;s.barrelDistance+=ridingDistance;if(s.tube>.45&&s.barrelDistance-s.barrelAwardDistance>3){surfMove(s,'Barrel',80);s.barrelAwardDistance=s.barrelDistance;}}
  else if(boardHitsLip(s,s.time,w,assist)&&s.time>s.takeoffUntil){s.wipe('Pitching lip contact · crouch or adjust your line');return;}
  if(w.q>6*width&&vertical<-.1)s.wasDropping=true;if(s.wasDropping&&w.q>5*width&&Math.abs(input.steer)>.15&&vertical>.1){surfMove(s,'Bottom turn',70);s.wasDropping=false;}
  const turnSign=Math.abs(yaw)>.15?Math.sign(yaw):0;if(turnSign&&turnSign!==s.turnSign){s.turnSweep=0;s.turnTravel=0;s.turnSign=turnSign;}
  if(Math.abs(yaw)>.25&&speed>P.turnMinSpeed){s.turnTravel+=ridingDistance;s.turnSweep+=Math.abs(yaw)*dt;}
  const committed=s.turnTravel>P.turnMinDistance&&s.turnSweep>P.turnMinAngle;
  if(w.q<5*width&&w.q> -2*width&&committed&&s.railLoad>.15){surfMove(s,'Snap',75);s.turnSweep=0;s.turnTravel=0;}
  else if(committed&&s.turnSweep>1&&s.railLoad>.2){surfMove(s,'Carve',55);s.turnSweep=0;s.turnTravel=0;}
  s.hasDownline ||=direction*s.vx>2;
  if(!s.cutbackArmed&&s.hasDownline&&w.section.shoulder>.35&&direction*s.vx<-.6&&speed>3){s.cutbackArmed=true;surfMove(s,'Cutback',85);}
  if(s.cutbackArmed&&direction*s.vx>1&&w.broken>.25){s.cutbackArmed=false;surfMove(s,'Rebound',85);s.vx+=direction*.3;}
  if(s.bodySpinStart!==undefined&&Math.abs(s.heading-s.bodySpinStart)>5.7){surfMove(s,'Bodyboard spin',100);s.bodySpinStart=undefined;}
  if(w.section.progress>=225&&w.section.air>.25&&speed>c.launchSpeed+(.45-assist)*1.3&&vertical>.18&&s.contact>.25&&w.q<5.5*width&&w.q> -4*width&&s.time-(s.lastLaunch||-10)>2){
   s.airborne=true;s.bodySpinStart=undefined;s.airTime=s.airRotation=s.airRoll=0;s.vy=clamp(Math.max(0,vertical)+speed*Math.sin(.4),2.2,5.2);s.vx*=Math.cos(.4);s.vz*=Math.cos(.4);s.lastLaunch=s.time;s.message='AIR · A/D rotates · Q/E pitches · X rolls a bodyboard · match the landing';surfMove(s,'Air',0);
  }
  s.sprayPower=clamp((s.railLoad*.65+Math.abs(side)*.12+(s.release>0?.5:0))*speed/7,0,1.4);s.ridePoints+=ridingDistance*(1.5+(under?2.5:0)+s.railLoad*.75);s.lastVertical=vertical;s.lastSteer=input.steer;
  s.whitewaterLoad=clamp(s.whitewaterLoad+(w.broken>.85&&w.q> -3*width&&w.q<16*width&&speed<ASSIST[OPTIONS.difficulty].whitewaterSpeed/c.stability?dt:-dt*2),0,2);if(s.whitewaterLoad>ASSIST[OPTIONS.difficulty].whitewaterSeconds){s.wipe('Caught by the whitewater');return;}
  if(w.broken>.4)s.roll+=Math.sin(s.time*13+s.x)*w.broken*dt*.12;
  if(w.q>35*width||w.q< -28*width||w.influence<.6||w.section.progress>305){s.bank();s.mode='paddle';}
 }
 const speed=Math.hypot(s.vx,s.vz);if(speed>c.maxSpeed){const scale=c.maxSpeed/speed;s.vx*=scale;s.vz*=scale;}if(!paddling||s.mode==='ride')s.speed=Math.hypot(s.vx,s.vz);
 const nx=s.x+s.vx*dt,nz=s.z+s.vz*dt;if(s.collision(nx,nz,.4,0)||nz>B.z+320){s.wipe('Reef contact');return;}s.x=nx;s.z=nz;
 if(!s.airborne){const next=surfWave(s.x,s.z,s.time);supportBoard(s,c,next,dt);const target=-input.steer*(paddling?.04:.32)+Math.sin(s.time*17)*s.landingWobble*.12;s.rollRate=(target-s.roll)*7;s.roll+=s.rollRate*dt;}
 if(Math.hypot(s.x-B.x,s.z-B.z)>720)s.recover();
}
