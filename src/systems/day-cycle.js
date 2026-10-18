export const DAY_MODES={changing:'Passing day · 24 min cycle',sunrise:'Sunrise · 06:00',day:'Daylight · 12:00',sunset:'Sunset · 18:00',night:'Night · 22:00'};
const wrap=h=>((h%24)+24)%24;
export function fishingConditions(hour){
 const h=wrap(hour),distance=Math.min(Math.abs(h-6),Math.abs(h-18));
 return{prime:distance<1.6,label:distance<1.6?'Prime bite · dawn / dusk':h<5||h>20?'Quiet night bite':'Daytime bite',waitMultiplier:distance<1.6?.58:h<5||h>20?1.4:1,rareBonus:distance<1.6?.06:0};
}
export function dayState(hour){
 const h=wrap(hour),angle=(h-6)/12*Math.PI,elevation=Math.sin(angle),daylight=Math.max(.12,Math.min(1,(elevation+.12)/.65)),warm=Math.max(0,1-Math.abs(elevation)/.38)*(h>4&&h<20?1:0);
 const night=elevation<-.15;
 return{hour:h,label:h<5||h>=20?'NIGHT':h<8?'SUNRISE':h<16.5?'DAYLIGHT':'SUNSET',clock:`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`,daylight,warm,
  horizon:night?'#233958':warm>.25?'#eab386':'#afcbd8',zenith:night?'#101e3d':warm>.25?'#608db7':'#4998d2',fog:night?'#243d58':warm>.25?'#bd9b8e':'#a9c4ce',sunColour:warm>.2?'#ffb16d':'#ffe8c6',sunIntensity:Math.max(0,elevation+.08)*3.4,ambient:.25+daylight*.7,direction:{x:Math.cos(angle),y:elevation,z:-.45},fishing:fishingConditions(h)};
}
export class DayCycle{
 constructor(mode='changing'){this.hour=14.8;this.setMode(mode);}
 setMode(mode){this.mode=DAY_MODES[mode]?mode:'changing';const hours={sunrise:6,day:12,sunset:18,night:22};if(this.mode in hours)this.hour=hours[this.mode];}
 update(dt){if(this.mode==='changing')this.hour=wrap(this.hour+dt/60);}
 get status(){return{...dayState(this.hour),mode:this.mode};}
}
