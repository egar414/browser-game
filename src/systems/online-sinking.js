// Shared visual timing for local and remote six-second server sinking states.
// Tall cruisers need a deeper descent than a ski to fully submerge their tower.
export function onlineSinkDrop(type,seconds){
 if(!(seconds>0))return 0;
 const depth=type==='cruiser'?12:['racer','dive','rib'].includes(type)?5:3.5;
 return Math.max(0,Math.min(1,(6-seconds)/4))*depth;
}
