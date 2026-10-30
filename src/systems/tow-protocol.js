import{VEHICLES}from'../config.js';import{crewToken}from'./tender-crew.js';
export const isTowPose=p=>p?.type==='ski'&&p.deck===true&&p.deckX===-2&&p.deckZ===8&&p.trim===40;
export const canTow=p=>!!p&&!!VEHICLES[p.type]&&p.type!=='sled'&&p.active&&!p.deck&&Math.abs(p.roll||0)<1.05&&Math.abs(p.pitch||0)<1.55&&!(p.deckX===1.75&&p.deckZ===-8);
export const closeTow=(p,closed)=>closed?{...p,deckX:1.75,deckZ:-8}:p;
export function towRiders(players,id){
 const drivers=players.filter(p=>canTow(p.pose)&&crewToken(p.id)===crewToken(id));if(drivers.length!==1||drivers[0].id!==id)return [];
 return players.filter(p=>p.id!==id&&p.pose?.active&&isTowPose(p.pose)&&p.pose.rpm===crewToken(id)).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,1);
}
export function towDriver(players,rider){
 if(!isTowPose(rider?.pose))return null;const drivers=players.filter(p=>p.id!==rider.id&&canTow(p.pose)&&crewToken(p.id)===rider.pose.rpm);
 return drivers.length===1&&towRiders(players,drivers[0].id)[0]?.id===rider.id?drivers[0]:null;
}
export const decodeTow=p=>isTowPose(p)?{...p,active:p.active,mode:'ride',board:p.design==='race'?'body':'wake',crouch:p.riderAft,compression:p.riderAft,sprayPower:p.planing,trim:p.deckHeading}:null;
