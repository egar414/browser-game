import { PROPULSION, RIDE_MODES, waveHeight } from '../config.js';
const rad=degrees=>degrees*Math.PI/180;
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const damp=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));
export const WATER_DENSITY=1000;

// Same YXZ body rotation as the rendered model: roll, bow pitch, then heading.
export function bodyVector(v,point) {
  const [x,y,z]=point,cr=Math.cos(v.roll||0),sr=Math.sin(v.roll||0),cp=Math.cos(v.pitch||0),sp=Math.sin(v.pitch||0);
  const rolledX=x*cr-y*sr,rolledY=x*sr+y*cr;
  const pitchedY=rolledY*cp+z*sp,pitchedZ=-rolledY*sp+z*cp;
  const ch=Math.cos(v.heading),sh=Math.sin(v.heading);
  return {x:rolledX*ch+pitchedZ*sh,y:pitchedY,z:-rolledX*sh+pitchedZ*ch};
}
export function bodyPoint(v,point) {const p=bodyVector(v,point);return {x:v.x+p.x,y:v.y+p.y,z:v.z+p.z};}

export function hullImmersion(v,time){
  if(v.airborne)return 0;
  let deepest=0;
  for(const end of [-1,1]){const p=bodyPoint(v,[0,-.25,end*v.config.length*.28]);deepest=Math.max(deepest,waveHeight(p.x,p.z,time)-p.y);}
  return clamp(deepest/.11);
}

export function nozzleVector(trim,steering) {
  // An upward exhaust creates the opposite, downward reaction at the stern.
  return [Math.sin(steering)*Math.cos(trim),Math.sin(trim),-Math.cos(steering)*Math.cos(trim)];
}

export function propulsionPose(v,trimAngle=0,steeringAngle=0){
  const c=PROPULSION[v.type],localDirection=nozzleVector(trimAngle,steeringAngle),direction=bodyVector(v,localDirection);
  if(v.type==='ski'){
    return {direction,origin:bodyPoint(v,localDirection.map((p,i)=>c.nozzleMount[i]+p*c.nozzleLength)),intake:bodyPoint(v,c.intake)};
  }
  const p=c.propeller,ct=Math.cos(trimAngle),st=Math.sin(trimAngle),cs=Math.cos(-steeringAngle),ss=Math.sin(-steeringAngle);
  const y=p[1]*ct-p[2]*st,z=p[1]*st+p[2]*ct;
  const local=[p[0]*cs+z*ss,y,-p[0]*ss+z*cs].map((n,i)=>n+c.motorMount[i]);
  const origin=bodyPoint(v,local);return {direction,origin,intake:origin};
}

export function waterjetSolution(power,area,inletSpeed) {
  if(power<=0)return {exitSpeed:0,volumeFlow:0,massFlow:0,thrust:0};
  const inlet=Math.max(0,inletSpeed);
  // P = 1/2 rho A v_exit (v_exit^2 - v_inlet^2). Solve the
  // increasing positive branch; no free energy from narrowing a nozzle.
  let low=inlet,high=Math.max(inlet+2,Math.cbrt(2*power/(WATER_DENSITY*area))+inlet);
  for(let i=0;i<18;i++){const v=(low+high)*.5,used=.5*WATER_DENSITY*area*v*(v*v-inlet*inlet);if(used>power)high=v;else low=v;}
  const exitSpeed=(low+high)*.5,volumeFlow=area*exitSpeed,massFlow=WATER_DENSITY*volumeFlow;
  return {exitSpeed,volumeFlow,massFlow,thrust:massFlow*(exitSpeed-inlet)};
}

export function propellerSolution(power,area,inletSpeed) {
  if(power<=0)return {inducedSpeed:0,slipstreamSpeed:0,thrust:0};
  const inlet=Math.max(0,inletSpeed);let low=0,high=Math.cbrt(power/(2*WATER_DENSITY*area))+1;
  // Ideal actuator-disk momentum relation, with shaft losses applied by caller.
  for(let i=0;i<18;i++){const vi=(low+high)*.5,used=2*WATER_DENSITY*area*vi*(inlet+vi)**2;if(used>power)high=vi;else low=vi;}
  const inducedSpeed=(low+high)*.5;
  return {inducedSpeed,slipstreamSpeed:inlet+2*inducedSpeed,thrust:2*WATER_DENSITY*area*inducedSpeed*(inlet+inducedSpeed)};
}

export class Propulsion {
  constructor(type='ski'){this.type=type;this.config=PROPULSION[type];this.reset();}
  reset(){this.rpmFraction=0;this.wetness=1;this.reverse=0;this.state=this.empty();}
  empty(){return {kind:this.config.kind,rpm:0,rpmFraction:0,wetness:0,ventilation:0,flow:0,massFlow:0,exitSpeed:0,thrust:0,reverse:0,neutral:true,trimAngle:0,steeringAngle:0,origin:{x:0,y:0,z:0},direction:{x:0,y:0,z:-1},force:{x:0,y:0,z:0}};}
  update(dt,v,input,time) {
    const c=this.config,mode=RIDE_MODES[v.rideMode]||RIDE_MODES.sport;
    const forward=v.vx*Math.sin(v.heading)+v.vz*Math.cos(v.heading);
    const reversing=v.throttle<-.025;
    const demand=clamp(Math.abs(v.throttle));
    const reversePower=reversing?(forward>1?.72:.48):1;
    const targetRpm=c.idleFraction+(1-c.idleFraction)*Math.sqrt(demand)*Math.cbrt(mode.power*reversePower);
    this.rpmFraction=damp(this.rpmFraction,targetRpm,dt>0?8:0,dt);
    this.reverse=damp(this.reverse,reversing?1:0,12,dt);
    const trimLimit=this.type==='cat'?8:mode.trimMax;
    const trimAngle=rad(clamp((v.trimDegrees||0)+(input.freestyle&&this.type==='ski'?6:0),mode.trimMin,trimLimit));
    const steeringAngle=v.steer*c.steeringAngle;
    const {origin,intake,direction}=propulsionPose(v,trimAngle,steeringAngle);
    const depth=waveHeight(intake.x,intake.z,time)-intake.y;
    const available=v.airborne||v.wipeout?0:clamp(depth/c.fullImmersion);
    this.wetness=damp(this.wetness,available,available<this.wetness?30:10,dt);
    // An airborne inlet must stop liquid thrust immediately; retained droplets
    // are handled by the effect pool, not by pumping water out of open air.
    const wet=available===0?0:this.wetness;
    const powerFraction=this.rpmFraction**3;
    let exitSpeed,flow,massFlow,thrust;
    if(this.type==='ski'){
      const solution=waterjetSolution(c.hydraulicPower*powerFraction,c.nozzleArea,Math.abs(forward));
      exitSpeed=solution.exitSpeed;flow=solution.volumeFlow*wet;massFlow=solution.massFlow*wet;thrust=solution.thrust*wet;
    }else{
      const efficiency=.34+.24*clamp(Math.abs(forward)/12);
      const solution=propellerSolution(c.shaftPower*efficiency*powerFraction,c.propellerArea,Math.abs(forward));
      exitSpeed=solution.slipstreamSpeed;flow=c.propellerArea*(Math.abs(forward)+solution.inducedSpeed)*wet;
      massFlow=flow*WATER_DENSITY;thrust=solution.thrust*wet;
    }
    const neutral=demand<.025&&Math.abs(forward)<.4;
    const directionFactor=neutral?0:1-this.reverse*(1+c.reverseEfficiency);
    const force={x:-direction.x*thrust*directionFactor,y:-direction.y*thrust*directionFactor,z:-direction.z*thrust*directionFactor};
    this.state={kind:c.kind,rpm:this.rpmFraction*c.maximumRpm,rpmFraction:this.rpmFraction,wetness:wet,ventilation:1-wet,flow,massFlow,exitSpeed,thrust:thrust*Math.abs(directionFactor),reverse:this.reverse,neutral,trimAngle,steeringAngle,origin,direction,force};
    return this.state;
  }
}
