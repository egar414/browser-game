// Fictional reef and fishery, authored offshore rather than a real survey or safety guide.
export const REEF={x:1900,z:-1900,radius:105,name:'Buddy Reef',launch:{x:1897,z:-1911,heading:0},breath:75,spearRange:9,bagLimit:8,boxLimit:20};
export const REEF_SPECIES=[
 {id:'reef-snapper',name:'Reef snapper',price:35,colour:'#dc967f',kg:1.2},
 {id:'silver-trevally',name:'Silver trevally',price:45,colour:'#93cdd2',kg:1.8},
 {id:'coral-trout',name:'Coral trout',price:65,colour:'#e4a54d',kg:2.1},
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function reefFloor(x,z){const r=Math.hypot(x-REEF.x,z-REEF.z);return -9.5-Math.min(8,r*.065)+1.3*Math.sin((x-REEF.x)*.075)*Math.cos((z-REEF.z)*.09);}
export function reefFish(index,time){const ring=Math.floor(index/6),a=index*2.399+time*(index%2?.065:-.055),radius=7+ring*11;return{x:REEF.x+Math.sin(a)*radius,y:-3.5-ring*2+Math.sin(time*.7+index)*.35,z:REEF.z+Math.cos(a)*radius,heading:a+(index%2?Math.PI/2:-Math.PI/2),species:REEF_SPECIES[index%3]};}
export class ReefDiving{
 constructor(onBank=()=>true,onMessage=()=>{}){this.onBank=onBank;this.onMessage=onMessage;this.active=false;this.mode='snorkel';this.pending=[];this.cooldowns=new Map();this.breath=REEF.breath;this.shot=0;this.hits=0;this.message='';}
 near(p){return Math.hypot(p.x-REEF.x,p.z-REEF.z)<REEF.radius;}
 start(v,mode='snorkel'){
  if(!v.config?.diveBoat){this.say('Choose Reef Buddy or Reef Scout to dive.');return false;}
  if(!this.near(v)){this.say('Find Buddy Reef offshore · REEF TRIP takes you there.');return false;}
  if(v.speed>1.5||v.airborne||v.wipeout){this.say('Slow below 5 km/h to anchor and enter.');return false;}
  this.rescueNeeded=false;this.active=true;this.mode=mode==='freedive'?'freedive':'snorkel';this.pending=[];this.breath=REEF.breath;this.anchor={x:v.x,z:v.z,heading:v.heading};this.heading=v.heading;this.x=v.x-Math.cos(v.heading)*3;this.z=v.z+Math.sin(v.heading)*3;this.y=-.35;this.say('WASD swim · drag to look · Q down / E up · Space spear · B board');return true;
 }
 say(message){this.message=message;this.onMessage(message);}
 direction(input){const a=this.heading+(input.orbit||0),p=clamp(input.lookPitch||0,-1.1,1.1);return{x:Math.sin(a)*Math.cos(p),y:Math.sin(p),z:Math.cos(a)*Math.cos(p)};}
 setMode(mode){if(this.active&&mode==='snorkel'&&this.y< -1.5){this.say('Surface with E / UP before switching to snorkel');return;}this.mode=mode==='freedive'?'freedive':'snorkel';this.say(this.mode==='snorkel'?'Snorkel · float at the surface and look down':'Freedive · Q descend / E ascend · watch your breath');}
 board(v,rescue=false){if(!this.active)return false;const distance=Math.hypot(this.x-v.x,this.z-v.z);if(!rescue&&(distance>10||this.y< -1.5)){this.say('Surface beside your boat to board · E / UP to ascend');return false;}if(!rescue&&this.onBank(this.pending)===false){this.say('Catch box full · sell at the Wharf before diving again');return false;}
  const count=this.pending.length;this.pending=[];this.active=false;this.say(rescue?'Rescued at the boat · this dive’s unbanked catch was lost':count?`${count} fish stowed in your catch box · sell at the Wharf`:'Back aboard');return true;
 }
 update(dt,input,time,surface=0){if(!this.active)return;this.shot=Math.max(0,this.shot-dt);this.heading+=input.steer*dt*1.25;const dir=this.direction(input),speed=input.freestyle?3.4:2.3;
  let x=this.x+dir.x*input.throttle*speed*dt,z=this.z+dir.z*input.throttle*speed*dt;const dist=Math.hypot(x-REEF.x,z-REEF.z);if(dist>REEF.radius){const a=Math.atan2(x-REEF.x,z-REEF.z);x=REEF.x+Math.sin(a)*REEF.radius;z=REEF.z+Math.cos(a)*REEF.radius;}this.x=x;this.z=z;
  this.y=this.mode==='snorkel'?surface-.42:clamp(this.y-(input.trim||0)*1.85*dt,reefFloor(x,z)+1,surface-.35);
  if(this.y>surface-.8)this.breath=Math.min(REEF.breath,this.breath+dt*14);else this.breath=Math.max(0,this.breath-dt*(input.freestyle?1.4:1));
  if(this.breath<=0)this.rescueNeeded=true;
 }
 target(input,time){if(!this.active)return null;const d=this.direction(input);let best=null;for(let i=0;i<24;i++){if((this.cooldowns.get(i)||0)>time)continue;const f=reefFish(i,time),x=f.x-this.x,y=f.y-this.y,z=f.z-this.z,range=Math.hypot(x,y,z),dot=(x*d.x+y*d.y+z*d.z)/range;if(range<REEF.spearRange&&dot>.985&&(!best||range<best.range)){let clear=true;for(let t=.15;t<1;t+=.15)if(this.y+y*t<reefFloor(this.x+x*t,this.z+z*t)+.2)clear=false;if(clear)best={index:i,fish:f,range};}}return best;}
 fire(input,time,stored=0){if(!this.active||this.mode!=='freedive'){this.say('Switch to FREEDIVE to use your spear');return false;}if(this.shot>0)return false;if(this.pending.length>=REEF.bagLimit||stored+this.pending.length>=REEF.boxLimit){this.say('Catch bag full · return to the boat');return false;}this.shot=1.3;const t=this.target(input,time);this.lastShot={x:this.x,y:this.y,z:this.z,direction:this.direction(input),hit:t?.fish||null};if(!t){this.say('Miss · aim the centre marker at a fish within 9 m');return false;}this.cooldowns.set(t.index,time+90);this.pending.push(t.fish.species.id);this.hits++;this.say(`${t.fish.species.name} · $${t.fish.species.price} · board to stow`);return true;}
 get status(){return{active:this.active,mode:this.mode,position:{x:this.x,y:this.y,z:this.z},breath:this.breath,capacity:REEF.breath,depth:Math.max(0,-(this.y||0)),pending:this.pending.length,hits:this.hits,message:this.message,anchor:this.anchor};}
}
