// A discrete model marker on the existing 3.7 m Skua wire envelope. It uses
// inactive deck coordinates, so existing authenticated databases need no SQL
// migration. Older clients render the compatible Skua; updated clients render
// the reference Angler. Never interpret a deck/tow/passenger role as this boat.
export function isAnglerPose(p){return !!p&&['skua','tinny'].includes(p.type)&&p.deck===false&&p.deckX===1.5&&p.deckZ===6.5;}
export function encodeAnglerPose(p){return p?.type==='angler'?{...p,type:'skua',deck:false,deckX:1.5,deckZ:6.5}:p;}
export function decodeAnglerPose(p){return isAnglerPose(p)?{...p,type:'angler'}:p;}
