import {VEHICLES} from '../config.js';
// Only a server-verified Creator role unlocks the private development craft.
export function canDriveCraft(type,creator=false){return Object.hasOwn(VEHICLES,type)&&(type!=='hyper'||creator===true);}
export function availableCraft(type,creator=false){return canDriveCraft(type,creator)?type:'ski';}
