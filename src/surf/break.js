// Original authored reef, in metres. These are game waves, not a surveyed break.
export const SURF_BREAK={x:3400,z:-3100,name:'Rats Reef · Outer Left',faceHeight:2.2,period:22,travelSpeed:5.2,width:560,yacht:{x:3170,z:-3240,heading:0},lineup:{x:3320,z:-3155,heading:.24}};
export const SURF_SURFACE={width:660,depth:1060,centerZ:-190,minZ:-720,maxZ:340};
export const SURF_OPTIONS={faceHeight:2.2,direction:1,difficulty:'forgiving'};
export function setSurfOptions(options={}){if([2.2,6.3].includes(options.faceHeight))SURF_OPTIONS.faceHeight=options.faceHeight;if([1,-1].includes(options.direction))SURF_OPTIONS.direction=options.direction;if(['forgiving','standard','expert'].includes(options.difficulty))SURF_OPTIONS.difficulty=options.difficulty;}
export const surfScale=()=>SURF_OPTIONS.faceHeight/6.3156;
export const surfWidth=()=>Math.sqrt(surfScale());
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
let clock=null;
export function setSurfClock(time){clock=Number.isFinite(time)?time:null;}
export const surfClock=time=>clock??time;
export const setPhase=time=>((time%SURF_BREAK.period)+SURF_BREAK.period)%SURF_BREAK.period;
const spacing=SURF_BREAK.period*SURF_BREAK.travelSpeed;
const crestAt=(lx,time)=>-85+setPhase(time)*SURF_BREAK.travelSpeed+lx*SURF_OPTIONS.direction*.035;
export function surfSection(x){
 const progress=SURF_OPTIONS.direction*(x-SURF_BREAK.x)+140;
 const hollow=smooth(18,40,progress)*(1-smooth(75,100,progress))+.8*smooth(182,202,progress)*(1-smooth(220,242,progress));
 const shoulder=smooth(124,150,progress)*(1-smooth(175,195,progress)),air=smooth(225,248,progress)*(1-smooth(278,300,progress));
 const name=progress<30?'TAKEOFF':progress<90?'BARREL':progress<140?'OPEN WALL':progress<190?'SHOULDER':progress<225?'REBUILT POCKET':progress<285?'AIR SECTION':'EXIT';
 return {progress,name,hollow,shoulder,air,height:1-.3*shoulder+.1*hollow+.12*air,front:1+.65*shoulder-.22*hollow-.25*air};
}
function shape(crest){
 const shoal=smooth(-260,-90,crest),strength=(.32+.68*shoal)*smooth(-720,-620,crest)*(1-smooth(240,340,crest));
 return {shoal,strength,front:11+(1-shoal)*18,back:24+(1-shoal)*21,trough:12+(1-shoal)*18,offset:18+(1-shoal)*16};
}
function train(lx,lz,time){
 const section=surfSection(lx+SURF_BREAK.x),scale=surfScale(),widthScale=surfWidth(),base=crestAt(lx,time),nearest=Math.round((lz-base)/spacing);let height=0;
 for(let i=-1;i<=1;i++){
  const crest=base+(nearest+i)*spacing,s=shape(crest),q=lz-crest,width=(q>0?s.front*section.front:s.back)*widthScale;
  height+=(4*Math.exp(-((q/width)**2))-3*Math.exp(-(((q-s.offset*widthScale)/(s.trough*widthScale))**2)))*.96*s.strength*scale*section.height;
 }
 return height;
}
export function surfInfluence(x,z){const lx=x-SURF_BREAK.x,lz=z-SURF_BREAK.z;return(1-smooth(265,330,Math.abs(lx)))*smooth(-720,-650,lz)*(1-smooth(285,340,lz));}
export function surfHeight(x,z,time){return train(x-SURF_BREAK.x,z-SURF_BREAK.z,time);}
export function surfWave(x,z,time){
 const lx=x-SURF_BREAK.x,lz=z-SURF_BREAK.z,base=crestAt(lx,time),crest=base+Math.round((lz-base)/spacing)*spacing,q=lz-crest,s=shape(crest);
 const influence=surfInfluence(x,z);
 if(!influence)return {normal:{x:0,y:1,z:0},height:0,setStrength:0,influence:0,crest:SURF_BREAK.z+crest,q,peel:SURF_BREAK.x,broken:0,curl:0,slopeX:0,slopeZ:0,phase:setPhase(time),section:surfSection(x),surfaceVelocity:{x:0,y:0,z:0}};
 const section=surfSection(x),ux=lx*SURF_OPTIONS.direction;const phase=(crest-lx*SURF_OPTIONS.direction*.035+85)/SURF_BREAK.travelSpeed,peel=-140+phase*7,breaking=smooth(-140,-85,crest)*(1-smooth(230,300,crest)),broken=breaking*(1-smooth(peel-35,peel+5,ux));
 const slopeX=(train(lx+.1,lz,time)-train(lx-.1,lz,time))/.2,slopeZ=(train(lx,lz+.1,time)-train(lx,lz-.1,time))/.2,normalLength=Math.hypot(slopeX,1,slopeZ);
 return {normal:{x:-slopeX/normalLength,y:1/normalLength,z:-slopeZ/normalLength},height:train(lx,lz,time),setStrength:s.strength,influence,crest:SURF_BREAK.z+crest,q,peel:SURF_BREAK.x+SURF_OPTIONS.direction*peel,broken,curl:breaking*clamp(section.hollow*Math.max(smooth(peel-28,peel-7,ux),section.progress>180?.65*smooth(peel-115,peel-70,ux):0)+.55*section.air*smooth(peel-115,peel-70,ux))*(1-smooth(peel+16,peel+42,ux)),slopeX,slopeZ,phase:setPhase(time),section,surfaceVelocity:{x:SURF_OPTIONS.direction*(.12*s.strength+.7*broken),z:.45*s.strength*Math.cos(q/20)+2*broken,y:(train(lx,lz,time+.02)-train(lx,lz,time-.02))/.04}};
}
export function curlPoint(x,crest,time,theta,context=null){
 const section=context?.section||surfSection(x),strength=context?.setStrength??shape(crest-SURF_BREAK.z).strength,part=theta/(Math.PI*.98);
 return {q:(1+(1-Math.cos(theta))*5.7)*surfWidth()*section.front,y:Math.max(context&&context.curl<.12?-100:surfHeight(x,crest+(1+(1-Math.cos(theta))*5.7)*surfWidth()*section.front,time)+.018,(3.4+Math.sin(theta)*2.3-part**3*2.5)*surfScale()*section.height*strength)};
}
export function barrelRoof(x,z,time,wave=surfWave(x,z,time)){
 const q=wave.q/(surfWidth()*wave.section.front),cos=1-(q-1)/5.7;
 if(wave.curl<.25||cos< -1||cos>1)return null;
 return curlPoint(x,wave.crest,time,Math.acos(cos)).y;
}
// Stable crest positions move through the entire patch; modulo only relabels them.
// No wave is destroyed/re-spawned when a set crosses the period boundary.
export function incomingSwells(time,x=SURF_BREAK.x){
 const base=crestAt(x-SURF_BREAK.x,time),result=[];
 for(let i=-6;i<=4;i++){const z=base+i*spacing;if(z> -650&&z<300)result.push({x,z:SURF_BREAK.z+z,strength:shape(z).strength,breaking:smooth(-140,-85,z)*(1-smooth(230,300,z))});}
 return result;
}
export const SURF_GLSL=`
uniform float uSurfTime;uniform float uSurfHeightScale;uniform float uSurfDirection;
vec2 reefSection(vec2 p){
 float d=uSurfDirection*(p.x-${SURF_BREAK.x}.)+140.;
 float hollow=smoothstep(18.,40.,d)*(1.-smoothstep(75.,100.,d))+.8*smoothstep(182.,202.,d)*(1.-smoothstep(220.,242.,d));
 float shoulder=smoothstep(124.,150.,d)*(1.-smoothstep(175.,195.,d)),air=smoothstep(225.,248.,d)*(1.-smoothstep(278.,300.,d));
 return vec2(1.-.3*shoulder+.1*hollow+.12*air,1.+.65*shoulder-.22*hollow-.25*air);
}
vec2 reefSurfProfile(vec2 p){
 vec2 l=p-vec2(${SURF_BREAK.x}.,${SURF_BREAK.z}.);float base=-85.+mod(uSurfTime,${SURF_BREAK.period}.)*${SURF_BREAK.travelSpeed.toFixed(4)}+l.x*uSurfDirection*.035;vec2 section=reefSection(p);float widthScale=sqrt(uSurfHeightScale);
 float nearest=floor((l.y-base)/${spacing.toFixed(4)}+.5),h=0.,slope=0.;
 for(int i=-1;i<=1;i++){
  float crest=base+(nearest+float(i))*${spacing.toFixed(4)},q=l.y-crest,shoal=smoothstep(-260.,-90.,crest);
  float strength=(.32+.68*shoal)*smoothstep(-720.,-620.,crest)*(1.-smoothstep(240.,340.,crest));
  float width=(q>0.?(11.+(1.-shoal)*18.)*section.y:24.+(1.-shoal)*21.)*widthScale,trough=(12.+(1.-shoal)*18.)*widthScale,offset=(18.+(1.-shoal)*16.)*widthScale;
  float peak=4.*exp(-pow(q/width,2.)),valley=3.*exp(-pow((q-offset)/trough,2.)),amplitude=.96*strength*uSurfHeightScale*section.x;
  h+=(peak-valley)*amplitude;slope+=(-2.*q/(width*width)*peak+2.*(q-offset)/(trough*trough)*valley)*amplitude;
 }
 return vec2(h,slope);
}
float reefSurfHeight(vec2 p){return reefSurfProfile(p).x;}
float reefSurfContrast(vec2 p,float height){
 vec2 l=p-vec2(${SURF_BREAK.x}.,${SURF_BREAK.z}.);float base=-85.+mod(uSurfTime,${SURF_BREAK.period}.)*${SURF_BREAK.travelSpeed.toFixed(4)}+l.x*uSurfDirection*.035;
 float crest=base+floor((l.y-base)/${spacing.toFixed(4)}+.5)*${spacing.toFixed(4)},shoal=smoothstep(-260.,-90.,crest);
 float strength=(.32+.68*shoal)*smoothstep(-720.,-620.,crest)*(1.-smoothstep(240.,340.,crest));
 return height/max(.06,strength*uSurfHeightScale*reefSection(p).x);
}
vec3 reefSurfWave(vec2 p){vec2 profile=reefSurfProfile(p);return vec3(profile.x,(reefSurfHeight(p+vec2(.1,0.))-reefSurfHeight(p-vec2(.1,0.)))/.2,profile.y);}
float reefSurfMask(vec2 p){vec2 l=p-vec2(${SURF_BREAK.x}.,${SURF_BREAK.z}.);return(1.-smoothstep(265.,330.,abs(l.x)))*smoothstep(-720.,-650.,l.y)*(1.-smoothstep(285.,340.,l.y));}
`;
