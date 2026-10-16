import mapData from './data/mooloolaba.json' with {type:'json'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const WAVE_FIELD=mapData.waveField;
// Estimated entrance shoals on the Point Cartwright side, not surveyed depths.
export const ENTRANCE_SHOALS=[{x:1110,z:-1740,rx:110,rz:42},{x:1270,z:-1745,rx:105,rz:39},{x:1395,z:-1725,rx:75,rz:33}];
// A short, steep inshore set over the authored banks. Original game tuning;
// not measured depths or a solver for breaking waves and tidal currents.
export const BAR_BREAKERS={kx:.14,kz:-.025,speed:1.1,amplitude:.30,sharpness:.28};
export function shoalInfluence(x,z){return Math.min(1,ENTRANCE_SHOALS.reduce((sum,b)=>sum+Math.exp(-2*(((x-b.x)/b.rx)**2+((z-b.z)/b.rz)**2)),0));}
export const SHOAL_GLSL=`float entranceShoal(vec2 p){return min(1.,${ENTRANCE_SHOALS.map(b=>`exp(-2.*dot((p-vec2(${b.x}.,${b.z}.))/vec2(${b.rx}.,${b.rz}.),(p-vec2(${b.x}.,${b.z}.))/vec2(${b.rx}.,${b.rz}.)))`).join('+')});}`;

const WORLD=mapData.world;
export const WAVES=[
  {amplitude:.19,kx:.12,kz:.055,speed:1.45},
  {amplitude:.105,kx:-.24,kz:.18,speed:2.1},
  {amplitude:.055,kx:.53,kz:.36,speed:2.9},
];
// Deep-water dispersion: omega² = g k. Incoming E/NE swell travels west/south.
export const OCEAN_SWELL=[{period:8.5,angle:-.28,weight:.58},{period:7,angle:.18,weight:.28},{period:10.2,angle:-.58,weight:.14}].map(w=>{
 const speed=2*Math.PI/w.period,k=speed*speed/9.81;
 return {...w,speed,kx:Math.cos(w.angle)*k,kz:Math.sin(w.angle)*k};
});
export const OCEAN_TUNING={weatherInterval:3600,transition:12,crestSharpness:.16,groupFloor:.66,groupAmount:.34};
export const SEA_STATES={calm:{name:'Light ocean swell',amplitude:1},chop:{name:'Estuary chop',amplitude:2.2},swell:{name:'Rolling swell',amplitude:3.4},changing:{name:'Hourly ocean conditions',amplitude:1}};
const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453123;return v-Math.floor(v);};
export function hourlyForecast(epoch){
 const hour=Math.floor(epoch/OCEAN_TUNING.weatherInterval),t=smooth(0,1,epoch/OCEAN_TUNING.weatherInterval-hour);
 const mix=(a,b)=>a+(b-a)*t;
 return {height:mix(.85+hash(hour)*1.05,.85+hash(hour+1)*1.05),wind:mix(3+hash(hour+17)*5,3+hash(hour+18)*5),nextChange:OCEAN_TUNING.weatherInterval-((epoch%OCEAN_TUNING.weatherInterval)+OCEAN_TUNING.weatherInterval)%OCEAN_TUNING.weatherInterval};
}
let weatherClock=Date.now()/1000,forecast=hourlyForecast(weatherClock),seaState='calm',seaFrom=1,seaStart=-20;
export function setWeatherClock(epoch){if(Number.isFinite(epoch)){weatherClock=epoch;forecast=hourlyForecast(epoch);}}
export function seaAmplitude(time){
 const target=seaState==='changing'?1.45+forecast.height:SEA_STATES[seaState].amplitude;
 const t=smooth(0,OCEAN_TUNING.transition,time-seaStart);return seaFrom+(target-seaFrom)*t;
}
export function setSeaState(name,time=0,immediate=false){if(!SEA_STATES[name])return;seaFrom=seaAmplitude(time);seaState=name;seaStart=immediate?time-20:time;}
export function oceanReport(time){const a=seaAmplitude(time);return {mode:seaState,height:.4+a*.5,period:8.5,wind:seaState==='changing'?forecast.wind:2+a*1.8,nextChange:forecast.nextChange,simulated:true};}
export function waveChop(x,z){
 const n=WAVE_FIELD.size,u=clamp((x-WORLD.minX)/(WORLD.maxX-WORLD.minX))*(n-1),v=clamp((z-WORLD.minZ)/(WORLD.maxZ-WORLD.minZ))*(n-1);
 const ix=Math.min(n-2,Math.floor(u)),iz=Math.min(n-2,Math.floor(v)),fx=u-ix,fz=v-iz,a=iz*n+ix,d=WAVE_FIELD.values;
 return ((d[a]*(1-fx)+d[a+1]*fx)*(1-fz)+(d[a+n]*(1-fx)+d[a+n+1]*fx)*fz)/255;
}
export function oceanExposure(x,z){return smooth(.48,.94,waveChop(x,z));}
export function waveHeight(x,z,time){
 const chop=waveChop(x,z),ocean=smooth(.48,.94,chop),amplitude=seaAmplitude(time);
 // Preserve sheltered canals; the long-period sea is introduced across the mouth.
 let height=0;const wind=chop*(1+(amplitude-1)*ocean*.72);
 for(const w of WAVES)height+=Math.sin(x*w.kx+z*w.kz+time*w.speed)*w.amplitude*wind;
 if(ocean>.00001){
  const group=.66+.34*(.5+.5*Math.sin(x*.008+z*.004+time*.055));
  const bank=shoalInfluence(x,z),sharp=.16+bank*.22;
  const swell=(.4+amplitude*.5)*.536*ocean*group*(1+bank*.8);
  for(const w of OCEAN_SWELL){const p=x*w.kx+z*w.kz+time*w.speed;height+=(Math.sin(p)-sharp*Math.cos(p*2))*w.weight*swell;}
  const b=BAR_BREAKERS,p=x*b.kx+z*b.kz+time*b.speed;
  height+=(Math.sin(p)-b.sharpness*Math.cos(p*2))*b.amplitude*amplitude*bank*ocean;
 }
 return height;
}
const f=n=>Number(n).toFixed(9);
// Generated from the same coefficients/equations as CPU buoyancy. Return height
// and analytic X/Z slopes (ignoring the slowly varying shore-mask and shoal-envelope gradients).
export const WAVE_GLSL=`
${SHOAL_GLSL}
vec3 oceanWave(vec2 p,float time,float amplitude,float chop){
 float ocean=smoothstep(.48,.94,chop),wind=chop*(1.+(amplitude-1.)*ocean*.72);vec3 w=vec3(0.);
 ${WAVES.map(v=>`{float phase=dot(p,vec2(${f(v.kx)},${f(v.kz)}))+time*${f(v.speed)};float a=${f(v.amplitude)}*wind;w+=vec3(sin(phase),cos(phase)*${f(v.kx)},cos(phase)*${f(v.kz)})*a;}`).join('\n')}
 float gp=dot(p,vec2(.008,.004))+time*.055;
 float bank=entranceShoal(p),sharp=.16+bank*.22;
 float group=.66+.34*(.5+.5*sin(gp)),swell=(.4+amplitude*.5)*.536*ocean*(1.+bank*.8);
 ${OCEAN_SWELL.map(v=>`{float phase=dot(p,vec2(${f(v.kx)},${f(v.kz)}))+time*${f(v.speed)};float h=sin(phase)-sharp*cos(2.*phase),slope=cos(phase)+2.*sharp*sin(2.*phase),a=${f(v.weight)}*swell;w+=vec3(h*group,slope*${f(v.kx)}*group+h*.17*cos(gp)*.008,slope*${f(v.kz)}*group+h*.17*cos(gp)*.004)*a;}`).join('\n')}
 {float phase=dot(p,vec2(${f(BAR_BREAKERS.kx)},${f(BAR_BREAKERS.kz)}))+time*${f(BAR_BREAKERS.speed)};
 float h=sin(phase)-${f(BAR_BREAKERS.sharpness)}*cos(phase*2.),slope=cos(phase)+${f(BAR_BREAKERS.sharpness*2)}*sin(phase*2.);
 w+=vec3(h,slope*${f(BAR_BREAKERS.kx)},slope*${f(BAR_BREAKERS.kz)})*${f(BAR_BREAKERS.amplitude)}*amplitude*bank*ocean;}
 return w;
}`;
