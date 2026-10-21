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
  heading*=direction;const error=Math.atan2(Math.sin(heading-s.heading),Math.cos(heading-s.heading));const anticipated=error-(s.yawRate||0)*.14;let steer=Math.abs(anticipated)>.09?Math.sign(anticipated):0;
  return {throttle:1,steer:s.mode==='paddle'?0:steer,trim:0,freestyle:p>215&&p<217,pose:'',space:s.mode==='paddle'||Math.floor(s.time*2)%2===0};
 };
}
