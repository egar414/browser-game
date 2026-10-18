// Swept droplet against an upright person's approximate body volume.
export function hitsPerson(a,b,p){
 let enter=0,exit=1;for(const [axis,min,max]of [['x',p.x-.5,p.x+.5],['y',p.y,p.y+1.65],['z',p.z-.5,p.z+.5]]){
  const d=b[axis]-a[axis];if(Math.abs(d)<1e-8){if(a[axis]<min||a[axis]>max)return false;continue;}
  let t0=(min-a[axis])/d,t1=(max-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);exit=Math.min(exit,t1);if(enter>exit)return false;
 }return true;
}
