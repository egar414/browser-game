// Visual water displacement tuning. Vehicle movement and handling are unchanged.
export const SPRAY_TUNING = {
  minimumSpeed: .7, maximumSpeed: 32, gravity: 9.81,
  wakeLifetime: 7, wakeSpread: .16, sampleSpacing: .48,
  fanLife: .74, slipGain: .19, turnGain: .12, freestyleGain: 1.32,
};
export const clamp = (value, min=0, max=1) => Math.max(min, Math.min(max, value));

export function sprayState(v, freestyle=false) {
  const speed=clamp(v.speed,0,SPRAY_TUNING.maximumSpeed);
  if(v.airborne||v.wipeout||speed<SPRAY_TUNING.minimumSpeed)return { speed, rate:0, left:0, right:0, jet:0, outside:0 };
  const forward=(v.vx||0)*Math.sin(v.heading)+(v.vz||0)*Math.cos(v.heading);
  const power=clamp(Math.abs(v.throttle));
  const load=clamp(power-speed/v.config.maxSpeed*.55);
  const turn=clamp(Math.abs(v.yawRate||0)*speed*SPRAY_TUNING.turnGain+Math.abs(v.slip||0)*SPRAY_TUNING.slipGain,0,3.5);
  const outside=Math.sign((v.slip||0)-(v.yawRate||0)*2-(v.steer||0)*.1);
  const base=clamp(speed/23)*.65;
  const carving=turn*(freestyle?SPRAY_TUNING.freestyleGain:1)*clamp(speed/7);
  const side=sign=>base+(outside===sign?carving:carving*.1)+load*.18;
  return {
    speed, outside, left:side(-1), right:side(1),
    rate:clamp(speed*8+turn*95+load*55,0,680),
    jet:clamp(power*.7+speed/40)* (forward<-.5?.26:1),
  };
}

export function launchSpray(v, state, side, random=Math.random) {
  const fX=Math.sin(v.heading),fZ=Math.cos(v.heading),sX=fZ,sZ=-fX;
  const strength=side===-1?state.left:state.right;
  const spread=1.2+strength*2.8;
  const backward=state.speed*(.12+random()*.15);
  const width=v.config.width*.48;
  return {
    x:v.x+sX*side*width-fX*v.config.length*(.13+random()*.2),
    y:v.y+.055,
    z:v.z+sZ*side*width-fZ*v.config.length*(.13+random()*.2),
    vx:(v.vx||0)*.38+sX*side*spread*(.6+random()*.7)-fX*backward,
    vy:.7+strength*1.4+random()*1.1,
    vz:(v.vz||0)*.38+sZ*side*spread*(.6+random()*.7)-fZ*backward,
    strength,
  };
}
