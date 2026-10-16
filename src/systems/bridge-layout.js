// Mapped horizontal alignments and widths; vertical clearances are explicit
// game estimates. Shared plans keep rendered piers and collision in agreement.
export function bridgeLayout(bridge,landAt,roads=[]){
 const walking=['cycleway','footway'].includes(bridge.kind),thickness=walking?.45:.8;
 const clearance=(bridge.gameDeckTop??((walking?4.8:bridge.kind==='residential'?5.2:7.2)+thickness))-thickness,sections=[],lengths=[0];
 for(let i=1;i<bridge.points.length;i++){
  const a=bridge.points[i-1],b=bridge.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length>.05){sections.push({a,b,length});lengths.push(lengths.at(-1)+length);}
 }
 const length=lengths.at(-1),at=d=>{
  let i=0;while(i<sections.length-1&&d>lengths[i+1])i++;
  const s=sections[i],t=Math.max(0,Math.min(1,(d-lengths[i])/s.length));return[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t];
 };
 if(!sections.length)return{sections:[],supports:[],approaches:[],clearance,thickness,width:bridge.w};
 const runs=[];let run=null;for(let d=0;d<=length;d+=1){
  if(!landAt(...at(d))){if(!run){run=[d,d];runs.push(run);}run[1]=d;}else run=null;
 }
 // End supports sit beside the actual banks, rather than at every OSM way
 // vertex. The channel centre remains open even when a mapped span is curved.
 const crossings=runs.filter(([a,b])=>b-a>6),supportDistances=crossings.flatMap(([a,b])=>[Math.max(0,a-1.4),Math.min(length,b+1.4)]);
 const supports=supportDistances.map(at),approaches=[];
 for(const end of [0,1]){
  const p=end?sections.at(-1).b:sections[0].a,neighbour=end?at(Math.max(0,length-2)):at(Math.min(length,2));
  let current=p,direction=[p[0]-neighbour[0],p[1]-neighbour[1]],distance=0;const points=[p],used=new Set();
  const rampLength=Math.max(36,(clearance+thickness-.7)*8);
  // Follow connected mapped road vertices, retaining their bends. Unconnected
  // endpoints get no invented approach across a garden or waterway.
  while(distance<rampLength){
   let best=null;
   for(const [ri,r]of roads.entries())for(let i=1;i<r.points.length;i++)for(const reverse of [false,true]){
    const a=r.points[reverse?i:i-1],b=r.points[reverse?i-1:i],key=`${ri}:${i}`;
    if(used.has(key)||Math.hypot(a[0]-current[0],a[1]-current[1])>1.5)continue;
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.1)continue;
    const score=(dx*direction[0]+dz*direction[1])/(len*Math.hypot(...direction));
    if(score>.2&&(!best||score>best.score))best={b,dx,dz,len,score,key};
   }
   if(!best)break;used.add(best.key);
   const step=Math.min(best.len,rampLength-distance),t=step/best.len;
   current=[current[0]+best.dx*t,current[1]+best.dz*t];points.push(current);distance+=step;direction=[best.dx,best.dz];
   if(t<1)break;
  }
  if(points.length>1&&distance>3){
   let travelled=0;for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),top=clearance+thickness;
    approaches.push({a,b,ya:top+(.7-top)*travelled/distance,yb:top+(.7-top)*(travelled+len)/distance});travelled+=len;
   }
  }
 }
 return {sections,supports,approaches,passages:crossings.map(([a,b])=>at((a+b)/2)),clearance,thickness,width:bridge.w,walking,length};
}
