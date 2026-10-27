import {isTinny,PROPULSION} from '../config.js';

// Approximate gameplay masses, not a manufacturer's loading certification.
// Static trim follows the aft weight moment / waterplane restoring moment.
export const TINNY_LOADING={
 tinny:{hullMass:45,motorMass:58,driverMass:78,passengerMass:72},
 dinghy:{hullMass:42,motorMass:85,driverMass:78,passengerMass:72},
 skua:{hullMass:95,motorMass:85,driverMass:78,passengerMass:72},
 angler:{hullMass:72,motorMass:58,driverMass:78,passengerMass:72},
};
export function tinnyRestTrim(v){
 if(!isTinny(v.type))return{pitch:0,roll:0};
 const c=v.config,load={...TINNY_LOADING[v.type],...c.loading,...v.loading},L=c.length,B=c.width,mount=PROPULSION[v.type].motorMount,aft=v.passengerAft??.35;
 const passengerZ=L*(.20-.50*aft),moment=-(load.motorMass*mount[2]+load.hullMass*(-.02*L)+load.driverMass*(-.27*L)+load.passengerMass*passengerZ);
 const pitchStiffness=1000*B*L**3/12*.45,rollStiffness=1000*L*B**3/12*.5;
 return{pitch:Math.max(-.12,Math.min(.35,Math.atan2(moment,pitchStiffness))),roll:Math.max(-.12,Math.min(.12,-Math.atan2(load.motorMass*mount[0]+load.driverMass*.035,rollStiffness))),motorMass:load.motorMass,aftMoment:moment};
}
