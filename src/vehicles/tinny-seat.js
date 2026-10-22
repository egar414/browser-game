// Shared local seat transform for the original NPC and online passenger.
export function tinnySeat(v,aft=v.passengerAft??.35){return{
 position:[.24-(v.steer||0)*.025-(v.roll||0)*.10,-.24,(.35-aft*(.93+Math.max(0,(v.pitch||0)-.7)*.15))*((v.config?.length||2.25)/2.25)],
 rotation:[Math.max(0,v.pitch||0)*.53,0,-(v.steer||0)*.10-(v.roll||0)*.35]};}
