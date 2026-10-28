import {isJet,jetTrimPositions} from '../config.js';
// Arcade assistance at the final trim detent only; the nozzle keeps steering.
// This reduces hull yaw, not the hydraulic jet reaction or airborne controls.
export const MAX_TRIM_SPRAY={yawScale:.38,yawDamping:.65,extraSweep:.09,maximumSweep:.56,
 lift:6.5,maximumLift:18,reachScale:1.12,packetScale:1.22};
export function maxTrimSpray(v){
 if(!isJet(v.type)||v.airborne||v.wipeout)return 0;
 const top=jetTrimPositions(v.type).at(-1);
 if((v.trimDegrees??v.trim??0)<top-.01)return 0;
 const actual=(v.drive?.trimAngle||0)*180/Math.PI;
 return Math.max(0,Math.min(1,(actual-(top-3))/3));
}
