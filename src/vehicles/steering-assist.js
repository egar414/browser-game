// Arcade steering assistance calibrated against the Super Skua's powered turn.
// It supplies a minimum response, retaining stronger natural hull/nozzle forces.
export const STEERING_ASSIST={referenceRate:.92,response:5,release:18,apexRelease:28,highSpeedStart:25,highSpeedScale:40};
const clamp=n=>Math.max(0,Math.min(1,n));
export function assistedYaw(v,input,dt,previous,natural,{forward=v.speed,wet=v.drive?.wetness??1,trimScale=1}={}){
 if(!['cat','cruiser','dive','rib','racer'].includes(v.type))return natural;
 const T=STEERING_ASSIST,released=Math.abs(input.steer)<.01;
 if(released)return previous*Math.exp(-(v.type==='hyper'?T.apexRelease:T.release)*dt);
 if(v.airborne||v.wipeout||v.deckMode)return natural;
 const power=v.type==='cat'?clamp(Math.abs(v.throttle)):.55+.45*clamp(Math.abs(v.throttle)),authority=clamp(Math.abs(forward)/3)*clamp(wet)*(.2+.8*power);
 const speedScale=1+Math.max(0,Math.abs(forward)-T.highSpeedStart)/T.highSpeedScale;
 const desired=v.steer*T.referenceRate*(v.workshop?.yaw||1)*authority*trimScale/speedScale*Math.sign(forward||1),sign=Math.sign(desired);
 if(!sign||natural*sign>=Math.abs(desired))return natural;
 return previous+(desired-previous)*(1-Math.exp(-T.response*dt));
}
