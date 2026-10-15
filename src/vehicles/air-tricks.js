export const AIR_TRICKS={hangman:{name:'Hangman',points:280},nohander:{name:'No-hander',points:180},superman:{name:'Superman',points:320}};
// One award per pose per jump, banked only by the clean-landing branch.
export class AirTricks {
  constructor(){this.reset();}
  reset(){this.pose='';this.requested='';this.blend=0;this.held=0;this.completed=new Set();}
  update(dt,pose,airborne,height){
    const requested=airborne&&height>.55&&AIR_TRICKS[pose]?pose:'';
    if(requested!==this.requested){this.requested=requested;this.held=0;}
    if(requested)this.pose=requested;
    if(requested){this.held+=dt;if(this.held>=.35)this.completed.add(requested);}
    this.blend+=(Number(!!requested)-this.blend)*(1-Math.exp(-dt*9));
    if(!requested&&this.blend<.01)this.pose='';
  }
  land(clean){const events=clean?[...this.completed].map(id=>({type:'score',label:`${AIR_TRICKS[id].name} · landed`,points:AIR_TRICKS[id].points})):[];this.reset();return events;}
}
