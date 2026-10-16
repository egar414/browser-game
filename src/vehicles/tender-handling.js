import {TINNY_HANDLING as T} from '../config.js';
const clamp=v=>Math.max(0,Math.min(1,v));
// A bounded planing-pressure cycle represents a chine catching, unloading and
// touching down again. It drives the existing buoyancy/pitch/roll springs, not
// a visual-only shake or an airborne impulse.
export function tenderTurn(v,input,dt){
  const neutral={yawGain:1,yawLimit:1.6,pitch:0,roll:0,lift:0,damping:v.config.damping};
  if(v.type!=='tinny')return neutral;
  const speedLoad=clamp((v.speed-3)/5),steerLoad=clamp(Math.abs(v.steer)/.6);
  const crossLoad=clamp(Math.abs(v.slip)/5+Math.abs(v.yawRate)*.25);
  const target=!v.airborne&&!v.wipeout&&input.freestyle?speedLoad*steerLoad*crossLoad*clamp(v.throttle)*clamp(v.drive.wetness):0;
  const rate=target>(v.sprayTurnLoad||0)?5:9;
  v.sprayTurnLoad=(v.sprayTurnLoad||0)+(target-(v.sprayTurnLoad||0))*(1-Math.exp(-rate*dt));
  if(v.sprayTurnLoad>.01)v.sprayTurnPhase=((v.sprayTurnPhase||0)+dt*T.bounceHz*Math.PI*2)%(Math.PI*2);else v.sprayTurnPhase=0;
  const load=v.sprayTurnLoad,pulse=Math.sin(v.sprayTurnPhase),powered=input.freestyle&&!v.airborne?speedLoad*clamp(v.throttle)*clamp(v.drive.wetness):0;
  return {yawGain:1+T.slideYawGain*powered,yawLimit:1.6+(T.slideYawLimit-1.6)*powered,
    pitch:load*pulse*T.pitchBounce,roll:-Math.sign(v.steer)*load*pulse*T.rollBounce,
    lift:load*Math.max(0,pulse)*T.chineLift,damping:v.config.damping+(T.loadedDamping-v.config.damping)*load};
}
