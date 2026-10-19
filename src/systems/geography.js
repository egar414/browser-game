import mapData from '../data/mooloolaba.json' with {type:'json'};
import {bridgeLayout} from './bridge-layout.js';
export { mapData };
export const lands=mapData.land;
export function pointInPoly(x,z,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function edgeDistance(x,z,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)||0));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
export function landAt(x,z){
  return lands.find(l=>x>=l.bounds[0]&&x<=l.bounds[2]&&z>=l.bounds[1]&&z<=l.bounds[3]&&pointInPoly(x,z,l.points)&&!l.holes?.some(h=>pointInPoly(x,z,h)));
}
export function areaName(x,z){
  if(x>mapData.world.maxX+100)return 'OFFSHORE SPEED RUN';
  for(const p of mapData.pois)if(!p.lighthouse&&Math.hypot(x-p.x,z-p.z)<170)return p.name.toUpperCase();
  if(mapData.coastalExtension&&z<mapData.coastalExtension.previousNorth){const place=mapData.coastalExtension.destinations.reduce((a,b)=>Math.hypot(x-a.x,z-a.z)<Math.hypot(x-b.x,z-b.z)?a:b);return Math.hypot(x-place.x,z-place.z)<1100?place.name.toUpperCase():'SUNSHINE COAST';}
  let nearest=80,name='MOOLOOLAH RIVER';
  for(const c of mapData.channels){if(c.name==='Mooloolah River')continue;for(let i=1;i<c.points.length;i++){const d=edgeDistance(x,z,c.points[i-1],c.points[i]);if(d<nearest){nearest=d;name=c.name.toUpperCase();}}}
  return name;
}
// Keep collision registration available without creating a WebGL scene.
export function geographicSolids(){
  const result=[];
  for(const p of mapData.piers){
    if(p.area)result.push({name:'Jetty / pontoon',points:p.points,bounds:[Math.min(...p.points.map(q=>q[0])),Math.min(...p.points.map(q=>q[1])),Math.max(...p.points.map(q=>q[0])),Math.max(...p.points.map(q=>q[1]))],height:1.4});
    else for(let i=1;i<p.points.length;i++)result.push({name:'Jetty / pontoon',a:p.points[i-1],b:p.points[i],width:2.1,height:1.4});
  }
  for(const bridge of mapData.bridges){
    const plan=bridgeLayout(bridge,landAt);
    for(const [x,z]of plan.supports)result.push({name:'Bridge support',x,z,w:1.2,d:1.2,height:plan.clearance});
    for(const {a,b}of plan.sections)result.push({name:'Bridge deck',a,b,width:plan.width+.8,minY:plan.clearance,height:plan.clearance+plan.thickness});
  }
  for(const wall of mapData.breakwaters||[])for(let i=1;i<wall.points.length;i++)result.push({name:'Entrance rock wall',a:wall.points[i-1],b:wall.points[i],width:3.8,height:3});
  return result;
}
