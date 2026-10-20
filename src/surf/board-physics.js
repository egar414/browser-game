import {SURF_BREAK as B,SURF_OPTIONS as OPTIONS,surfWave,surfWidth,barrelRoof,clamp} from './break.js';
import {BOARDS} from './boards.js';
import {waveHeight} from '../config.js';
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const SURF_ASSIST={forgiving:.45,standard:.2,expert:0};
export function resetBoard(s){Object.assign(s,{airborne:false,vy:0,airTime:0,airRotation:0,airRoll:0,railLoad:0,slip:0,crouch:0,sprayPower:0,release:0,pumpCharge:0,pumpCooldown:0,pumpHeld:false,foreAft:0,lastSteer:0,lastVertical:0,landingImpact:0,whitewaterLoad:0,move:'',moveTime:0,moveTimes:{},moves:[],sections:[],turnAngle:0,cutbackArmed:false});}
export function surfMove(s,name,points=0){
 if(s.time-(s.moveTimes[name]??-100)<3)return;
 s.moveTimes[name]=s.time;s.move=name;s.moveTime=2.2;s.moves.push(name);s.ridePoints=(s.ridePoints||0)+points;
}
export function catchWave(s,step=false){
 const w=surfWave(s.x,s.z,s.time),c=BOARDS[s.board],width=surfWidth();
 if(s.mode!=='paddle'||w.influence<.9||w.setStrength<.65||w.q< -9*width||w.q>17*width||Math.cos(s.heading)<.2||s.speed<(step?3:c.paddle*.55))return false;
 resetBoard(s);s.mode='ride';s.speed=Math.max(5.8,s.speed);s.vx=Math.sin(s.heading)*s.speed;s.vz=Math.cos(s.heading)*s.speed;s.rideTime=s.tube=s.ridePoints=0;s.takeoffUntil=s.time+1.2;surfMove(s,'Takeoff',30);s.message='ANGLE DOWN THE LINE · steer with A/D · Space loads a pump · Shift crouches / stalls';return true;
}
function advanceAir(s,dt,input,w,c){
 s.airTime+=dt;const yaw=input.steer*c.airYaw*dt;s.heading+=yaw;s.airRotation+=yaw;
 s.pitch+=input.trim*.9*dt;if(s.board==='body'&&input.pose==='nohander'&&Math.abs(s.airRoll)<Math.PI*2){const roll=6.2*dt;s.roll+=roll;s.airRoll+=roll;}
 s.vy-=9.81*dt;s.x+=s.vx*dt;s.z+=s.vz*dt;s.y+=s.vy*dt;s.sprayPower=0;
 const landing=surfWave(s.x,s.z,s.time),surface=waveHeight(s.x,s.z,s.time)+.12,assist=SURF_ASSIST[OPTIONS.difficulty];
 if(s.airTime>.14&&s.y<=surface&&s.vy<landing.surfaceVelocity.y){
  const velocityHeading=Math.atan2(s.vx,s.vz),yawError=Math.abs(angle(s.heading-velocityHeading)),surfacePitch=Math.atan(landing.slopeX*Math.sin(s.heading)+landing.slopeZ*Math.cos(s.heading));
  const impact=s.vy-landing.surfaceVelocity.y;s.landingImpact=Math.abs(impact);s.landingId=(s.landingId||0)+1;
  if(yawError>1.02+assist||Math.abs(angle(s.roll))>1.05+assist||Math.abs(angle(s.pitch-surfacePitch))>.8+assist||impact< -8-assist*2){s.wipe('Heavy / sideways landing');return;}
  s.airborne=false;s.y=surface;s.vy=landing.surfaceVelocity.y;s.heading+=angle(velocityHeading-s.heading)*assist;s.roll=angle(s.roll)*.3;s.pitch=surfacePitch;s.vx*=1-clamp(Math.abs(impact)*.028,.03,.3);s.vz*=1-clamp(Math.abs(impact)*.028,.03,.3);
  const spin=Math.floor((Math.abs(s.airRotation)+.3)/Math.PI)*180;
  surfMove(s,Math.abs(s.airRoll)>5.3?'Bodyboard roll landed':spin>=180?`Air ${spin} landed`:'Air landed',100+spin/2);surfMove(s,'Landing',40);s.message='LANDED · keep your line for the next section';
 }
}
export function stepBoard(s,dt,input,space){
 const w=surfWave(s.x,s.z,s.time),c=BOARDS[s.board],width=surfWidth(),assist=SURF_ASSIST[OPTIONS.difficulty],direction=OPTIONS.direction;
 s.moveTime=Math.max(0,s.moveTime-dt);s.pumpCooldown=Math.max(0,s.pumpCooldown-dt);s.release=Math.max(0,s.release-dt);s.lastLandingImpact=s.landingImpact;s.landingImpact=0;
 if(s.mode==='wipeout'){s.y=waveHeight(s.x,s.z,s.time)+.05;if(!s.cooldown)s.recover();return;}
 if(s.airborne){advanceAir(s,dt,input,w,c);return;}
 const paddling=s.mode==='paddle';s.foreAft=damp(s.foreAft,input.trim||0,5,dt);s.crouch=damp(s.crouch,input.freestyle?1:w.curl>.25?assist/.45:0,8,dt);
 s.steer=damp(s.steer||0,input.steer,10,dt);const yaw=s.steer*c.turn*clamp(Math.max(s.speed,1)/5,.35,1.15)*(paddling?.8:1)*(s.release>0?1.7:1);s.heading+=yaw*dt;s.turnAngle+=yaw*dt;
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
  const grip=c.grip*(1+s.foreAft*.15)*(s.release>0?.15:1),drag=.035+speed*.007+input.steer**2*.075+(input.freestyle?.28:0)+w.section.shoulder*.07+Math.max(0,s.foreAft)*.035-Math.max(0,-s.foreAft)*.015+(s.release>0?.2:0);
  const normalLoad=9.81+clamp(w.surfaceVelocity.y-(rx*w.slopeX+rz*w.slopeZ),0,2.5)*2,den=1+w.slopeX**2+w.slopeZ**2;
  s.vx+=(-normalLoad*w.slopeX/den-side*fz*grip-rx*drag)*dt;s.vz+=(-normalLoad*w.slopeZ/den+side*fx*grip-rz*drag)*dt;
  // A pump can only return bounded energy after a genuine loaded down/up transition.
  if(vertical<-.15&&speed>3)s.pumpCharge=clamp(s.pumpCharge+dt*.7,0,.8);else s.pumpCharge=Math.max(0,s.pumpCharge-dt*.12);
  if(space&&!s.pumpHeld&&s.pumpCooldown===0&&s.pumpCharge>.16&&vertical>-.2){const boost=Math.min(.75,s.pumpCharge);s.vx+=fx*boost;s.vz+=fz*boost;s.pumpCharge=0;s.pumpCooldown=1.1;surfMove(s,'Pump',15);}
  s.pumpHeld=space;
  const roof=barrelRoof(s.x,s.z,s.time,w),stance=s.board==='body'?.28:1.18-s.crouch*.65,under=roof!==null&&w.q>2.3*width&&w.q<10.5*width;
  if(under&&s.y+stance<roof+.12){s.tube+=dt;if(s.tube>.45)surfMove(s,'Barrel',80);}
  else if(under&&s.y+stance>roof+.18+assist*.35&&s.time>s.takeoffUntil){s.wipe('Pitching lip contact · crouch or adjust your line');return;}
  if(w.q>6*width&&vertical<-.1)s.wasDropping=true;if(s.wasDropping&&w.q>5*width&&Math.abs(input.steer)>.15&&vertical>.1){surfMove(s,'Bottom turn',70);s.wasDropping=false;}
  if(w.q<5*width&&w.q> -2*width&&Math.abs(steerChange)>2.5&&Math.abs(input.steer)>.5&&speed>4)surfMove(s,'Snap',75);
  if(w.section.shoulder>.35&&direction*s.vx<-.6&&Math.abs(input.steer)>.2){s.cutbackArmed=true;surfMove(s,'Cutback',85);}
  if(s.cutbackArmed&&direction*s.vx>1&&w.broken>.25){s.cutbackArmed=false;surfMove(s,'Rebound',85);s.vx+=direction*.3;}
  if(s.bodySpinStart!==undefined&&Math.abs(s.heading-s.bodySpinStart)>5.7){surfMove(s,'Bodyboard spin',100);s.bodySpinStart=undefined;}
  if(w.section.progress>=225&&w.section.air>.25&&speed>c.launchSpeed+(.45-assist)*1.3&&vertical>.18&&w.q<5.5*width&&w.q> -4*width&&s.time-(s.lastLaunch||-10)>2){
   s.airborne=true;s.bodySpinStart=undefined;s.airTime=s.airRotation=s.airRoll=0;s.vy=clamp(Math.max(0,vertical)+speed*Math.sin(.4),2.2,5.2);s.vx*=Math.cos(.4);s.vz*=Math.cos(.4);s.lastLaunch=s.time;s.message='AIR · A/D rotates · Q/E pitches · X rolls a bodyboard · match the landing';surfMove(s,'Air',0);
  }
  s.sprayPower=clamp((s.railLoad*.65+Math.abs(side)*.12+(s.release>0?.5:0))*speed/7,0,1.4);s.ridePoints+=dt*(12+(under?20:0)+s.railLoad*6);s.lastVertical=vertical;s.lastSteer=input.steer;
  s.whitewaterLoad=clamp(s.whitewaterLoad+(w.broken>.85&&w.q> -3*width&&w.q<16*width&&speed<3.5/c.stability?dt:-dt*2),0,2);if(s.whitewaterLoad>.6+assist*1.2){s.wipe('Caught by the whitewater');return;}
  if(w.broken>.4)s.roll+=Math.sin(s.time*13+s.x)*w.broken*dt*.12;
  if(w.q>35*width||w.q< -28*width||w.influence<.6||w.section.progress>305){s.bank();s.mode='paddle';}
 }
 const speed=Math.hypot(s.vx,s.vz);if(speed>c.maxSpeed){const scale=c.maxSpeed/speed;s.vx*=scale;s.vz*=scale;}if(!paddling||s.mode==='ride')s.speed=Math.hypot(s.vx,s.vz);
 const nx=s.x+s.vx*dt,nz=s.z+s.vz*dt;if(s.collision(nx,nz,.4,0)||nz>B.z+320){s.wipe('Reef contact');return;}s.x=nx;s.z=nz;
 if(!s.airborne){const next=surfWave(s.x,s.z,s.time);s.y=waveHeight(s.x,s.z,s.time)+.12;s.vy=next.surfaceVelocity.y+s.vx*next.slopeX+s.vz*next.slopeZ;s.pitch=damp(s.pitch||0,Math.atan(next.slopeZ)*Math.cos(s.heading)+Math.atan(next.slopeX)*Math.sin(s.heading)+input.trim*.08,8,dt);s.roll=damp(s.roll||0,-input.steer*(paddling?.04:.32),7,dt);}
 if(Math.hypot(s.x-B.x,s.z-B.z)>720)s.recover();
}
