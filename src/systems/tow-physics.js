import{VEHICLES,waveHeight}from'../config.js';import{bodyPoint}from'../vehicles/propulsion.js';
export const TOW={line:15,boardingDistance:20,boardingSpeed:2.5,spring:18,damping:6,maxPull:45,breakStretch:7,breakSeconds:.45,maxSpeed:29,gravity:9.81,edgeForce:5.2,wakeSpread:.24,wakeWidth:.65,wakeHeight:.48};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));export const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function towHitch(p){return bodyPoint(p,[0,.32,-(VEHICLES[p.type]?.length||3)*.48]);}
export function wakeAt(x,z,driver){
 const fx=Math.sin(driver.heading),fz=Math.cos(driver.heading),dx=x-driver.x,dz=z-driver.z,d=-(dx*fx+dz*fz),side=dx*fz-dz*fx;
 if(d<1||d>42)return 0;const crest=1+d*TOW.wakeSpread;
 return TOW.wakeHeight*clamp((driver.speed-2)/9)*clamp((d-1)/4)*clamp((42-d)/10)*Math.exp(-(((Math.abs(side)-crest)/TOW.wakeWidth)**2));
}
export const towSurface=(x,z,t,p)=>waveHeight(x,z,t)+wakeAt(x,z,p);
export function makeTowState(driver,board,time){const h=towHitch(driver),x=h.x-Math.sin(driver.heading)*TOW.line,z=h.z-Math.cos(driver.heading)*TOW.line;return{x,z,y:towSurface(x,z,time,driver)+.08,heading:driver.heading,pitch:0,roll:0,vx:driver.vx||0,vz:driver.vz||0,vy:0,speed:driver.speed||0,steer:0,board,active:true,mode:'ride',airborne:false,airTime:0,airRotation:0,compression:0,crouch:0,tension:0,stretch:0,strain:0,sprayPower:0,surfaceRate:0,lastSurface:null,landingId:0,landingImpact:0,airPeak:0,points:0,move:'',moveTime:0};}
export function stepTow(s,driver,input,dt,time,collision=()=>null){
 const h=towHitch(driver),dx=h.x-s.x,dz=h.z-s.z,d=Math.hypot(dx,dz)||.001,nx=dx/d,nz=dz/d,relative=(driver.vx-s.vx)*nx+(driver.vz-s.vz)*nz;
 s.stretch=Math.max(0,d-TOW.line);s.tension=d>TOW.line?clamp(s.stretch*TOW.spring+relative*TOW.damping,0,TOW.maxPull):0;
 s.strain=Math.max(0,s.strain+((s.stretch>TOW.breakStretch||driver.speed>TOW.maxSpeed)?dt:-dt*2));if(s.strain>TOW.breakSeconds)return 'Rope broke · ask the driver to tow slower';
 s.steer=damp(s.steer,input.steer||0,9,dt);s.compression=damp(s.compression,input.compress||input.freestyle?1:0,9,dt);s.crouch=s.compression;s.moveTime=Math.max(0,s.moveTime-dt);
 const fx=Math.sin(driver.heading),fz=Math.cos(driver.heading),edge=s.airborne?0:s.steer*TOW.edgeForce*clamp(s.speed/7),drag=s.airborne?.015:.10+s.speed*.012+(input.throttle<0?.8:0);
 s.vx+=(nx*s.tension+fz*edge-s.vx*drag)*dt;s.vz+=(nz*s.tension-fx*edge-s.vz*drag)*dt;
 const speed=Math.hypot(s.vx,s.vz);if(speed>38){s.vx*=38/speed;s.vz*=38/speed;}s.speed=Math.hypot(s.vx,s.vz);
 const x=s.x+s.vx*dt,z=s.z+s.vz*dt;if(collision(x,z,.4,0))return 'Rider hit the bank or a solid object';s.x=x;s.z=z;
 const surface=towSurface(x,z,time,driver)+.08,gradientX=(towSurface(x+.2,z,time,driver)-towSurface(x-.2,z,time,driver))/.4,gradientZ=(towSurface(x,z+.2,time,driver)-towSurface(x,z-.2,time,driver))/.4;
 const surfaceRate=s.lastSurface===null?0:clamp((surface-s.lastSurface)/dt,-8,8);s.lastSurface=surface;
 if(s.airborne){
  s.airTime+=dt;s.vy-=TOW.gravity*dt;s.y+=s.vy*dt;const spin=s.steer*(input.freestyle?(s.board==='body'?4.8:6.5):0)*dt;s.heading+=spin;if(!input.freestyle)s.heading+=angle(Math.atan2(s.vx,s.vz)-s.heading)*(1-Math.exp(-4*dt));s.airRotation+=spin;s.pitch+=clamp(input.trim||0,-1,1)*dt; s.airPeak=Math.max(s.airPeak,s.y-surface);s.sprayPower=0;
  if(s.airTime>.12&&s.y<=surface&&s.vy<surfaceRate){
   const direction=Math.atan2(s.vx,s.vz),yawError=Math.abs(angle(s.heading-direction)),impact=Math.max(0,surfaceRate-s.vy);s.landingImpact=impact;s.landingId++;
   const landingError=s.board==='wake'?Math.min(yawError,Math.abs(Math.PI-yawError)):yawError;
   if(landingError>1.05||Math.abs(angle(s.pitch))>.85||Math.abs(s.roll)>.9||impact>10)return 'Wipeout · sideways or hard landing';
   s.airborne=false;s.y=surface;s.vy=surfaceRate;s.vx*=.82;s.vz*=.82;const spins=Math.floor((Math.abs(s.airRotation)+.22)/Math.PI)*180;s.move=spins>=180?`Tow air ${spins} landed`:'Tow wake jump landed';s.moveTime=2.5;s.points=80+spins/2;
  }
 }else{
  const direction=s.speed>1?Math.atan2(s.vx,s.vz):driver.heading;s.heading+=angle(direction+s.steer*.20-s.heading)*(1-Math.exp(-8*dt));s.roll=damp(s.roll,-s.steer*.38,7,dt);const pitch=Math.atan(gradientX*Math.sin(s.heading)+gradientZ*Math.cos(s.heading));s.pitch=damp(s.pitch,clamp(pitch,-.5,.5),10,dt);
  // Only leave an actual rising crest; compression cannot jump from flat water.
  const wake=wakeAt(x,z,driver),leaving=s.surfaceRate>1.05&&surfaceRate<s.surfaceRate-.12&&wake>.05&&s.speed>5&&s.compression<.8;
  if(leaving&&time-(s.lastLaunch||-10)>.7){s.airborne=true;s.airTime=s.airRotation=0;s.vy=clamp(s.surfaceRate,1.25,4.4);s.lastLaunch=time;s.airPeak=0;s.move='Wake takeoff';s.moveTime=1.2;}
  else{s.y=damp(s.y,surface,32,dt);s.vy=surfaceRate;}
  s.sprayPower=clamp(Math.abs(s.steer)*s.speed/10,0,1.3);
 }
 s.surfaceRate=surfaceRate;if(![s.x,s.y,s.z,s.vx,s.vz,s.heading,s.pitch].every(Number.isFinite))return 'Recovered an unstable tow';return null;
}
