import { PROPULSION, RIDE_MODES, SKI_TRIM_POSITIONS, waveHeight } from '../config.js';
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
  reset(){this.rpmFraction=0;this.wetness=1;this.reverse=0;this.reverseReady=false;this.trimAngle=0;this.state=this.empty();}
  empty(){return {kind:this.config.kind,rpm:0,rpmFraction:0,wetness:0,ventilation:0,flow:0,massFlow:0,exitSpeed:0,thrust:0,reverse:0,neutral:true,trimAngle:0,steeringAngle:0,origin:{x:0,y:0,z:0},direction:{x:0,y:0,z:-1},force:{x:0,y:0,z:0}};}
  update(dt,v,input,time) {
    const c=this.config,mode=RIDE_MODES[v.rideMode]||RIDE_MODES.sport;
    const forward=v.vx*Math.sin(v.heading)+v.vz*Math.cos(v.heading);
    const reversing=v.throttle<-.025;
    const demand=clamp(Math.abs(v.throttle));
    const braking=reversing&&forward>2.78;
    if(!reversing)this.reverseReady=false;else if(forward<=2.2)this.reverseReady=true;
    const shifting=this.type==='cat'&&reversing&&!this.reverseReady;
    const reversePower=reversing?(braking?mode.brakePower:mode.reversePower):1;
    const targetRpm=c.idleFraction+(1-c.idleFraction)*Math.sqrt(shifting?0:demand)*Math.cbrt(mode.power*reversePower);
    this.rpmFraction=damp(this.rpmFraction,targetRpm,dt>0?8:0,dt);
    this.reverse=damp(this.reverse,reversing&&!shifting?1:0,mode.gateResponse,dt);
    const selectedTrim=rad(clamp(v.trimDegrees||0,this.type==='ski'?SKI_TRIM_POSITIONS[0]:-7,this.type==='ski'?SKI_TRIM_POSITIONS.at(-1):8));
    // The selected VTS position may change at idle; the physical nozzle moves in forward thrust.
    if(this.type==='cat'||(!reversing&&demand>.025))this.trimAngle=damp(this.trimAngle,selectedTrim,5,dt);
    const trimAngle=this.trimAngle;
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
      const solution=waterjetSolution(c.hydraulicPower*powerFraction,c.nozzleArea,Math.hypot(v.vx,v.vz,v.vy||0));
      exitSpeed=solution.exitSpeed;
      // Approximate inlet admission losses at low pump RPM. Without this term,
      // an idling ideal duct falsely retains nearly full-speed steering power.
      const admission=.06+.94*clamp((this.rpmFraction-c.idleFraction)/(1-c.idleFraction));
      flow=solution.volumeFlow*wet*admission;massFlow=solution.massFlow*wet*admission;thrust=solution.thrust*wet*admission;
    }else{
      const efficiency=.34+.24*clamp(Math.abs(forward)/12);
      const solution=propellerSolution(c.shaftPower*efficiency*powerFraction,c.propellerArea,Math.abs(forward));
      exitSpeed=solution.slipstreamSpeed;flow=c.propellerArea*(Math.abs(forward)+solution.inducedSpeed)*wet;
      massFlow=flow*WATER_DENSITY;thrust=solution.thrust*wet;
    }
    const neutral=shifting||(this.type==='cat'&&reversing&&this.reverse<.55)||(demand<.025&&Math.abs(forward)<.4);
    // Smooth bucket routing in the body frame. Unlike a reversing propeller,
    // the impeller keeps rotating the same way while the bucket redirects water.
    // The bucket bends the fore/aft stream; it retains its lateral component.
    // This gives the guide-described opposite stern direction when backing.
    const local=nozzleVector(trimAngle,steeringAngle),reverse=this.reverse;
    const routed=this.type==='ski'
      ? [local[0],local[1]*(1-reverse)-.38*reverse,local[2]*(1-2*reverse)]
      : local.map(n=>n*(1-2*reverse));
    const norm=Math.hypot(...routed)||1,dischargeLocal=routed.map(n=>n/norm),dischargeDirection=bodyVector(v,dischargeLocal);
    const dischargeScale=1-reverse*(1-c.reverseEfficiency);
    const force={x:0,y:0,z:0};
    if(!neutral){
      if(this.type==='ski'){
        // F = mdot (v_in - v_out), including inlet momentum in ALL axes.
        force.x=-massFlow*(dischargeDirection.x*exitSpeed*dischargeScale+v.vx);
        force.y=-massFlow*(dischargeDirection.y*exitSpeed*dischargeScale+(v.vy||0));
        force.z=-massFlow*(dischargeDirection.z*exitSpeed*dischargeScale+v.vz);
      }else{
        force.x=-dischargeDirection.x*thrust*dischargeScale;
        force.y=-dischargeDirection.y*thrust*dischargeScale;
        force.z=-dischargeDirection.z*thrust*dischargeScale;
      }
    }
    const localSide=force.x*Math.cos(v.heading)-force.z*Math.sin(v.heading);
    const mount=c.nozzleMount||c.motorMount;
    const yawMoment=mount[2]*localSide;
    this.state={kind:c.kind,rpm:this.rpmFraction*c.maximumRpm,rpmFraction:this.rpmFraction,wetness:wet,ventilation:1-wet,flow,massFlow,exitSpeed:exitSpeed*dischargeScale,thrust:Math.hypot(force.x,force.y,force.z),reverse,neutral,braking,shifting,trimAngle,selectedTrim,steeringAngle,origin,direction,dischargeLocal,dischargeDirection,yawMoment,force};
    return this.state;
  }
}
