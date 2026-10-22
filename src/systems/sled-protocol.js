// Reserved existing pose fields: current SQL accepts the snowmobile without
// widening permissions or adding an unvalidated craft type to the backend.
export const isSledPose=p=>p?.type==='ski'&&p.deck===true&&p.deckX===-1&&p.deckZ===8&&p.trim===40;
export const encodeSledPose=(p,v)=>({...p,type:'ski',deck:true,deckX:-1,deckZ:8,deckHeading:v.trimDegrees*Math.PI/180,trim:40});
export const decodeSledPose=p=>isSledPose(p)?{...p,type:'sled',deck:false,trim:p.deckHeading*180/Math.PI,trimDegrees:p.deckHeading*180/Math.PI,sledMode:p.planing>.05?'water':'land'}:p;
