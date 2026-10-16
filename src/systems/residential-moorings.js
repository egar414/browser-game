import {mapData,lands,landAt,pointInPoly,edgeDistance,geographicSolids} from './geography.js';
import {BAR_ROUTE} from './bar-guide.js';
import playground from '../data/canal-playground.json' with {type:'json'};

const lines=(items,predicate)=>items.some(c=>c.points.some((p,i)=>i&&predicate(c.points[i-1],p,c)));
function blocked(x,z,r,solids){
  if(landAt(x,z))return true;
  for(const l of lands)if(x>l.bounds[0]-r&&x<l.bounds[2]+r&&z>l.bounds[1]-r&&z<l.bounds[3]+r)
    for(const ring of [l.points,...(l.holes||[])])if(ring.some((a,i)=>edgeDistance(x,z,a,ring[(i+1)%ring.length])<r))return true;
  return solids.some(s=>s.points?(pointInPoly(x,z,s.points)||s.points.some((a,i)=>edgeDistance(x,z,a,s.points[(i+1)%s.points.length])<r)):s.a?edgeDistance(x,z,s.a,s.b)<r+s.width/2:Math.abs(x-s.x)<r+s.w/2&&Math.abs(z-s.z)<r+s.d/2);
}
function reserved(x,z,r){
  const w=mapData.world;
  return x<w.minX+35+r||x>w.maxX-35-r||z<w.minZ+35+r||z>w.maxZ-35-r||
    Math.hypot(x-mapData.spawn.x,z-mapData.spawn.z)<40||
    [...playground.targets,...playground.signs].some(p=>Math.hypot(x-p.x,z-p.z)<r+3)||
    lines(mapData.channels,(a,b)=>edgeDistance(x,z,a,b)<r+6)||
    lines([{points:mapData.race},{points:BAR_ROUTE}],(a,b)=>edgeDistance(x,z,a,b)<r+7)||
    lines(mapData.bridges,(a,b,c)=>edgeDistance(x,z,a,b)<r+c.w/2+3);
}
export function pontoonApproach(boats,type,collision){
  const runUp=type==='ski'?18:24,offset=6;
  for(const b of boats.filter(b=>b.normal))for(const direction of [1,-1]){
    const heading=b.heading+(direction<0?Math.PI:0),x=b.x+b.normal[0]*offset-Math.sin(heading)*runUp,z=b.z+b.normal[1]*offset-Math.cos(heading)*runUp;
    if(Array.from({length:13},(_,i)=>i*2).every(d=>!collision(x+Math.sin(heading)*d,z+Math.cos(heading)*d,3)))return {x,z,heading};
  }
  return null;
}
export function mappedResidentialHomes(){
  return mapData.buildings.flatMap(b=>{
    const points=b.points.slice(0,-1),x=points.reduce((s,p)=>s+p[0],0)/points.length,z=points.reduce((s,p)=>s+p[1],0)/points.length;
    return b.h<12&&mapData.residential.some(r=>pointInPoly(x,z,r.points))?[{x,z,id:`mapped-${b.id}`}]:[];
  });
}
// Attach short pontoons to eligible waterfront lots, keeping the central routes
// and mapped bridge gaps clear. Inland homes deliberately receive no water dock.
export function planResidentialMoorings(homes){
  const result=[],solids=geographicSolids();
  for(const [index,home]of homes.entries()){
    const x=home.x??home[0],z=home.z??home[1],land=landAt(x,z);if(!land)continue;
    const candidates=[];
    for(const ring of [land.points,...(land.holes||[])])for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1)continue;
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length**2)),sx=a[0]+t*dx,sz=a[1]+t*dz,distance=Math.hypot(x-sx,z-sz);
      if(distance>58||distance<5)continue;
      for(const side of [-1,1]){
        const nx=dz/length*side,nz=-dx/length*side;
        if(!landAt(sx-nx*2,sz-nz*2)||landAt(sx+nx*3,sz+nz*3))continue;
        candidates.push({sx,sz,nx,nz,tx:dx/length,tz:dz/length,distance});
      }
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    for(const c of candidates){
      const dock={x:c.sx+c.nx*4.2,z:c.sz+c.nz*4.2},boat={x:c.sx+c.nx*7.1,z:c.sz+c.nz*7.1};
      if(blocked(dock.x,dock.z,3.4,solids)||blocked(boat.x,boat.z,1.6,solids)||reserved(dock.x,dock.z,3.4)||reserved(boat.x,boat.z,1.6))continue;
      if(result.some(p=>Math.hypot(p.x-boat.x,p.z-boat.z)<10))continue;
      result.push({...boat,id:home.id||`home-${index}`,heading:Math.atan2(c.tx,c.tz),shore:[c.sx-c.nx,c.sz-c.nz],dock,normal:[c.nx,c.nz]});break;
    }
  }
  return result;
}
