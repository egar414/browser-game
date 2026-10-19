import{isJet}from'../config.js';
import { waveHeight } from '../config.js';
import { bodyPoint, bodyVector, propulsionPose, hullImmersion } from '../vehicles/propulsion.js';
export const SPRAY_TUNING = { minimumSpeed:.7, maximumSpeed:32, gravity:9.81, wakeLifetime:7, wakeSpread:.16, sampleSpacing:.48 };
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const SIDE_SPRAY = { catWidth:1.72, catLift:1.12, bowReach:.32, bowLift:1.8, sheetLife:3.2, historyHz:30, dropletLife:3.4 };
export const TINNY_SPRAY={width:1.10,lift:1.20,loadScale:.88,shaftWidth:1.08,shaftLift:.72,shaftRear:6.5,shaftRise:1.6,shaftSpread:1.1};
// Actual powered, aft-weighted bow attitude; pressing Shift alone adds no spray.
export function bowSprayLoad(v){return v.airborne||v.wipeout?0:clamp(((v.pitch||0)-.25)/.6)*clamp(v.riderAft||0)*clamp(v.throttle||0);}

// Find the waterline along each physical chine/pontoon. A dry hull cannot throw water.
export function chineContact(v,side,time=0) {
  if(v.type==='tinny'&&(v.shaftLoad||0)>.35&&v.pitch>.8){
    // A dry bow cannot emit a chine sheet. Water is displaced by the wet
    // lower unit/prop wash at the transom instead.
    const prop=propulsionPose(v,v.drive?.trimAngle||0,v.drive?.steeringAngle||0).origin;
    const x=prop.x+Math.cos(v.heading)*side*.11,z=prop.z-Math.sin(v.heading)*side*.11;
    return{x,y:waveHeight(x,z,time)+.025,z,wet:clamp(v.drive?.wetness||0)*.75,motor:true};
  }
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
export function sharpTurnLoad(v){
 if(v.airborne||v.wipeout||v.speed<3||v.throttle<.12)return 0;
 const turning=Math.max(Math.abs(v.steer||0),clamp(Math.abs(v.yawRate||0)/1.3),clamp(Math.abs(v.slip||0)/10)),steer=clamp((turning-.25)/.35),waterLoad=clamp((Math.abs(v.yawRate||0)-.16)/.6+Math.abs(v.slip||0)/7+Math.abs(v.lateralAcceleration||0)/12);
 return steer*waterLoad*clamp((v.speed-3)/4)*clamp(v.throttle*2);
}
export function sprayState(v,_freestyle=false,time=0) {
  const speed=clamp(v.speed,0,32),turnGate=sharpTurnLoad(v),contacts=turnGate>0?[chineContact(v,-1,time),chineContact(v,1,time)]:[];
  const drive=v.drive,jet=v.airborne||v.wipeout||drive?.neutral?0:clamp((drive?.flow||0)/(isJet(v.type)?.11:1.2));
  if(v.airborne||v.wipeout||speed<.7)return {speed,rate:0,left:0,right:0,jet,outside:0,contacts,turnGate};
  if(!turnGate)return {speed,rate:0,left:0,right:0,jet,outside:0,contacts,turnGate};
  // The stern's cross-flow includes hull slip and yaw around its centre.
  // A setup carve leaves momentum behind when the rider reverses the bars;
  // spray follows that water load rather than instantly following a key press.
  const sternCrossFlow=(v.slip||0)-(v.yawRate||0)*v.config.length*.43;
  const loadHead=Math.sqrt(Math.abs(v.lateralAcceleration||0)*v.config.width);
  const turn=clamp(Math.abs(sternCrossFlow)*.20+loadHead*.13,0,3.5);
  const outside=Math.sign(sternCrossFlow);
  const shaft=v.type==='tinny'&&(v.shaftLoad||0)>.35&&v.pitch>.8;
  const side=sign=>(clamp(speed/(v.type==='tinny'?14:23))*.65+turn*(outside===sign?1:.1)*clamp(speed/7))*contacts[sign===-1?0:1].wet;
  const scale=v.type==='tinny'?TINNY_SPRAY.loadScale:1,power=shaft?clamp(v.throttle)*jet*.7:0,left=(side(-1)+power)*scale*turnGate,right=(side(1)+power)*scale*turnGate;
  return {speed,outside,left,right,rate:clamp((left+right)*135,0,680),jet,contacts,turnGate};
}
export function launchSpray(v,state,side,random=Math.random) {
  const strength=side===-1?state.left:state.right,p=state.contacts[side===-1?0:1]||chineContact(v,side);
  if(v.type==='tinny'&&p.motor){
    // Low, dense prop wash travels aft and falls back, as in the supplied photo.
    const spread=random(),power=clamp(v.throttle||0)*clamp(v.drive?.wetness||0),rear=state.speed*.85+power*TINNY_SPRAY.shaftRear;
    const velocity=bodyVector({heading:v.heading},[side*(.25+spread*TINNY_SPRAY.shaftSpread)*(1+strength*.35),(.65+Math.sin(spread*Math.PI)*TINNY_SPRAY.shaftRise)*(.45+power*.55),-rear]);
    return{x:p.x,y:p.y,z:p.z,vx:(v.vx||0)+velocity.x,vy:velocity.y+(v.vy||0)*.15,vz:(v.vz||0)+velocity.z,strength:strength*(1+power*.45),diameter:.004+spread*.003,lifetime:.9+spread*.4};
  }
  const shaft=v.type==='tinny'&&p.motor,cat=v.type==='cat',bow=shaft?bowSprayLoad(v)*.35:bowSprayLoad(v),broad=shaft?TINNY_SPRAY.shaftWidth:cat?SIDE_SPRAY.catWidth:v.type==='tinny'?TINNY_SPRAY.width:1.06,lift=shaft?TINNY_SPRAY.shaftLift:cat?SIDE_SPRAY.catLift:v.type==='tinny'?TINNY_SPRAY.lift:1.32;
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
  if(!aerial&&isJet(v.type)&&velocity.y>0){
    for(let t=.005;t<.15;t+=.005){
      const p={x:origin.x+velocity.x*t,y:origin.y+velocity.y*t-4.905*t*t,z:origin.z+velocity.z*t};
      if(p.y>=waveHeight(p.x,p.z,time)+.01){Object.assign(origin,p);velocity.y-=9.81*t;aerial=true;break;}
    }
  }
  return {origin,velocity,aerial:aerial&&isJet(v.type),flow:d.flow,reverse:d.reverse};
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
export const JET_PLUME = { lifetime:4.8, minimumFlow:.008, lift:4.2, trimLift:2.8, rearSpeed:12, spread:.78, drag:.32, baseRate:260, poweredRate:330, coreOpacity:1.1, mistOpacity:.10, coreGrowth:.62, coreRadius:1.25, mistRadius:1.35, fineFraction:.14, streakThreshold:.84, bowLift:1.8, bowReach:.28 };
export function jetPlumeSource(v,discharge,time=0,state=null){
  if(!isJet(v.type)||!discharge||v.airborne||v.wipeout||discharge.reverse>.08||discharge.flow<JET_PLUME.minimumFlow||v.throttle<.08)return null;
  const power=clamp(discharge.flow/.16)*clamp(v.throttle),trim=clamp((v.drive?.trimAngle||0)/.33),bow=bowSprayLoad(v);
  const dx=discharge.velocity.x-(v.vx||0),dz=discharge.velocity.z-(v.vz||0),len=Math.hypot(dx,dz)||1;
  const loaded=state?clamp((Math.max(state.left,state.right)-.8)/2.5):0;
  const washLift=1.1+power*JET_PLUME.lift+trim*JET_PLUME.trimLift+loaded*loaded*5.8+bow*JET_PLUME.bowLift;
  const lift=Math.min(13,Math.max(discharge.aerial?discharge.velocity.y:0,washLift));
  return {origin:{...discharge.origin,y:Math.max(discharge.origin.y,waveHeight(discharge.origin.x,discharge.origin.z,time)+.055)},
    velocity:{x:(v.vx||0)+dx/len*(3+power*JET_PLUME.rearSpeed)*(1+bow*JET_PLUME.bowReach),y:lift,z:(v.vz||0)+dz/len*(3+power*JET_PLUME.rearSpeed)*(1+bow*JET_PLUME.bowReach)},power,loaded};
}
