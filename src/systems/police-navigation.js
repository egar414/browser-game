import {mapData,edgeDistance} from './geography.js';
import {RACE,SPAWN} from '../config.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const CANAL_SPEED_LIMIT=35/3.6;
export function policeSpeedLimit(p){
 if(Math.hypot(p.x-SPAWN.x,p.z-SPAWN.z)<200)return 6; // gameplay no-wake zone
 for(const c of mapData.channels)if(c.name!=='Mooloolah River')for(let i=1;i<c.points.length;i++)if(edgeDistance(p.x,p.z,c.points[i-1],c.points[i])<42)return CANAL_SPEED_LIMIT;
 return Infinity;
}
// A small graph follows mapped channel centrelines. Edges are admitted only
// when the full passage is clear, including bridge height for a patrol RIB.
export class PoliceNavigation{
 constructor(collision){
  this.world=collision;this.nodes=[];const cells=new Map(),key=(x,z)=>`${Math.floor(x/90)}:${Math.floor(z/90)}`;
  const add=(x,z)=>{if(collision(x,z,2.5,2.7))return;const k=key(x,z),near=cells.get(k)||[];if(near.some(i=>distance(this.nodes[i],{x,z})<12))return;const id=this.nodes.length;this.nodes.push({id,x,z,links:[]});near.push(id);cells.set(k,near);};
  const lines=[...mapData.channels.map(c=>c.points),[...RACE,RACE[0]],[[1040.2,-1423.8],[960,-1480],[900,-1540],[820,-1610],[900,-1800],[1600,-2200],[2100,-2600],[2600,-2600]],[[1600,-2200],[1000,-2400],[500,-2900],[200,-3500],[-500,-4200]]];
  for(const line of lines)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/48);for(let j=0;j<=n;j++)add(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n);}
  for(const a of this.nodes){const cx=Math.floor(a.x/90),cz=Math.floor(a.z/90);for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)for(const id of cells.get(`${cx+x}:${cz+z}`)||[]){const b=this.nodes[id],d=distance(a,b);if(id<=a.id||d>78||!this.clear(a,b))continue;a.links.push({id,d});b.links.push({id:a.id,d});}}
  let component=0;for(const root of this.nodes)if(root.component===undefined){const todo=[root];root.component=component;while(todo.length){const node=todo.pop();for(const e of node.links){const next=this.nodes[e.id];if(next.component===undefined){next.component=component;todo.push(next);}}}component++;}
 }
 clear(a,b,ignore){const n=Math.max(1,Math.ceil(distance(a,b)/9));for(let i=1;i<=n;i++){const t=i/n;if(this.world(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,2.2,2.7,ignore))return false;}return true;}
 nearest(p){let best=null,d=Infinity;for(const n of this.nodes){if(!n.links.length)continue;const delta=distance(n,p);if(delta<d){d=delta;best=n;}}return best;}
 route(from,to){
  const a=this.nearest(from),b=this.nearest(to);if(!a||!b)return[];
  const scores=new Map([[a.id,0]]),prev=new Map(),open=new Set([a.id]);
  while(open.size){let id,score=Infinity;for(const candidate of open){const n=scores.get(candidate)+distance(this.nodes[candidate],b);if(n<score){id=candidate;score=n;}}open.delete(id);if(id===b.id){const path=[b];while(prev.has(path[0].id))path.unshift(this.nodes[prev.get(path[0].id)]);return path;}
   for(const e of this.nodes[id].links){const d=scores.get(id)+e.d;if(d<(scores.get(e.id)??Infinity)){scores.set(e.id,d);prev.set(e.id,id);open.add(e.id);}}
  }return[];
 }
}
