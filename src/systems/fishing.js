import{fishingConditions}from'./day-cycle.js';
// Approximate game fishing grounds, east of the entrance bank; catch and release.
export const FISHING_SPOTS=[
 {name:'Outer bank',x:1040,z:-1800,radius:85},
 {name:'Bluewater patch',x:1450,z:-1770,radius:90},
 {name:'Reef edge',x:1650,z:-1620,radius:80},
];
export const FISHING_LAUNCH={x:1040,z:-1770,heading:Math.PI/2};
export const SPECIES=[
 {name:'Spotted mackerel',min:1.5,max:6,colour:'#73bac1'},
 {name:'Longtail tuna',min:3,max:15,colour:'#648ec0'},
 {name:'Mahi-mahi',min:2,max:12,colour:'#a4ca46'},
 {name:'Little black marlin',min:12,max:35,colour:'#527cc1'},
];
export class Fishing{
 constructor(onCatch=()=>{},random=Math.random){this.onCatch=onCatch;this.random=random;this.hour=14.8;this.phase='idle';this.time=0;this.progress=0;this.tension=0;this.message='';this.catch=null;}
 nearest(v){return FISHING_SPOTS.find(s=>Math.hypot(v.x-s.x,v.z-s.z)<s.radius)||null;}
 get active(){return ['casting','waiting','bite','hooked'].includes(this.phase);}
 cancel(message='Line retrieved'){if(this.active){this.phase='idle';this.message=message;}this.tension=0;}
 action(v,castFrom=null){
  if(this.phase==='bite'){this.phase='hooked';this.time=0;this.progress=0;this.tension=.2;this.message='Hooked! Hold REEL; release when tension rises.';return true;}
  if(this.active){this.cancel();return false;}
  if(!this.nearest(v)){this.message='Find the fishing grounds beyond the bar · Pause → GO FISHING';return false;}
  if(v.speed>1.5||v.airborne||v.wipeout){this.message='Slow below 5 km/h to cast';return false;}
  this.origin={x:v.x,z:v.z,heading:v.heading};this.castOrigin=castFrom?{x:castFrom.x,z:castFrom.z,heading:castFrom.heading}:{...this.origin};this.phase='casting';this.time=0;this.catch=null;this.progress=0;this.tension=0;
  const conditions=fishingConditions(this.hour),roll=this.random(),index=roll>.95-conditions.rareBonus?3:roll>.7?2:roll>.35?1:0,s=SPECIES[index];
  this.fish={...s,kg:Math.round((s.min+(s.max-s.min)*this.random())*10)/10};this.biteConditions=conditions.label;this.wait=(3+this.random()*3)*conditions.waitMultiplier;this.message='Casting…';return true;
 }
 update(dt,v,reeling){
  if(!this.active)return;
  if(v.speed>2.5||v.wipeout||v.airborne||Math.hypot(v.x-this.origin.x,v.z-this.origin.z)>8){this.cancel('Line retrieved · hold position to fish');return;}
  this.time+=dt;
  if(this.phase==='casting'&&this.time>.8){this.phase='waiting';this.time=0;this.message='Watch the float…';}
  else if(this.phase==='waiting'&&this.time>this.wait){this.phase='bite';this.time=0;this.message='BITE! Press K / FISH to hook!';}
  else if(this.phase==='bite'&&this.time>3){this.phase='escaped';this.message='Missed the bite · K / FISH to cast again';}
  else if(this.phase==='hooked'){
   this.running=Math.sin(this.time*1.45)>.55;
   this.tension=Math.max(0,Math.min(1,this.tension+dt*(reeling?(this.running?.29:.16):-.4)));
   this.progress=Math.max(0,this.progress+dt*(reeling?(this.running?.025:.09):-.008));
   this.message=this.running?'Fish running · ease off REEL':'Hold REEL · release to ease tension';
   if(this.tension>=1||this.time>55){this.phase='escaped';this.message=this.tension>=1?'Line snapped! Ease off next time · K to retry':'Fish escaped · K to cast again';}
   else if(this.progress>=1){this.progress=1;this.phase='landed';this.catch={...this.fish};this.message=`${this.fish.name} · ${this.fish.kg} kg · released!`;this.onCatch(this.catch);}
  }
 }
 status(v){return{phase:this.phase,active:this.active,castOrigin:this.castOrigin?{...this.castOrigin}:null,conditions:fishingConditions(this.hour).label,near:this.nearest(v)?.name||'',message:this.message,progress:this.progress,tension:this.tension,running:!!this.running,catch:this.catch,time:this.time};}
}
