import {REEF} from './reef-diving.js';
export const FISHERIES={bagLimit:8,fine:150,noticeRange:90,escapeRange:120,escapeSeconds:12,inspectSeconds:4,chaseSpeed:10.5};
// Local arcade fisheries inspector, independent of the police's road offences.
export class FisheriesPatrol{
 constructor(onFine=()=>{},onMessage=()=>{}){this.onFine=onFine;this.onMessage=onMessage;this.state='patrol';this.clear=0;this.inspection=0;this.cooldown=0;this.phase=0;this.x=REEF.x+75;this.z=REEF.z;this.heading=0;}
 update(dt,player,count,diving,blocked,collision=()=>null){this.cooldown=Math.max(0,this.cooldown-dt);const distance=Math.hypot(player.x-this.x,player.z-this.z),over=count>FISHERIES.bagLimit;
  if(this.state==='patrol'&&over&&!blocked&&!this.cooldown&&distance<FISHERIES.noticeRange){this.state='pursuit';this.clear=0;this.onMessage('Fisheries · over the 8-fish game bag limit! Stop for inspection or escape.');}
  if(this.state==='pursuit'){
   if(!over){this.state='patrol';this.inspection=0;return;}
   this.clear=distance>FISHERIES.escapeRange?this.clear+dt:0;
   if(this.clear>=FISHERIES.escapeSeconds){this.state='patrol';this.cooldown=45;this.inspection=0;this.onMessage('Fisheries escaped · catch retained. Still over the game bag limit.');return;}
   this.inspection=distance<13&&(player.speed<4||diving)?this.inspection+dt:Math.max(0,this.inspection-dt*2);
   if(this.inspection>=FISHERIES.inspectSeconds){this.onFine();this.state='patrol';this.cooldown=35;this.inspection=0;return;}
  }
  this.phase+=dt*.055;const tx=this.state==='pursuit'?player.x+(player.vx||0)*.5:REEF.x+Math.cos(this.phase)*65,tz=this.state==='pursuit'?player.z+(player.vz||0)*.5:REEF.z+Math.sin(this.phase)*65;
  const a=Math.atan2(tx-this.x,tz-this.z),turn=Math.atan2(Math.sin(a-this.heading),Math.cos(a-this.heading));this.heading+=Math.max(-1.0*dt,Math.min(1.0*dt,turn));let speed=this.state==='pursuit'?Math.min(FISHERIES.chaseSpeed,Math.max(2,distance*.65)):3;
  const nx=this.x+Math.sin(this.heading)*speed*dt,nz=this.z+Math.cos(this.heading)*speed*dt;if(!collision(nx,nz,1.4,0)){this.x=nx;this.z=nz;}else this.heading+=dt*1.8;
 }
 get status(){return{state:this.state,bagLimit:FISHERIES.bagLimit,fine:FISHERIES.fine,escapeIn:Math.max(0,FISHERIES.escapeSeconds-this.clear),inspection:this.inspection,position:{x:this.x,z:this.z},cooldown:this.cooldown};}
}
