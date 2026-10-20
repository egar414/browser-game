import {boardSpraySources} from './board-spray.js';
import {packSpray} from '../systems/network-spray.js';
import {wrapAngle} from '../systems/network-state.js';
export const SURF_MODES={yacht:1,ski:2,passenger:3,paddle:4,ride:5,wipeout:6};
export const isSurfPose=p=>p?.type==='ski'&&p.deck===true&&p.deckX===2&&p.trim===40&&Object.values(SURF_MODES).includes(Math.abs(p.deckZ));
export const driverToken=id=>{let h=0;for(const ch of String(id||''))h=(Math.imul(h,31)+ch.charCodeAt(0))>>>0;return 2000+h%12000;};
// A reserved combination of existing validated fields keeps old SQL usable.
// Board throttle represents water-contact effort for the legacy spray gate.
// Identity/room membership still comes from Auth; this is presentation/seat state.
export function encodeSurfPose(p,session){const s=session.status,mode=SURF_MODES[s.mode]||1;return {...p,type:'ski',deck:true,deckX:2,deckZ:mode,deckHeading:0,trim:40,design:s.board==='body'?'race':s.board==='gun'?'heritage':'classic',pose:null,rpm:s.mode==='passenger'?driverToken(session.partner):driverToken(session.self),x:s.x,y:s.y,z:s.z,heading:wrapAngle(s.heading),pitch:s.pitch||0,roll:s.roll||0,vx:s.vx||0,vz:s.vz||0,speed:s.speed||0,throttle:s.mode==='ski'?session.ski.throttle:s.mode==='ride'?Math.max(.1,Math.min(1,s.sprayPower||0)):0,steer:s.mode==='ski'?session.ski.steer:s.steer||0,riderAft:s.crouch||0,planing:s.railLoad||0,active:!session.paused,airborne:!!s.airborne,spray:s.mode==='ski'?packSpray(session.ski,session.time,true):boardSpraySources(s)};}
export function decodeSurfPose(p){if(!isSurfPose(p))return null;return{...p,crouch:p.riderAft||0,railLoad:p.planing||0,mode:Object.keys(SURF_MODES).find(k=>SURF_MODES[k]===p.deckZ),board:p.design==='race'?'body':p.design==='heritage'?'gun':'short'};}
