// Test driver uses only the same input values as keyboard controls and read-only
// player/wave feedback. It never changes position, velocity or physics state.
export function surfInputPilot(){
 let cut=0;
 return s=>{
  const p=s.wave.progress,width=Math.sqrt(s.options.faceHeight/6.3156),direction=s.options.direction;
  let target=6*width;if(p>90&&p<110)target=14*width;else if(p>=110&&p<140)target=2*width;else if(p>=140&&p<195)target=12*width;else if(p>=210)target=-width;
  let heading=.8+Math.max(-.5,Math.min(.9,(s.wave.q-target)*.13));
  if(p>230)heading=s.moves.includes('Landing')?.55:1.7;
  if(s.airborne)heading=Math.atan2(s.vx,s.vz)*direction;
  if(p>155&&!cut)cut=1;if(cut===1){heading=-1;if(p<142&&s.moves.includes('Cutback'))cut=2;}
  heading*=direction;const error=Math.atan2(Math.sin(heading-s.heading),Math.cos(heading-s.heading));let steer=Math.abs(error)>.04?Math.sign(error):0;
  if(p>120&&p<130&&s.wave.q<5*width)steer=Math.sin(s.time*9)>.8?direction:steer;
  return {throttle:1,steer:s.mode==='paddle'?0:steer,trim:0,freestyle:false,pose:'',space:s.mode==='paddle'||Math.floor(s.time*2)%2===0};
 };
}
