import {waveHeight} from '../ocean.js';
export const BAR_RAMP={x:625,z:-1640,width:18,length:28,height:3.6,curved:true,floating:true,name:'Bar kicker'};
export function rampProfile(r,progress){
  const p=Math.max(0,Math.min(1,progress));
  return {height:r.height*(r.curved?p*p:p),slope:r.height/r.length*(r.curved?2*p:1)};
}
export function rampBaseHeight(r,time){return r.floating?waveHeight(r.x,r.z,time)+.25:0;}
