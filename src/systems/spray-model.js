import { waveHeight } from '../config.js';
import { bodyPoint, bodyVector, propulsionPose, hullImmersion } from '../vehicles/propulsion.js';
export const SPRAY_TUNING = { minimumSpeed:.7, maximumSpeed:32, gravity:9.81, wakeLifetime:7, wakeSpread:.16, sampleSpacing:.48, fanLife:.52 };
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));

// Find the waterline along each physical chine/pontoon. A dry hull cannot throw water.
export function chineContact(v,side,time=0) {
  let best=null;
  for(let i=0;i<=16;i++){
    const z=v.config.length*(-.43+i/16*.74);
    const p=bodyPoint(v,[side*v.config.width*.46,-.12,z]);
    const error=Math.abs(p.y-waveHeight(p.x,p.z,time));
    if(!best||error<best.error)best={...p,error};
  }
  const wet=clamp(1-best.error/.32)*hullImmersion(v,time);
  return {...best,y:Math.max(best.y,waveHeight(best.x,best.z,time)+.025),wet};
}
export function sprayState(v,_freestyle=false,time=0) {
  const speed=clamp(v.speed,0,32),contacts=[chineContact(v,-1,time),chineContact(v,1,time)];
  const drive=v.drive,jet=v.airborne||v.wipeout||drive?.neutral?0:clamp((drive?.flow||0)/(v.type==='ski'?.11:1.2));
  if(v.airborne||v.wipeout||speed<.7)return {speed,rate:0,left:0,right:0,jet,outside:0,contacts};
  const turn=clamp(Math.abs(v.yawRate||0)*speed*.12+Math.abs(v.slip||0)*.19,0,3.5);
  const outside=Math.sign((v.slip||0)-(v.yawRate||0)*2-(v.steer||0)*.1);
  const side=sign=>(clamp(speed/23)*.65+turn*(outside===sign?1:.1)*clamp(speed/7))*contacts[sign===-1?0:1].wet;
  const left=side(-1),right=side(1);
  return {speed,outside,left,right,rate:clamp((left+right)*135,0,680),jet,contacts};
}
export function launchSpray(v,state,side,random=Math.random) {
  const strength=side===-1?state.left:state.right,p=state.contacts[side===-1?0:1];
  const local=bodyVector(v,[side*(1.2+strength*2.8)*(.7+random()*.6),.8+strength*1.35+random()*.8,-state.speed*(.65+random()*.12)]);
  return {x:p.x,y:p.y,z:p.z,vx:(v.vx||0)+local.x,vy:(v.vy||0)*.25+local.y,vz:(v.vz||0)+local.z,strength};
}
// Submerged pump discharge stays a surface wash. Only a real surface crossing creates an aerial jet.
export function pumpDischarge(v,time=0) {
  const d=v.drive;
  if(!d||d.neutral||d.flow<=.0001||v.airborne||v.wipeout)return null;
  const pose=propulsionPose(v,d.trimAngle,d.steeringAngle),origin={...pose.origin};
  let direction={...pose.direction};
  if(d.reverse>.5)direction={x:-direction.x,y:-Math.abs(direction.y)-.25,z:-direction.z};
  const norm=Math.hypot(direction.x,direction.y,direction.z);for(const k of ['x','y','z'])direction[k]/=norm;
  const velocity={x:(v.vx||0)+direction.x*d.exitSpeed,y:(v.vy||0)+direction.y*d.exitSpeed,z:(v.vz||0)+direction.z*d.exitSpeed};
  let aerial=origin.y>=waveHeight(origin.x,origin.z,time)-.01;
  if(!aerial&&v.type==='ski'&&velocity.y>0){
    for(let t=.005;t<.15;t+=.005){
      const p={x:origin.x+velocity.x*t,y:origin.y+velocity.y*t-4.905*t*t,z:origin.z+velocity.z*t};
      if(p.y>=waveHeight(p.x,p.z,time)+.01){Object.assign(origin,p);velocity.y-=9.81*t;aerial=true;break;}
    }
  }
  return {origin,velocity,aerial:aerial&&v.type==='ski',flow:d.flow,reverse:d.reverse};
}
export function stepDroplet(p,dt) {
  // Quadratic aerodynamic drag, rho_air=1.225 kg/m³; spherical millimetre droplets.
  const diameter=p.diameter||.003,coefficient=3*1.225*.47/(4*1000*diameter);
  p.vy-=4.905*dt;
  const factor=1/(1+coefficient*Math.hypot(p.vx,p.vy,p.vz)*dt);
  p.vx*=factor;p.vy*=factor;p.vz*=factor;
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=4.905*dt;
}
