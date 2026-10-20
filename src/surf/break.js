// Original, authored reef break. Twenty feet describes approximate face height,
// not Hawaiian wave-size notation or a surveyed/safe real-world surfing spot.
export const SURF_BREAK={x:3400,z:-3100,name:'Rats Reef · Outer Left',faceHeight:6.1,period:22,travelSpeed:7,width:320,yacht:{x:3170,z:-3240,heading:0},lineup:{x:3320,z:-3155,heading:.24}};
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
let clock=null;
export function setSurfClock(time){clock=Number.isFinite(time)?time:null;}
export const surfClock=time=>clock??time;
export const setPhase=time=>((time%SURF_BREAK.period)+SURF_BREAK.period)%SURF_BREAK.period;
export function surfWave(x,z,time){
 const lx=x-SURF_BREAK.x,lz=z-SURF_BREAK.z,phase=setPhase(time),crest=-85+phase*7+lx*.035,q=lz-crest;
 const influence=(1-smooth(145,205,Math.abs(lx)))*(1-smooth(95,160,Math.abs(lz)));
 const setStrength=smooth(0,1.5,phase)*(1-smooth(20.5,22,phase));
 const peak=4*Math.exp(-((q/(q>0?11:24))**2)),trough=3*Math.exp(-(((q-18)/12)**2)),height=(peak-trough)*.96*setStrength;
 const peel=-140+phase*11,broken=1-smooth(peel-35,peel+5,lx),curl=setStrength*(smooth(peel-28,peel-7,lx))*(1-smooth(peel+16,peel+42,lx));
 const slope=(offsetX,offsetZ)=>{const u=lx+offsetX,v=lz+offsetZ-(-85+phase*7+u*.035);return(4*Math.exp(-((v/(v>0?11:24))**2))-3*Math.exp(-(((v-18)/12)**2)))*.96*setStrength;};
 return {height,setStrength,influence,crest:SURF_BREAK.z+crest,q,peel:SURF_BREAK.x+peel,broken,curl,slopeX:(slope(.1,0)-slope(-.1,0))/.2,slopeZ:(slope(0,.1)-slope(0,-.1))/.2,phase};
}
export const SURF_GLSL=`
uniform float uSurfTime;
vec3 reefSurfWave(vec2 p){
 vec2 l=p-vec2(${SURF_BREAK.x}.,${SURF_BREAK.z}.);float ph=mod(uSurfTime,22.);float q=l.y-(-85.+ph*7.+l.x*.035);
 float width=q>0.?11.:24.;float peak=4.*exp(-pow(q/width,2.)),trough=3.*exp(-pow((q-18.)/12.,2.));
 float setStrength=smoothstep(0.,1.5,ph)*(1.-smoothstep(20.5,22.,ph));float h=(peak-trough)*.96*setStrength;float derivative=(-2.*q/(width*width)*peak+2.*(q-18.)/144.*trough)*.96*setStrength;
 return vec3(h,-derivative*.035,derivative);
}
float reefSurfMask(vec2 p){vec2 l=abs(p-vec2(${SURF_BREAK.x}.,${SURF_BREAK.z}.));return(1.-smoothstep(145.,205.,l.x))*(1.-smoothstep(95.,160.,l.y));}
`;
