import {TINNY_HANDLING,CAT_HANDLING} from '../config.js';
const clamp=v=>Math.max(0,Math.min(1,v));
// Outboard hull response. A bounded planing-pressure cycle represents a chine
// or pontoon catching, unloading and
// touching down again. It drives the existing buoyancy/pitch/roll springs, not
// a visual-only shake or an airborne impulse.
export function tenderTurn(v,input,dt){
  const neutral={yawGain:1,yawLimit:1.6,pitch:0,roll:0,lift:0,damping:v.config.damping};
  const T=v.type==='tinny'?TINNY_HANDLING:v.type==='cat'?CAT_HANDLING:null;
  if(!T)return neutral;
  const speedLoad=clamp((v.speed-3)/5),steerLoad=clamp(Math.abs(v.steer)/.6);
  const crossLoad=clamp(Math.abs(v.slip)/5+Math.abs(v.yawRate)*.25);
  const sharp=clamp((Math.abs(v.steer)-.28)/.42);
  const target=!v.airborne&&!v.wipeout&&(input.freestyle||v.type==='tinny')?speedLoad*steerLoad*crossLoad*sharp*clamp(v.throttle)*clamp(v.drive.wetness):0;
  const rate=target>(v.sprayTurnLoad||0)?5:9;
  v.sprayTurnLoad=(v.sprayTurnLoad||0)+(target-(v.sprayTurnLoad||0))*(1-Math.exp(-rate*dt));
  if(v.sprayTurnLoad>.01)v.sprayTurnPhase=((v.sprayTurnPhase||0)+dt*T.bounceHz*Math.PI*2)%(Math.PI*2);else v.sprayTurnPhase=0;
  const load=v.sprayTurnLoad,pulse=Math.sin(v.sprayTurnPhase),powered=input.freestyle&&!v.airborne&&!v.wipeout?speedLoad*clamp(v.throttle)*clamp(v.drive.wetness):0;
  const surge=powered*Math.max(-1,Math.min(1,(v.surgeAcceleration||0)/6))*T.surgePitch;
  return {yawGain:1+T.slideYawGain*powered,yawLimit:1.6+(T.slideYawLimit-1.6)*powered,
    pitch:load*(v.type==='tinny'?-pulse:pulse)*T.pitchBounce+surge,roll:-Math.sign(v.steer)*load*pulse*T.rollBounce,
    lift:(load*(v.type==='tinny'?-pulse:Math.max(0,pulse))*T.chineLift)||0,damping:v.config.damping+(T.loadedDamping-v.config.damping)*load};
}
