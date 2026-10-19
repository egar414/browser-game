import{updateRacer}from'./racing-physics.js';
import{tinnyBounce,hullContactSplash}from'./tinny-bounce.js';
import{SHAFTING,updatePassenger,shaftPitch,shaftRoll,updateShaftStatus,constrainHullWater}from'./shafting.js';
import{isJet}from'../config.js';
import{updateCruiser}from'./cruiser.js';
import { VEHICLES, SPAWN, WORLD, RIDE_MODES, PROPULSION, HYDRODYNAMICS, jetTrimPositions, APEX_HANDLING, TINNY_HANDLING, CAT_HANDLING, waveHeight, waveChop, seaAmplitude } from '../config.js';
import {tenderTurn} from './tender-handling.js';
import { AirTricks } from './air-tricks.js';
import { TUNING } from '../systems/progression.js';
import { Propulsion, hullImmersion } from './propulsion.js';
import { rampProfile, rampBaseHeight } from './ramps.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export class VehiclePhysics {
  constructor(type = 'ski', collision = () => null, onEvent = () => {}) {
    this.type = type; this.config = VEHICLES[type]; this.collision = collision; this.onEvent = onEvent;
    this.tuning='stock';this.rideMode='sport';this.trimDegrees=0;this.propulsion=new Propulsion(type);
    this.airTricks=new AirTricks();this.safe = { ...SPAWN }; this.recover();
  }
  recover(nearest = false) {
    if(nearest&&Number.isFinite(this.x)&&Number.isFinite(this.z)){
      const x=this.x,z=this.z;let found=false;
      for(const radius of [0,8,18,35,70]){
        for(let i=0;i<(radius?16:1);i++){
          const angle=i/16*Math.PI*2,nx=x+Math.sin(angle)*radius,nz=z+Math.cos(angle)*radius;
          if(nx>WORLD.minX+40&&nx<WORLD.maxX-40&&nz>WORLD.minZ+40&&nz<WORLD.maxZ-40&&!this.collision(nx,nz,['cruiser','racer'].includes(this.type)?7.5:4,0)){
            this.safe={x:nx,z:nz,heading:this.heading};found=true;break;
          }
        }
        if(found)break;
      }
    }
    Object.assign(this, { x: this.safe.x, z: this.safe.z, heading: this.safe.heading, vx: 0, vz: 0, vy: 0, y: 0.2,
      bounceLoad:0,bouncePhase:0,bounceCompression:0,contactDepths:null,contactCooldowns:null,hullHits:0,lastHullHit:null,passengerAft:.35,shaftLoad:0,loopLoad:0,looping:false,shaft:null,hullCorrection:0,supportWater:null,pitch: 0, roll: 0, pitchRate:0,rollRate:0,sprayTurnLoad:0,sprayTurnPhase:0,planing:0,wettedFraction:1,surgeAcceleration:0,lateralAcceleration:0,riderAft:0,trimHeld:0,trimRepeat:0,yawRate: 0, throttle: 0, steer: 0, airborne: false, airTime: 0, spin: 0,
      wipeout: 0, wheelieTime: 0, donut: 0, driftTime: 0, trickCooldown: 0, speed: 0, slip: 0, boundary: false });
    this.airTricks.reset();this.previous = this.snapshot();
    this.propulsion.reset();this.drive=this.propulsion.state;
  }
  snapshot() { return { x: this.x, y: this.y, z: this.z, heading: this.heading, pitch: this.pitch, roll: this.roll }; }
  setMode(mode){if(!RIDE_MODES[mode])return;this.rideMode=mode;this.setTrim(this.trimDegrees);}
  setTrim(degrees){
    const value=Number.isFinite(degrees)?degrees:0;
    this.trimDegrees=isJet(this.type)?jetTrimPositions(this.type).reduce((best,n)=>Math.abs(n-value)<Math.abs(best-value)?n:best):clamp(value,-7,8);
  }
  get trimIndex(){return isJet(this.type)?jetTrimPositions(this.type).indexOf(this.trimDegrees):null;}
  updateTrim(dt,direction){
    if(!isJet(this.type)){this.setTrim(this.trimDegrees+direction*PROPULSION[this.type].trimRate*dt);return;}
    if(!direction){this.trimHeld=0;this.trimRepeat=0;return;}
    this.trimRepeat+=dt;
    if(direction!==this.trimHeld||this.trimRepeat>=.2){
      this.trimDegrees=jetTrimPositions(this.type)[clamp(this.trimIndex+direction,0,jetTrimPositions(this.type).length-1)];this.trimRepeat=0;
    }
    this.trimHeld=direction;
  }
  setType(type) { this.type = type; this.config = VEHICLES[type];this.propulsion=new Propulsion(type);this.setTrim(this.trimDegrees); this.recover(); }
  respawnAt(position,time=0){
    this.safe={x:position.x,z:position.z,heading:position.heading};this.recover();
    if(this.collision(this.x,this.z,this.config.width*.5+.35,0))this.recover(true);
    this.y=waveHeight(this.x,this.z,time)+this.config.rideHeight;this.previous=this.snapshot();
  }
  wipe(reason) {
    if (this.wipeout) return;
    this.looping=this.type==='tinny'&&reason==='Looped the tinny';this.airTricks.reset();this.shaftLoad=0;if(this.shaft)this.shaft={...this.shaft,active:false,cue:'WIPEOUT',seconds:0};this.wipeout = 1.6; this.vx *= 0.15; this.vz *= 0.15; this.onEvent({ type: 'wipeout', label: reason });
  }
  update(dt, input, time, ramps = []) {
    if(this.type==='racer')return updateRacer(this,dt,input,time);
    if(this.type==='cruiser')return updateCruiser(this,dt,input,time);
    this.previous = this.snapshot();
    if (this.wipeout > 0) { if(this.looping){this.pitch+=SHAFTING.loopRate*dt;this.y=waveHeight(this.x,this.z,time)+.65;this.roll*=Math.exp(-3*dt);} this.wipeout -= dt; if (this.wipeout <= 0) this.recover(true); return; }
    const c = this.config;
    const mode=RIDE_MODES[this.rideMode],driveConfig=PROPULSION[this.type],hydro=HYDRODYNAMICS[this.type];
    this.trickCooldown = Math.max(0, this.trickCooldown - dt);
    this.throttle = damp(this.throttle, input.throttle, mode.throttleResponse, dt);
    const handling=this.type==='tinny'?TINNY_HANDLING:this.type==='cat'?CAT_HANDLING:null;
    this.steer = damp(this.steer, input.steer, this.type==='hyper'?APEX_HANDLING.steerResponse:handling?.steerResponse||6, dt);
    if(!this.airborne){
      if(input.trimStep){
        if(isJet(this.type))this.trimDegrees=jetTrimPositions(this.type)[clamp(this.trimIndex+input.trimStep,0,jetTrimPositions(this.type).length-1)];
        else this.setTrim(this.trimDegrees+input.trimStep);
        this.trimHeld=input.trim||0;this.trimRepeat=0;
      }else this.updateTrim(dt,input.trim||0);
    }
    this.riderAft=damp(this.riderAft,input.freestyle?1:0,5,dt);
    let fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let forward = this.vx * fx + this.vz * fz;
    this.speed = Math.hypot(this.vx, this.vz);
    this.slip = this.vx * fz - this.vz * fx;
    const onPlane=clamp((Math.abs(forward)-hydro.planingStart)/(hydro.planingEnd-hydro.planingStart),0,1);
    this.planing=damp(this.planing,onPlane*onPlane*(3-2*onPlane),2.5,dt);
    this.wettedFraction=1-this.planing*(1-hydro.minimumWetted);updatePassenger(this,dt);
    this.drive=this.propulsion.update(dt,this,input,time);
    const sprayTurn=tenderTurn(this,input,dt),bounce=tinnyBounce(this,dt);
    if (!this.airborne) {
      let forceX=this.drive.force.x,forceZ=this.drive.force.z;
      const forwardForce=forceX*fx+forceZ*fz;
      if((forward>c.maxSpeed&&forwardForce>0)||(forward<-c.reverseMax&&forwardForce<0)){forceX-=fx*forwardForce;forceZ-=fz*forwardForce;}
      this.vx+=forceX/driveConfig.effectiveMass*dt;this.vz+=forceZ/driveConfig.effectiveMass*dt;
      const grip = TUNING[this.tuning].grip*(input.freestyle ? c.slideGrip : c.lateralGrip)*(1-.18*this.planing);
      const lateral = (this.vx * fz - this.vz * fx) * (1 - Math.exp(-grip * dt));
      this.vx -= fz * lateral; this.vz += fx * lateral;
      this.lateralAcceleration=damp(this.lateralAcceleration,-lateral/dt,10,dt);
      const immersed=hullImmersion(this,time);
      const trimDrag=1+Math.max(0,-this.pitch)*.7+Math.max(0,this.pitch-.3)*.25;
      const planeDrag=1+.26*(1-this.planing)*clamp(this.speed/6,0,1);
      const coastDrag=!isJet(this.type)&&(this.drive.shifting||Math.abs(this.throttle)<.05)?hydro.coastDrag:1;
      // At high bow angle the stern pushes a larger wetted face through water.
      // A small gameplay drag penalty allows a sustained powered bow ride all
      // the way to its speed ceiling; releasing the aft stance settles the hull.
      const bowDrag=1+(hydro.bowPloughDrag||0)*Math.sin(Math.max(0,this.pitch))**2;
      const resistance=immersed*coastDrag*trimDrag*planeDrag*bowDrag*(driveConfig.linearResistance+this.speed*driveConfig.quadraticResistance)/driveConfig.effectiveMass+(1-immersed)*this.speed*.0015;
      const drag = Math.exp(-resistance*dt);
      this.vx *= drag; this.vz *= drag;
      const yawDamping=hydro.yawDamping+Math.abs(forward)*hydro.yawSpeedDamping;
      const sliding=input.freestyle?.72:1;
      const decay=Math.exp(-yawDamping*sliding*dt);
      const torque=(this.drive.yawMoment||0)*sprayTurn.yawGain;
      const yawLimit=this.type==='hyper'?APEX_HANDLING.yawLimit/(1+this.speed/APEX_HANDLING.turnSpeedScale):sprayTurn.yawLimit;
      this.yawRate=clamp(this.yawRate*decay+(torque*TUNING[this.tuning].yaw/hydro.yawInertia)/(yawDamping*sliding)*(1-decay),-yawLimit,yawLimit);
      if(this.type==='hyper'){
        const magnitude=Math.hypot(this.vx,this.vz),cap=forward<0?c.reverseMax:c.maxSpeed;
        if(magnitude>cap){this.vx*=cap/magnitude;this.vz*=cap/magnitude;}
      }
    } else {
      this.lateralAcceleration=damp(this.lateralAcceleration,0,6,dt);
      this.yawRate = damp(this.yawRate, this.steer * c.airSteer, isJet(this.type)?3.2:2.5, dt);
      this.spin += this.yawRate * dt; this.airTime += dt;
      this.pitch = clamp(this.pitch + input.trim * dt * (this.type==='hyper'?APEX_HANDLING.airPitch:isJet(this.type) ? 0.9 : 0.45), this.type==='hyper'?-APEX_HANDLING.airPitchLimit:-0.9, this.type==='hyper'?APEX_HANDLING.airPitchLimit:1.1);
      this.vy -= 9.81 * dt;
    }
    this.heading += this.yawRate * dt;
    const oldX = this.x, oldZ = this.z;
    this.x += this.vx * dt; this.z += this.vz * dt;
    let hit;
    if(this.type==='hyper'){
      const steps=Math.max(1,Math.ceil(Math.hypot(this.x-oldX,this.z-oldZ)/.6));
      for(let i=1;i<=steps&&!hit;i++)for(const along of[-c.length*.35,0,c.length*.35]){
        hit ||=this.collision(oldX+(this.x-oldX)*i/steps+Math.sin(this.heading)*along,oldZ+(this.z-oldZ)*i/steps+Math.cos(this.heading)*along,c.width*.5+.12,this.y);
      }
    }else hit=this.collision(this.x, this.z, c.width * 0.5 + 0.35, this.y);
    if (hit) {
      this.x = oldX; this.z = oldZ;
      this.vx *= -0.22; this.vz *= -0.22;
      if (this.speed > 14) this.wipe('Hard collision');
      else if (this.trickCooldown === 0) { this.onEvent({ type: 'bump', label: 'Mind the shoreline' }); this.trickCooldown = 1; }
    }
    if(this.wipeout>0)return; // A collision cannot also bank a landing in this step.
    const margin=this.type==='hyper'?APEX_HANDLING.boundaryMargin:35;
    this.boundary = this.x < WORLD.minX + margin || this.x > WORLD.maxX - margin || this.z < WORLD.minZ + margin || this.z > WORLD.maxZ - margin;
    if (this.x < WORLD.minX || this.x > WORLD.maxX || this.z < WORLD.minZ || this.z > WORLD.maxZ) { this.onEvent({ type: 'boundary', label: 'Back to safe water' }); this.recover(); return; }
    fx = Math.sin(this.heading); fz = Math.cos(this.heading);
    const half = c.length * 0.4, width = c.width * 0.43;
    // Four water samples: separate port/starboard and bow/stern supports.
    const samples = [-1, 1].map(side => [-1, 1].map(end => waveHeight(
      this.x + fx * half * end + fz * width * side,
      this.z + fz * half * end - fx * width * side, time)));
    const water = samples.flat().reduce((a, b) => a + b) / 4 + c.rideHeight;
    // Water-relative damping lets the cat follow a rising crest instead of
    // damping away the upward motion of its supporting water. Teleports and
    // recovery clear the history, so they cannot create a heave impulse.
    const waterVelocity=this.supportWater===null?0:clamp((water-this.supportWater)/dt,-4,4);this.supportWater=water;
    const surfacePitch = Math.atan2((samples[0][1] + samples[1][1] - samples[0][0] - samples[1][0]) / 2, half * 2);
    const surfaceRoll = Math.atan2((samples[1][0] + samples[1][1] - samples[0][0] - samples[0][1]) / 2, width * 2);
    this.airTricks.update(dt,input.pose==='heartattack'&&this.type!=='hyper'?'':input.pose,this.airborne,this.y-water);
    if (!this.airborne) {
      const balanceMoment=1+Math.max(0,this.drive.trimAngle*180/Math.PI-6)*.018;
      const bowWindow=handling?clamp((forward-handling.bowStart)/handling.bowRange,0,1):(forward>5?1:0);
      const bowSpeed=handling?.bowSpeedRange?1-handling.bowSpeedLoss*clamp((forward-handling.bowSpeedStart)/handling.bowSpeedRange,0,1):1;
      const lift=input.freestyle?c.wheelieAngle*balanceMoment*this.riderAft*bowWindow*bowSpeed*clamp(this.throttle,0,1)*clamp(1-Math.abs(this.steer)*(handling?.bowSteeringLoss??.85),0,1):0;
      const plane = !isJet(this.type) ? Math.max(0, this.throttle) * (this.type==='tinny'?.30:.24) * Math.sin(this.planing*Math.PI)*(1-this.riderAft*.7) : 0.035 * this.throttle;
      const trim = this.drive.trimAngle*(isJet(this.type)?.45:.65);
      // Angular inertia and damping retain a landing/chop response instead of
      // instantly following a prescribed orientation.
      const shaft=shaftPitch(this,input,surfacePitch,dt);
      let pitchTarget=(shaft===null?surfacePitch+lift+plane+trim+sprayTurn.pitch:shaft+sprayTurn.pitch*.4)+bounce.pitch;
      if(this.type==='hyper')pitchTarget=Math.min(APEX_HANDLING.bowTargetLimit,pitchTarget);
      this.pitchRate+=((pitchTarget-this.pitch)*hydro.pitchSpring-this.pitchRate*hydro.pitchDamping)*dt;
      this.pitch+=this.pitchRate*dt;
      const rollTarget=surfaceRoll-this.yawRate*clamp(this.speed/20,0,1)*(isJet(this.type)?.48:.24)+sprayTurn.roll+shaftRoll(this);
      this.rollRate+=((rollTarget-this.roll)*hydro.rollSpring-this.rollRate*hydro.rollDamping)*dt;this.roll+=this.rollRate*dt;
      const verticalReaction=clamp(this.drive.force.y/driveConfig.effectiveMass,-3,3);
      // As the bow rises, support moves toward the stern. Raise the body origin
      // around that support instead of submerging the transom a metre deep.
      const sternSupportLift=Math.sin(Math.max(0,this.pitch))*(this.type==='tinny'?c.length*TINNY_HANDLING.sternSupport+(SHAFTING.sternPivot-c.length*TINNY_HANDLING.sternSupport)*(this.shaftLoad||0)*clamp(1-Math.abs(this.steer)/.5,0,1):c.length*(handling?.sternSupport??.29))*clamp((this.pitch-.18)/.4,0,1);
      const supportError=water+sternSupportLift+sprayTurn.lift+bounce.lift-this.y;
      const followingWater=waterVelocity*sprayTurn.damping*(hydro.waterFollow||0);
      // Additional immersed volume supplies bounded reserve buoyancy as a crest
      // reaches the tube tops. This changes heave forces, not render position.
      const reserve=clamp(Math.max(0,supportError-(hydro.reserveDepth||Infinity))**2*(hydro.reserveBuoyancy||0),0,hydro.maxReserve||0);
      const supportAcceleration=supportError*c.spring-this.vy*sprayTurn.damping+verticalReaction+followingWater+reserve;
      this.vy+=supportAcceleration*dt;
      this.y += this.vy * dt;constrainHullWater(this,time);hullContactSplash(this,dt,time);
      if (this.pitch > c.wipeoutAngle && this.speed > 6) this.wipe(this.type==='tinny'?'Looped the tinny':'Over the balance point');
      let onRamp=false;
      for (const ramp of ramps) {
        // A ramp rises toward +Z. Entering backward hits its foam-covered side instead of launching.
        if (Math.abs(this.x - ramp.x) < ramp.width / 2 && this.z > ramp.z - ramp.length / 2 && this.z < ramp.z + ramp.length / 2 && this.vz > 7) {
          const profile=rampProfile(ramp,(this.z-(ramp.z-ramp.length/2))/ramp.length),base=rampBaseHeight(ramp,time),deck=base+profile.height+c.rideHeight;
          if(ramp.floating&&this.y>deck+.7)continue;
          onRamp=true;
          const heave=ramp.floating?(rampBaseHeight(ramp,time+.01)-rampBaseHeight(ramp,time-.01))/.02:0;
          this.y = Math.max(this.y,deck); this.vy = this.vz*profile.slope+heave;
          if (this.z > ramp.z + ramp.length / 2 - Math.max(0.7, this.vz * dt * 1.5)) { this.launch(ramp.curved?clamp(this.vy+1,4.5,8.5):Math.max(4.5,this.vy+1),ramp.curved?Math.atan(profile.slope)*.8:.23); break; }
        }
      }
      // Large steep chop can unweight a fast hull. No jump input or repeated aerial launch.
      if (!this.airborne && !onRamp && waveChop(this.x,this.z) > .52 && this.speed > 14 && (this.type!=='hyper'||waveChop(this.x,this.z)>.75&&seaAmplitude(time)>1.4&&this.speed<65) && Math.abs(this.pitch)<.45 && (this.y > water + .07 || supportAcceleration < -9.81) && this.vy > .65) this.launch(this.vy, this.pitch,true);
      if (!this.airborne && this.pitch > 0.65 && this.speed > 7) {
        this.wheelieTime += dt;
        if (this.wheelieTime > 1.6 && !this.trickCooldown) { this.onEvent({ type: 'score', label: 'Bow rider', points: 100 }); this.trickCooldown = 4; this.wheelieTime = 0; }
      } else this.wheelieTime = 0;
      if (Math.abs(this.yawRate) > 0.8 && this.speed > 5 && input.freestyle) {
        this.donut += Math.abs(this.yawRate) * dt;
        if (this.donut > Math.PI * 2 && !this.trickCooldown) { this.onEvent({ type: 'score', label: 'Rooster tail donut', points: 180 }); this.donut = 0; this.trickCooldown = 5; }
      } else this.donut = Math.max(0, this.donut - dt);
      if (Math.abs(this.slip) > 4 && this.speed > 10 && Math.abs(this.steer) > 0.25) {
        this.driftTime += dt;
        if (this.driftTime > 1 && !this.trickCooldown) { this.onEvent({ type: 'score', label: 'Spray carve', points: 75 }); this.trickCooldown = 4; this.driftTime = 0; }
      } else this.driftTime = 0;
    } else {
      this.y += this.vy * dt;
      if (this.y <= water && this.vy < 0) {
        const impact = -this.vy, lateralImpact = Math.abs(this.slip);
        this.y = water; this.airborne = false;this.pitchRate=-this.pitch*impact*.15;this.rollRate=-this.roll*impact*.12;
        this.onEvent({ type: 'splash', impact });
        if (Math.abs(this.pitch) > (this.type==='hyper'?APEX_HANDLING.landingPitchLimit:.85) || lateralImpact > (this.type==='hyper'?30:21) || impact > 13) this.wipe('Rough landing');
        else {
          const landedPoses=this.airTricks.land(true),trickMultiplier=this.type==='hyper'?APEX_HANDLING.trickMultiplier:1;
          const spins = Math.floor((Math.abs(this.spin) + 0.35) / (2 * Math.PI));
          const halfspin = Math.abs(this.spin) > Math.PI - 0.3;
          if (this.airTime > 0.45) this.onEvent({ type: 'score', label: spins ? `${spins * 360}° spin · landed` : halfspin ? '180° · landed' : this.waveLaunch?'Wave hop · landed':'Clean air', points: Math.round((this.airTime * 80 + (spins ? spins * 400 : halfspin ? 180 : 0))*trickMultiplier) });
          for(const event of landedPoses)this.onEvent({...event,points:Math.round(event.points*trickMultiplier)});
          const loss = clamp(1 - impact * 0.025 - lateralImpact * 0.012, 0.4, 0.95);
          this.vx *= loss; this.vz *= loss; this.vy = -impact * 0.08;
        }
        this.airTime = 0; this.spin = 0;
      }
    }
    updateShaftStatus(this,dt);
    const nextForward=this.vx*fx+this.vz*fz;
    this.surgeAcceleration=damp(this.surgeAcceleration,clamp((nextForward-forward)/dt,-12,12),7,dt);
    if (!this.airborne && !hit && this.speed < 12 && Math.abs(this.pitch) < 0.4 && !this.boundary) this.safe = { x: this.x, z: this.z, heading: this.heading };
    if (![this.x,this.y,this.z,this.heading,this.pitch,this.roll,this.vx,this.vy,this.vz].every(Number.isFinite) || this.y < waveHeight(this.x,this.z,time)-6) this.recover();
  }
  launch(velocity, pitch, wave=false) { if (this.airborne) return; this.airTricks.reset();this.airborne = true;this.waveLaunch=wave; this.vy = velocity; this.pitch = pitch; this.airTime = 0; this.spin = 0; }
}
