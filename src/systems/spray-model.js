import { waveHeight } from '../config.js';
import { bodyPoint, bodyVector, propulsionPose, hullImmersion } from '../vehicles/propulsion.js';
export const SPRAY_TUNING = { minimumSpeed:.7, maximumSpeed:32, gravity:9.81, wakeLifetime:7, wakeSpread:.16, sampleSpacing:.48 };
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const SIDE_SPRAY = { catWidth:1.72, catLift:1.12, bowReach:.32, bowLift:1.8, sheetLife:3.2, historyHz:30, dropletLife:3.4 };
// Actual powered, aft-weighted bow attitude; pressing Shift alone adds no spray.
export function bowSprayLoad(v){return v.airborne||v.wipeout?0:clamp(((v.pitch||0)-.25)/.6)*clamp(v.riderAft||0)*clamp(v.throttle||0);}

// Find the waterline along each physical chine/pontoon. A dry hull cannot throw water.
export function chineContact(v,side,time=0) {
  let best=null;
  for(let i=0;i<=16;i++){
    const forwardEdge=.31-(v.planing||0)*.33;
    const z=v.config.length*(-.43+i/16*(forwardEdge+.43));
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
  // The stern's cross-flow includes hull slip and yaw around its centre.
  // A setup carve leaves momentum behind when the rider reverses the bars;
  // spray follows that water load rather than instantly following a key press.
  const sternCrossFlow=(v.slip||0)-(v.yawRate||0)*v.config.length*.43;
  const loadHead=Math.sqrt(Math.abs(v.lateralAcceleration||0)*v.config.width);
  const turn=clamp(Math.abs(sternCrossFlow)*.20+loadHead*.13,0,3.5);
  const outside=Math.sign(sternCrossFlow);
  const side=sign=>(clamp(speed/23)*.65+turn*(outside===sign?1:.1)*clamp(speed/7))*contacts[sign===-1?0:1].wet;
  const left=side(-1),right=side(1);
  return {speed,outside,left,right,rate:clamp((left+right)*135,0,680),jet,contacts};
}
export function launchSpray(v,state,side,random=Math.random) {
  const strength=side===-1?state.left:state.right,p=state.contacts[side===-1?0:1];
  const cat=v.type==='cat',bow=bowSprayLoad(v),broad=cat?SIDE_SPRAY.catWidth:1.06,lift=cat?SIDE_SPRAY.catLift:1.32;
  const spread=random(),angle=-.2+spread*1.45,flow=(2+strength*3.2)*broad*(1+bow*SIDE_SPRAY.bowReach);
  // Spray leaves the wet waterline. Rotating its up-vector with a bow-high hull
  // incorrectly aimed the entire fan underwater, cutting off a bow-ride spray.
  const local=bodyVector({heading:v.heading},[side*flow*Math.cos(angle),((.8+strength*1.7)*lift+bow*SIDE_SPRAY.bowLift)*(.8+Math.sin(spread*Math.PI)*.35),-state.speed*(cat?.4:.5)-flow*Math.sin(angle)]);
  const vy=(v.vy||0)*.25+local.y;
  return {x:p.x,y:p.y,z:p.z,vx:(v.vx||0)+local.x,vy,vz:(v.vz||0)+local.z,strength,diameter:.0035+spread*.0025,lifetime:clamp(2*Math.max(0,vy)/SPRAY_TUNING.gravity+.3,.8,SIDE_SPRAY.dropletLife)};
}
// Submerged pump discharge stays a surface wash. Only a real surface crossing creates an aerial jet.
export function pumpDischarge(v,time=0) {
  const d=v.drive;
  if(!d||d.neutral||d.flow<=.0001||v.airborne||v.wipeout)return null;
  const pose=propulsionPose(v,d.trimAngle,d.steeringAngle),origin={...pose.origin};
  let direction=d.dischargeLocal?bodyVector(v,d.dischargeLocal):{...pose.direction};
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

// Larger visible breakup around the central pump wash, independently tunable
// from the unchanged chine spray and hydraulic reaction-force calculation.
export const JET_PLUME = { lifetime:4.8, minimumFlow:.008, lift:4.2, trimLift:2.8, rearSpeed:7.5, spread:.78, drag:.32, baseRate:260, poweredRate:330, coreOpacity:1.1, mistOpacity:.10, coreGrowth:.62, fineFraction:.14, streakThreshold:.84, bowLift:1.8, bowReach:.28 };
export function jetPlumeSource(v,discharge,time=0,state=null){
  if(v.type!=='ski'||!discharge||v.airborne||v.wipeout||discharge.reverse>.08||discharge.flow<JET_PLUME.minimumFlow||v.throttle<.08)return null;
  const power=clamp(discharge.flow/.16)*clamp(v.throttle),trim=clamp((v.drive?.trimAngle||0)/.33),bow=bowSprayLoad(v);
  const dx=discharge.velocity.x-(v.vx||0),dz=discharge.velocity.z-(v.vz||0),len=Math.hypot(dx,dz)||1;
  const loaded=state?clamp((Math.max(state.left,state.right)-.8)/2.5):0;
  const washLift=1.1+power*JET_PLUME.lift+trim*JET_PLUME.trimLift+loaded*loaded*5.8+bow*JET_PLUME.bowLift;
  const lift=Math.min(13,Math.max(discharge.aerial?discharge.velocity.y:0,washLift));
  return {origin:{...discharge.origin,y:Math.max(discharge.origin.y,waveHeight(discharge.origin.x,discharge.origin.z,time)+.055)},
    velocity:{x:(v.vx||0)+dx/len*(3+power*JET_PLUME.rearSpeed)*(1+bow*JET_PLUME.bowReach),y:lift,z:(v.vz||0)+dz/len*(3+power*JET_PLUME.rearSpeed)*(1+bow*JET_PLUME.bowReach)},power,loaded};
}
