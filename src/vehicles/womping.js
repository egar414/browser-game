import {isTinny} from '../config.js';
// Authored, water-loaded pitch/heave rhythm. This is not an airborne impulse.
export const WOMP={minimumSpeed:1.4,fullSpeed:5,build:2.8,decay:.65,ready:.48,holdSeconds:5,lift:.24,pitch:.16};
const clamp=x=>Math.max(0,Math.min(1,x));
export function updateWomp(v,input,dt){
 if(!isTinny(v.type))return;
 const wet=clamp(v.drive?.wetness||0),loaded=!v.airborne&&!v.wipeout&&v.throttle>.15&&v.speed>WOMP.minimumSpeed&&wet>.2;
 const target=loaded&&input.womp?clamp((v.speed-WOMP.minimumSpeed)/(WOMP.fullSpeed-WOMP.minimumSpeed))*wet:0;
 v.wompLoad=(v.wompLoad||0)+(target-(v.wompLoad||0))*(1-Math.exp(-(target?WOMP.build:4)*dt));
 v.wompEnergy=clamp((v.wompEnergy||0)+(target>.2?target*1.5:-WOMP.decay)*dt);
 v.wompReady=v.wompEnergy>=WOMP.ready;
 if(v.airborne||v.wipeout){v.wompLoad=0;v.wompEnergy=0;v.wompReady=false;}
 v.womp={active:v.wompLoad>.1,energy:v.wompEnergy,ready:v.wompReady,load:v.wompLoad,cue:v.wompReady?'READY · SHIFT TO SHAFT / STEER TO SPRAY':input.womp&&loaded?'BUILDING THE BOUNCE':v.speed<WOMP.minimumSpeed?'BUILD SPEED · THEN HOLD I / WOMP':'HOLD I / WOMP TO BUILD A BOUNCE'};
}
