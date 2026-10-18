import {waveHeight} from '../config.js';
import {sprayState,launchSpray,stepDroplet,pumpDischarge,jetPlumeSource} from './spray-model.js';

// Gameplay-scaled capture volume: reward clean spray hits while keeping water
// aboard between passes. Receiving geometry and sinking/reset timing stay fixed.
export const MOORING_FLOOD={capacityLitres:55,drainLitresPerSecond:.02,sinkSeconds:4,resetSeconds:16,emissionHz:24,maxPackets:1024,fanStrands:5,sideLitresPerLoad:480,rearLitresPerPower:150};
export function insideTender(x,z,target){
  const dx=x-target.x,dz=z-target.z,right=(dx*Math.cos(target.heading)-dz*Math.sin(target.heading))/((target.width||1.22)/1.22),forward=(dx*Math.sin(target.heading)+dz*Math.cos(target.heading))/((target.length||2.25)/2.25);
  const width=forward>.25?.50-(forward-.25)*.5:.50;
  return forward>-.96&&forward<1.04&&Math.abs(right)<width;
}
export class MooringFlood {
  constructor(sites,onEvent=()=>{}){
    this.boats=sites.map((p,i)=>({...p,id:p.id||`marina-${i}`,water:0,sinking:0,resetIn:0,sinks:0,scoreCooldown:0}));this.onEvent=onEvent;
    this.packets=Array.from({length:MOORING_FLOOD.maxPackets},()=>({life:0}));this.cursor=0;this.emission=0;this.serial=0;
    this.cells=new Map();this.reindex();
  }
  reindex(){this.cells.clear();for(const b of this.boats){const key=this.key(b.x,b.z);if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(b);}}
  key(x,z){return `${Math.floor(x/8)}:${Math.floor(z/8)}`;}
  emit(p,litres){const packet=this.packets[this.cursor++%this.packets.length];Object.assign(packet,p,{life:p.lifetime||4.8,litres});}
  clearSpray(){for(const p of this.packets)p.life=0;this.emission=0;}
  get status(){return this.boats.map(b=>({id:b.id,x:b.x,z:b.z,heading:b.heading,water:b.water/MOORING_FLOOD.capacityLitres*100,sinking:b.sinking,resetIn:b.resetIn,sinks:b.sinks}));}
  update(dt,player,time,allowSpray=true){
    for(const b of this.boats){
      b.scoreCooldown=Math.max(0,b.scoreCooldown-dt);
      if(b.resetIn>0){b.resetIn=Math.max(0,b.resetIn-dt);b.sinking=Math.min(1,b.sinking+dt/MOORING_FLOOD.sinkSeconds);if(!b.resetIn){b.water=0;b.sinking=0;}if(b.collider)b.collider.disabled=b.sinking>.35;continue;}
      b.water=Math.max(0,b.water-MOORING_FLOOD.drainLitresPerSecond*dt);
    }
    const nearby=allowSpray&&this.boats.some(b=>!b.resetIn&&Math.hypot(player.x-b.x,player.z-b.z)<65);
    if(nearby){
      this.emission+=dt*MOORING_FLOOD.emissionHz;
      if(this.emission>=1){
        const count=Math.floor(this.emission);this.emission-=count;
        const state=sprayState(player,false,time),discharge=pumpDischarge(player,time),jet=jetPlumeSource(player,discharge,time,state);
        for(let i=0;i<count;i++){
          const fraction=(this.serial++*.61803398875)%1;
          for(const side of [-1,1]){
            const strength=side<0?state.left:state.right;
            if(strength>.18)for(let strand=0;strand<MOORING_FLOOD.fanStrands;strand++)this.emit(launchSpray(player,state,side,()=>(fraction+strand/MOORING_FLOOD.fanStrands)%1),strength*MOORING_FLOOD.sideLitresPerLoad/MOORING_FLOOD.emissionHz/MOORING_FLOOD.fanStrands);
          }
          if(jet)this.emit({x:jet.origin.x,y:jet.origin.y,z:jet.origin.z,vx:jet.velocity.x,vy:jet.velocity.y,vz:jet.velocity.z,diameter:.006,lifetime:4.8},jet.power*MOORING_FLOOD.rearLitresPerPower/MOORING_FLOOD.emissionHz);
        }
      }
    }else this.emission=0;
    for(const p of this.packets){
      if(p.life<=0)continue;const before={x:p.x,y:p.y,z:p.z};p.life-=dt;stepDroplet(p,dt);
      if(this.onPacket?.(before,p)){p.life=0;continue;}
      // Swept crossing of an open gunwale. An underside or nearby splash is
      // not water aboard. Spatial hashing bounds work independently of houses.
      const cx=Math.floor(p.x/8),cz=Math.floor(p.z/8);
      outer:for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const b of this.cells.get(`${cx+dx}:${cz+dz}`)||[]){
        if(b.resetIn)continue;
        const deck=(b.deckY??(waveHeight(b.x,b.z,time)+.46))-b.water/MOORING_FLOOD.capacityLitres*.26;
        if(p.vy<0&&before.y>=deck&&p.y<=deck){
          const crossing=(before.y-deck)/(before.y-p.y),x=before.x+(p.x-before.x)*crossing,z=before.z+(p.z-before.z)*crossing;
          if(!insideTender(x,z,b))continue;
          b.water=Math.min(MOORING_FLOOD.capacityLitres,b.water+p.litres);p.life=0;
          if(b.water>=MOORING_FLOOD.capacityLitres){
            b.resetIn=MOORING_FLOOD.resetSeconds;b.sinks++;
            this.onEvent({type:'moored-sink',boatId:b.id,label:'Tender swamped',detail:'Pontoon tender is sinking. It resets shortly.',points:b.scoreCooldown?0:150});b.scoreCooldown=60;
          }
          break outer;
        }
      }
      if(p.y<waveHeight(p.x,p.z,time)-.1)p.life=0;
    }
  }
}
