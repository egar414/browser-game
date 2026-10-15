import {writeFileSync} from 'node:fs';
import {mapData,landAt} from '../src/systems/geography.js';
import {collision} from '../src/systems/environment.js';
const names=['Myambla Canal','Myuna Canal','Mayes Canal','Emerald Waters Canal','Bombala Canal','Paringa Canal','Yangala Anchorage','Mundoora Broadwater'];
const targets=[];
for(const name of names){
 const canal=mapData.channels.find(c=>c.name===name);if(!canal)continue;
 let found;
 for(let i=Math.max(1,Math.floor(canal.points.length/2));i<canal.points.length&&!found;i++){
  const a=canal.points[i-1],b=canal.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  for(const offset of [12,-12,9,-9]){
   const x=(a[0]+b[0])/2+dz/len*offset,z=(a[1]+b[1])/2-dx/len*offset;
   if(!collision(x,z,3)&&targets.every(t=>Math.hypot(t.x-x,t.z-z)>60)){found={name,x:+x.toFixed(1),z:+z.toFixed(1),heading:Math.atan2(-dz/len*offset,dx/len*offset)};break;}
  }
 }
 if(found)targets.push(found);
}
const signs=[];
for(const site of [{name:'The Wharf',x:-220,z:-1080},...targets]){
 let found;
 for(let r=15;r<=90&&!found;r+=5)for(let i=0;i<32;i++){
  const angle=i/32*Math.PI*2,x=site.x+Math.sin(angle)*r,z=site.z+Math.cos(angle)*r;
  if(landAt(x,z)){found={x:+x.toFixed(1),z:+z.toFixed(1),heading:Math.atan2(site.x-x,site.z-z),name:site.name};break;}
 }
 if(found)signs.push(found);
}
writeFileSync(new URL('../src/data/canal-playground.json',import.meta.url),JSON.stringify({provenance:'Original game target/sign placements beside mapped canals; signs are game advisory markers, not surveyed regulatory locations.',targets,signs},null,2)+'\n');
console.log({targets,signs});
