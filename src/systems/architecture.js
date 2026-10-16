import * as THREE from 'three';
import { box } from '../vehicles/models.js';
import { edgeDistance } from './geography.js';
// Keep the mapped horizontal footprint; roof/facade details remain original.
export function buildingFrame(points){
 const ring=points.slice(0,-1),cx=ring.reduce((s,p)=>s+p[0],0)/ring.length,cz=ring.reduce((s,p)=>s+p[1],0)/ring.length;
 let length=0,angle=0,area=0;
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);area+=a[0]*b[1]-b[0]*a[1];if(d>length){length=d;angle=Math.atan2(b[1]-a[1],b[0]-a[0]);}}
 const c=Math.cos(angle),s=Math.sin(angle),local=ring.map(([x,z])=>[(x-cx)*c+(z-cz)*s,-(x-cx)*s+(z-cz)*c]);
 const minX=Math.min(...local.map(p=>p[0])),maxX=Math.max(...local.map(p=>p[0])),minZ=Math.min(...local.map(p=>p[1])),maxZ=Math.max(...local.map(p=>p[1]));
 return {cx,cz,c,s,w:maxX-minX,d:maxZ-minZ,area:Math.abs(area/2),rectangular:ring.length===4&&Math.abs(Math.abs(area/2)-(maxX-minX)*(maxZ-minZ))<2,
  point:(x,z)=>[cx+(x+(minX+maxX)/2)*c-(z+(minZ+maxZ)/2)*s,cz+(x+(minX+maxX)/2)*s+(z+(minZ+maxZ)/2)*c]};
}
let roofMaps;
export function roofMaterial(colour){
 if(roofMaps)return new THREE.MeshStandardMaterial({color:colour,...roofMaps,normalScale:new THREE.Vector2(.26,.26),roughness:.62,metalness:.18});
 const n=128,data=new Uint8Array(n*n*4),normals=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,rib=Math.sin(x/8*Math.PI*2),speck=Math.sin(x*127.1+y*311.7)*.5+.5,v=215+rib*14+speck*10;data.set([v,v,v,255],i);normals.set([128+Math.cos(x/8*Math.PI*2)*35,128,249,255],i);}
 const texture=arr=>{const t=new THREE.DataTexture(arr,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;};
 const map=texture(data);map.colorSpace=THREE.SRGBColorSpace;
 roofMaps={map,normalMap:texture(normals)};return new THREE.MeshStandardMaterial({color:colour,...roofMaps,normalScale:new THREE.Vector2(.26,.26),roughness:.62,metalness:.18});
}
let facadeMaterial;
export function facadeWindowMaterial(){if(facadeMaterial)return facadeMaterial;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#142e35';ctx.fillRect(0,0,128,128);ctx.fillStyle='#aebdb6';ctx.fillRect(5,5,118,118);ctx.fillStyle='#274b59';ctx.fillRect(11,11,106,106);
 const gradient=ctx.createLinearGradient(0,0,128,128);gradient.addColorStop(0,'#7d9a9b');gradient.addColorStop(.45,'#38616d');gradient.addColorStop(1,'#1c3842');ctx.fillStyle=gradient;ctx.fillRect(13,13,102,102);
 ctx.fillStyle='#385058';ctx.fillRect(15,21,99,3);ctx.fillRect(15,29,99,2);ctx.fillRect(15,37,99,2);ctx.fillStyle='#adbbb2';ctx.fillRect(61,9,6,110);ctx.fillRect(9,111,110,6);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 facadeMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',map,roughness:.34,metalness:.18,side:THREE.DoubleSide});
 return facadeMaterial;
}
export function buildMappedBuildings(root,buildings,roads,surface,segment,m){
 let detailWindows=0;
 const roadEdges=roads.flatMap(r=>r.points.slice(1).map((b,i)=>{const a=r.points[i];return{a,b,minX:Math.min(a[0],b[0]),maxX:Math.max(a[0],b[0]),minZ:Math.min(a[1],b[1]),maxZ:Math.max(a[1],b[1])};}));
 const facadeGlass=facadeWindowMaterial();
 const windowGeometry=new THREE.PlaneGeometry(1,1);
 const glass=m.windows,frame=m.fence,shadow=new THREE.MeshStandardMaterial({color:'#172e33',roughness:.74}),solar=new THREE.MeshStandardMaterial({color:'#173744',roughness:.17,metalness:.65});
 buildings.forEach((b,index)=>{
  const f=buildingFrame(b.points),wall=m.walls[index%m.walls.length],roof=m.roofs[index%m.roofs.length],base=(m.heightAt?.(f.cx,f.cz)||.62)+.03,top=base+b.h;
  const shell=surface(root,b,top,wall,b.h);shell.userData.facade={base,top};
  const centre=f.point(0,0);m.contacts?.push({x:centre[0],z:centre[1],w:f.w,d:f.d,y:base-.03,heading:-Math.atan2(f.s,f.c)});
  const low=b.h<9&&f.area<700,domestic=low&&!['school','retail','commercial','roof','shed','garage'].includes(b.kind);
  const pitched=low&&f.rectangular&&b.roofShape!=='flat'&&(b.roofShape||index%4!==0);
  if(pitched){
   const w=f.w/2+.45,d=f.d/2+.45,rise=Math.min(2.7,Math.min(f.w,f.d)*.24),vertices=[],uv=[];
   const point=(x,y,z)=>{const p=f.point(x,z);return[p[0],y,p[1]];};
   const add=(a,b,c)=>{const v=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a)));if(v.y<0)[b,c]=[c,b];for(const p of[a,b,c]){vertices.push(...p);uv.push(p[0]*.32,p[2]*.32);}};
   const a=point(-w,top,-d),bb=point(w,top,-d),c=point(w,top,d),dd=point(-w,top,d);
   const hip=b.roofShape==='hipped'||b.roofShape==='pyramidal'||index%3===0;
   const r1=point(hip?-w*.55:-w,top+rise,0),r2=point(hip?w*.55:w,top+rise,0);
   add(a,bb,r2);add(a,r2,r1);add(dd,r1,r2);add(dd,r2,c);add(a,r1,dd);add(bb,c,r2);
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();root.add(new THREE.Mesh(g,roof));
   for(let j=0;j<b.points.length-1;j++)segment(b.points[j],b.points[j+1],.18,top,.22,frame);
   if(index%3===0&&f.w>9&&f.d>7){
    const p=f.point(0,d*.48),panel=box(root,Math.min(5,w),.09,2.2,p[0],top+rise*.52+.12,p[1],solar);panel.rotation.y=-Math.atan2(f.s,f.c);panel.rotation.x=-Math.atan2(rise,d);
   }
  }else{
   surface(root,b,top+.22,roof,.22);
   for(let j=0;j<b.points.length-1;j++)segment(b.points[j],b.points[j+1],.18,top+.35,.4,wall);
   if(f.w>6&&f.d>6){const p=f.point(0,0);box(root,1.3,.7,1,p[0],top+.6,p[1],frame);}
  }
  const floors=Math.max(1,Math.min(15,Math.round(b.h/3.1))),floorHeight=b.h/floors;
  let front=0,nearest=Infinity;
  const reach=Math.max(f.w,f.d)+85,nearRoads=roadEdges.filter(r=>r.minX<f.cx+reach&&r.maxX>f.cx-reach&&r.minZ<f.cz+reach&&r.maxZ>f.cz-reach);
  for(let j=0;j<b.points.length-1;j++){const a=b.points[j],c=b.points[j+1],x=(a[0]+c[0])/2,z=(a[1]+c[1])/2;for(const r of nearRoads){const distance=edgeDistance(x,z,r.a,r.b);if(distance<nearest){nearest=distance;front=j;}}}
  for(let j=0;j<b.points.length-1;j++){
   const a=b.points[j],c=b.points[j+1],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz);if(len<3)continue;
   let nx=dz/len,nz=-dx/len;if(nx*((a[0]+c[0])/2-f.cx)+nz*((a[1]+c[1])/2-f.cz)<0){nx=-nx;nz=-nz;}
   const span=(center,width,offset)=>{const t=center/len,h=width/len/2;return[[a[0]+dx*(t-h)+nx*offset,a[1]+dz*(t-h)+nz*offset],[a[0]+dx*(t+h)+nx*offset,a[1]+dz*(t+h)+nz*offset]];};
   const count=Math.max(1,Math.min(10,Math.floor(len/(low?3.6:4.2))));
   for(let floor=0;floor<floors;floor++)for(let k=0;k<count;k++){
    const center=(k+.5)*len/count,width=Math.min(low?1.65:2.5,len/count*.65),y=base+floor*floorHeight+floorHeight*.57,wh=Math.min(1.65,floorHeight*.55);
    const t=center/len,x=a[0]+dx*t+nx*.09,z=a[1]+dz*t+nz*.09;
    const pane=new THREE.Mesh(windowGeometry.clone(),facadeGlass);pane.position.set(x,y,z);pane.rotation.y=Math.atan2(nx,nz);pane.scale.set(width+.18,wh+.18,1);root.add(pane);
    if(domestic&&floor===0){const [a4,c4]=span(center,width+.35,0);segment(a4,c4,.55,y+wh/2+.2,.12,frame);}
    detailWindows++;
   }
   if(b.h>9){for(let floor=1;floor<floors;floor++){const [aa,cc]=span(len/2,len*.95,.1);segment(aa,cc,.65,base+floor*floorHeight,.17,m.concrete);}}
   if(domestic&&j===front){
    const [aa,cc]=span(len*.33,1.1,.16);segment(aa,cc,.15,base+1.1,2.2,shadow);
    const [a2,c2]=span(len*.33,1.35,.4);segment(a2,c2,1.5,base+2.5,.14,frame);
    if(len>10){const [ag,cg]=span(len*.74,3,.10);segment(ag,cg,.16,base+1.15,2.25,frame);for(let n=0;n<5;n++)segment(ag,cg,.18,base+.3+n*.38,.025,m.roofs[(index+1)%m.roofs.length]);}
   }
  }
 });
 windowGeometry.dispose();
 return {mappedBuildings:buildings.length,windows:detailWindows};
}
