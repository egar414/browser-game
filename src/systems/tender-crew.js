import {bodyPoint} from '../vehicles/propulsion.js';
import {tinnySeat} from '../vehicles/tinny-seat.js';
import {VEHICLES} from '../config.js';
export const TENDER_CREW={boardingDistance:8,boardingSpeed:2,exitSpeed:3,teleportDistance:150};
export function crewToken(id){let h=0;for(const ch of String(id||''))h=(Math.imul(h,31)+ch.charCodeAt(0))>>>0;return 2000+h%12000;}
export const isTenderPassenger=p=>p?.type==='tinny'&&p.deck===true&&p.deckX===-2&&p.deckZ===7&&p.trim===40;
export const tenderDriver=p=>p?.type==='tinny'&&p.active&&!isTenderPassenger(p)&&Math.abs(p.roll||0)<1.05&&Math.abs(p.pitch||0)<1.55;
export function crewPassengers(players,driver){
 if(!players.some(p=>p.id===driver&&tenderDriver(p.pose)))return [];
 if(players.filter(p=>tenderDriver(p.pose)&&crewToken(p.id)===crewToken(driver)).length!==1)return [];
 return players.filter(p=>p.id!==driver&&p.pose?.active&&isTenderPassenger(p.pose)&&p.pose.rpm===crewToken(driver)).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,1);
}
export function crewDriver(players,passenger){
 if(!isTenderPassenger(passenger?.pose))return null;
 const matches=players.filter(p=>p.id!==passenger.id&&tenderDriver(p.pose)&&crewToken(p.id)===passenger.pose.rpm);
 if(matches.length!==1||crewPassengers(players,matches[0].id)[0]?.id!==passenger.id)return null;
 return matches[0];
}
export function tenderSeatPoint(p){return bodyPoint({...p,config:VEHICLES.tinny},tinnySeat({...p,config:VEHICLES.tinny}).position);}
export class TenderCrew{
 constructor(onExit=()=>{}){this.onExit=onExit;this.driver=null;this.pose=null;this.message='';}
 get active(){return !!this.driver;}
 nearest(client,v){
 if(!client.room||!client.session||client.failures||v.airborne||v.wipeout||v.speed>3)return null;
 return (client.room.players||[]).filter(p=>p.id!==client.session.user.id&&tenderDriver(p.pose)&&!p.pose.airborne&&p.pose.speed<TENDER_CREW.boardingSpeed&&!(p.combat?.sinking>0)&&Math.hypot(p.pose.x-v.x,p.pose.z-v.z)<TENDER_CREW.boardingDistance&&!crewPassengers(client.room.players,p.id).length&&client.room.players.filter(q=>tenderDriver(q.pose)&&crewToken(q.id)===crewToken(p.id)).length===1).sort((a,b)=>Math.hypot(a.pose.x-v.x,a.pose.z-v.z)-Math.hypot(b.pose.x-v.x,b.pose.z-v.z))[0]||null;
 }
 board(client,v){const p=this.nearest(client,v);if(!p){this.message='Find a stopped online Tender 225 within 8 m, with its passenger seat free';return false;}this.driver=p.id;this.room=client.room.id;this.self=client.session.user.id;this.pose={...p.pose};this.lastSequence=p.seq;this.lastHeartbeat=performance.now();this.message=(p.name||'Your friend')+' drives · J / LEAVE when slow · R recovers';return true;}
 leave(force=false,reason='Back in your own craft'){
 if(!this.active)return false;if(!force&&this.pose?.speed>TENDER_CREW.exitSpeed){this.message='Ask the driver to slow below 11 km/h to leave · R is emergency recovery';return false;}const p=this.pose;this.driver=null;this.pose=null;this.onExit(p,reason);this.message=reason;return true;
 }
 sync(client,v){
 if(!this.active)return;
 const driver=client.room?.players?.find(p=>p.id===this.driver),players=client.room?.players||[];
 if(driver&&driver.seq!==this.lastSequence){this.lastSequence=driver.seq;this.lastHeartbeat=performance.now();}
 const expired=performance.now()-this.lastHeartbeat>12000;
 const claims=players.filter(p=>p.pose?.active&&isTenderPassenger(p.pose)&&p.pose.rpm===crewToken(this.driver)&&p.id!==this.self).map(p=>p.id).concat(this.self).sort();
 if(expired||client.room?.id!==this.room||client.session?.user.id!==this.self||client.failures||!driver||!tenderDriver(driver.pose)||driver.combat?.sinking>0||client.combat?.sinking>0||claims[0]!==this.self||players.filter(p=>tenderDriver(p.pose)&&crewToken(p.id)===crewToken(this.driver)).length!==1){this.leave(true,'Tender ride ended · safely back in your own craft');return;}
 const remote=client.remote?.players.get(this.driver),pose=remote?client.remote.sample(remote,performance.now()):driver.pose;
 if(!pose||!tenderDriver(pose))return;
 if(this.pose&&Math.hypot(pose.x-this.pose.x,pose.z-this.pose.z)>TENDER_CREW.teleportDistance){this.leave(true,'Driver recovered · back in your own craft');return;}
 this.pose={...pose};for(const k of ['x','y','z','heading','pitch','roll','vx','vz','speed','airborne'])v[k]=pose[k];v.throttle=v.steer=0;v.previous=v.snapshot();
 }
 encode(base){if(!this.active||!this.pose)return base;return {...base,...Object.fromEntries(['x','y','z','heading','pitch','roll','vx','vz','speed','passengerAft','riderAft','planing','airborne'].map(k=>[k,this.pose[k]??base[k]])),heading:Math.atan2(Math.sin(this.pose.heading),Math.cos(this.pose.heading)),type:'tinny',colour:this.pose.colour,design:this.pose.design,deck:true,deckX:-2,deckZ:7,deckHeading:0,trim:40,rpm:crewToken(this.driver),throttle:0,steer:0,pose:null,spray:[]};}
 get status(){return {active:this.active,driver:this.driver,pose:this.pose?{...this.pose}:null,message:this.message};}
}
