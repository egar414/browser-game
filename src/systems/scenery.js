import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundMaterial } from './terrain-materials.js';
import { box, tube } from '../vehicles/models.js';
import { mapData, lands, landAt, pointInPoly, edgeDistance } from './geography.js';
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
function shapeOf(area){
  const s=new THREE.Shape(area.points.map(([x,z])=>new THREE.Vector2(x,-z)));
  for(const ring of area.holes||[])s.holes.push(new THREE.Path(ring.map(([x,z])=>new THREE.Vector2(x,-z))));
  return s;
}
function surface(parent,area,y,mat,depth=0){
  const g=depth?new THREE.ExtrudeGeometry(shapeOf(area),{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shapeOf(area));
  g.rotateX(-Math.PI/2);
  if(mat.userData.ground){const p=g.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++)uv.set([p.getX(i)*.14,p.getZ(i)*.14],i*2);g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}
  const m=new THREE.Mesh(g,mat);m.position.y=y-depth;m.receiveShadow=true;parent.add(m);return m;
}
function seeded(seed){let s=seed;return()=>((s=Math.imul(s,1664525)+1013904223|0)>>>0)/4294967296;}
export function buildEstuaryScenery(scene,quality,solids){
  const root=new THREE.Group();scene.add(root);
  const sand=groundMaterial('#f0dbb1','sand'),grass=groundMaterial('#b4bf8d','grass'),park=groundMaterial('#94b47f','grass'),road=material('#737d78');
  const concrete=material('#c3c4b6'),timber=material('#92836c'),navy=material('#263e4f');
  const walls=['#e2e3d7','#c4d3ce','#d3c2ac','#f0e5cf'].map(material),roofs=['#839390','#b39c85','#596f74'].map(material);
  const garden=material('#537d57'),fence=material('#d3d2ba');
  const windows=new THREE.MeshStandardMaterial({color:'#38636e',roughness:.22,metalness:.32});
  for(const land of lands){surface(root,land,.52,sand,2);for(const inset of land.grass)surface(root,inset,.56,grass);}
  for(const p of mapData.parks)surface(root,p,.58,park);
  for(const p of mapData.beaches)surface(root,p,.6,sand);
  const segment=(a,b,w,y,h,mat)=>{const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.1)return;const mesh=box(root,w,h,length,(a[0]+b[0])/2,y,(a[1]+b[1])/2,mat);mesh.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);return mesh;};
  for(const r of mapData.roads)for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],b=r.points[i];if(landAt((a[0]+b[0])/2,(a[1]+b[1])/2))segment(a,b,r.w,.64,.08,road);
  }
  const shorelineDistance=(x,z)=>{
    let d=Infinity;const l=landAt(x,z);if(!l)return 0;
    for(let i=1;i<l.points.length;i++)d=Math.min(d,edgeDistance(x,z,l.points[i-1],l.points[i]));return d;
  };
  // Artist-shaped headland relief, not surveyed elevation data.
  const terrainHeight=(x,z)=>.62+22*Math.exp(-((x-1410)**2+(z+1560)**2)/32000)*THREE.MathUtils.smoothstep(shorelineDistance(x,z),0,28);
  const hillVertices=[],hillUV=[];
  for(let x=1120;x<1540;x+=16)for(let z=-1660;z<-1280;z+=16){
    const ps=[[x,z],[x+16,z],[x,z+16],[x+16,z+16]];
    for(const ids of [[0,2,1],[1,2,3]])if(ids.every(i=>landAt(...ps[i])))for(const i of ids){const [px,pz]=ps[i];hillVertices.push(px,terrainHeight(px,pz),pz);hillUV.push(px*.14,pz*.14);}
  }
  const hill=new THREE.BufferGeometry();hill.setAttribute('position',new THREE.Float32BufferAttribute(hillVertices,3));hill.setAttribute('uv',new THREE.Float32BufferAttribute(hillUV,2));hill.computeVertexNormals();root.add(new THREE.Mesh(hill,grass));
  // Footprints and available levels are geographic data; facade details are original.
  mapData.buildings.forEach((b,index)=>{
    if(!landAt(...b.points[0]))return;
    surface(root,b,.65+b.h,walls[index%4],b.h);
    surface(root,b,.65+b.h+.35,roofs[index%3],.35);
    for(let i=1;i<b.points.length;i++){
      const a=b.points[i-1],c=b.points[i],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz);
      if(len<4)continue;
      const floors=Math.min(12,Math.max(1,Math.round(b.h/3.2)));
      for(let floor=0;floor<floors;floor++){
        const mesh=segment(a,c,.12,2.5+floor*(b.h/floors),1.25,windows);if(mesh){mesh.scale.z=.72;mesh.scale.x=1;}
        if(b.h>11){const ledge=segment(a,c,.65,1.1+floor*(b.h/floors),.16,concrete);if(ledge)ledge.scale.z=.95;}
      }
    }
  });
  for(const p of mapData.piers){
    if(p.area){surface(root,p,1.15,timber,.35);}
    else for(let i=1;i<p.points.length;i++){
      const a=p.points[i-1],b=p.points[i];segment(a,b,2.1,1,.4,timber);
      const len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<=1;t+=Math.min(1,15/len))box(root,.35,2.2,.35,a[0]+(b[0]-a[0])*t,.7,a[1]+(b[1]-a[1])*t,timber);
    }
  }
  // The real bridge alignments, with deliberately enlarged game clearance.
  for(const bridge of mapData.bridges)for(let i=1;i<bridge.points.length;i++){
    const a=bridge.points[i-1],b=bridge.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
    segment(a,b,bridge.w+2,10.1,1,concrete);segment(a,b,bridge.w,10.66,.1,road);
    for(const side of [-1,1]){
      segment([a[0]+nx*side*(bridge.w/2+.65),a[1]+nz*side*(bridge.w/2+.65)],[b[0]+nx*side*(bridge.w/2+.65),b[1]+nz*side*(bridge.w/2+.65)],.22,11.7,.18,concrete);
      for(let t=0;t<=1;t+=Math.min(1,9/len))box(root,.15,1.1,.15,a[0]+dx*t+nx*side*(bridge.w/2+.65),11.2,a[1]+dz*t+nz*side*(bridge.w/2+.65),concrete);
    }
    // Supports are close to the banks, leaving a wide central navigation gap.
    for(const t of [.06,.94]){const x=a[0]+dx*t,z=a[1]+dz*t;box(root,1.4,10,1.4,x,4.8,z,concrete);}
  }
  const random=seeded(2311),trunks=[],crowns=[];
  function coastalHome(x,z,heading,w,d,index){
    const group=new THREE.Group();group.position.set(x,.62,z);group.rotation.y=heading;root.add(group);
    const wall=walls[index%walls.length],roof=roofs[index%roofs.length],h=index%3===0?6.4:4.2;
    box(group,w,h,d,0,h/2,0,wall);box(group,w+.9,.3,d+1,0,h+.12,0,roof);
    if(index%2===0){
      const g=new THREE.BufferGeometry(),a=w*.55,b=d*.56,y=h+.2;
      g.setAttribute('position',new THREE.Float32BufferAttribute([-a,y,-b,a,y,-b,-a,y,b,a,y,b,0,y+2,-b,0,y+2,b],3));g.setIndex([0,2,5,0,5,4,4,5,3,4,3,1,0,4,1,2,3,5]);g.computeVertexNormals();group.add(new THREE.Mesh(g,roof));
    }
    for(let y=2;y<h;y+=3){
      for(let wx=-w/2+2;wx<w/2-1;wx+=3.8)box(group,2.2,1.5,.1,wx,y,d/2+.06,windows);
      box(group,w*.6,1.7,.12,0,y,-d/2-.08,windows);
      box(group,w+.7,.16,2.4,0,y-1.0,d/2+1,concrete);
      box(group,w+.4,.65,.12,0,y-.6,d/2+2.1,fence);
    }
    for(const side of [-1,1]){box(group,.22,2.8,.22,side*w*.45,1.6,d/2+2.1,wall);box(group,.5,.75,d+5,side*(w/2+3),.37,0,garden);}
    box(group,w+1,.2,3,0,3.1,d/2+1.2,wall);
    // A small turquoise pool sits inside the lot, behind its hedge.
    if(index%3===0){box(group,4.4,.2,7,w/2+6,.04,0,concrete);box(group,3.7,.21,6.3,w/2+6,.06,0,windows);}
  }
  // OSM building coverage is incomplete on many residential canal banks. These
  // original houses fill clear waterfront lots; their positions are artistic.
  const homeSites=[];
  for(const land of lands)for(let i=1;i<land.points.length;i++){
    const a=land.points[i-1],b=land.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(len<28)continue;
    for(let t=.5;t<len;t+=39){
      const px=a[0]+(b[0]-a[0])*t/len,pz=a[1]+(b[1]-a[1])*t/len;
      if(pz<-1050||pz>240||px>1140||px<-1120)continue;
      for(const side of [-1,1]){
        const nx=(b[1]-a[1])/len*side,nz=-(b[0]-a[0])/len*side,x=px+nx*25,z=pz+nz*25;
        if(!landAt(x,z)||!landAt(x+nx*10,z+nz*10)||shorelineDistance(x,z)<17)continue;
        if(mapData.parks.some(p=>pointInPoly(x,z,p.points))||mapData.buildings.some(b=>b.points.some(p=>Math.hypot(x-p[0],z-p[1])<25))||homeSites.some(p=>Math.hypot(x-p[0],z-p[1])<35))continue;
        homeSites.push([x,z]);coastalHome(x,z,Math.atan2(-nx,-nz),12+random()*5,12+random()*5,homeSites.length);break;
      }
    }
  }
  const occupied=(x,z)=>homeSites.some(p=>Math.hypot(x-p[0],z-p[1])<16)||mapData.buildings.some(b=>Math.abs(x-b.points[0][0])<45&&Math.abs(z-b.points[0][1])<45&&pointInPoly(x,z,b.points));
  // Trees on mapped parks plus denser natural banks upstream, never in the channel.
  const {minX,maxX,minZ,maxZ}=mapData.world;
  for(let i=0;i<12000*quality.trees;i++){
    const x=minX+random()*(maxX-minX),z=minZ+random()*(maxZ-minZ),l=landAt(x,z);
    if(!l)continue;const inPark=mapData.parks.some(p=>pointInPoly(x,z,p.points));
    if(!(inPark||z>220)||occupied(x,z))continue;
    if(mapData.roads.some(r=>r.points.some((p,i)=>i&&edgeDistance(x,z,r.points[i-1],p)<r.w/2+2)))continue;
    const scale=.65+random()*.9,ground=(x>1120&&z<-1280)?terrainHeight(x,z):.6;trunks.push([x,ground+3*scale,z,scale]);crowns.push([x,ground+6*scale,z,scale]);
  }
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),q=new THREE.Quaternion();
  const trunkGeo=new THREE.CylinderGeometry(.23,.5,6,5),crownGeo=new THREE.IcosahedronGeometry(1,quality.trees>.6?1:0),foliageMat=material('#ffffff');
  const tiles=new Map();
  trunks.forEach((p,i)=>{const key=`${Math.floor(p[0]/250)}:${Math.floor(p[2]/250)}`;if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(i);});
  for(const indices of tiles.values()){
    const tmesh=new THREE.InstancedMesh(trunkGeo,timber,indices.length),cmesh=new THREE.InstancedMesh(crownGeo,foliageMat,indices.length);
    indices.forEach((i,j)=>{let p=trunks[i];position.set(p[0],p[1],p[2]);scale.setScalar(p[3]);matrix.compose(position,q,scale);tmesh.setMatrixAt(j,matrix);
      p=crowns[i];position.set(p[0],p[1],p[2]);scale.set(3.9*p[3],2.9*p[3],3.7*p[3]);matrix.compose(position,q,scale);cmesh.setMatrixAt(j,matrix);cmesh.setColorAt(j,new THREE.Color(['#426c51','#63835d','#537756'][i%3]));});
    tmesh.computeBoundingSphere();cmesh.computeBoundingSphere();root.add(tmesh,cmesh);
  }
  function palm(x,z,size=1){
    const base=(x>1120&&z<-1280)?terrainHeight(x,z):.6;
    tube(root,[[x,base,z],[x+.5*size,base+5*size,z],[x+size,base+8.5*size,z]],.19*size,timber,6);
    for(let j=0;j<7;j++){
      const angle=j*Math.PI*2/7,v=[],indices=[];
      for(let i=0;i<=8;i++){
        const t=i/8,w=Math.sin(t*Math.PI)*.45*size,px=x+(1+Math.sin(angle)*t*4.8)*size,pz=z+Math.cos(angle)*t*4.8*size,py=base+(8.5+Math.sin(t*Math.PI)-t*t*2.2)*size;
        for(const side of [-1,1])v.push(px+Math.cos(angle)*w*side,py,pz-Math.sin(angle)*w*side);
        if(i<8){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(indices);g.computeVertexNormals();const m=garden.clone();m.side=THREE.DoubleSide;root.add(new THREE.Mesh(g,m));
    }
  }
  // Original palms decorate the real shoreline, without changing its geometry.
  for(const land of lands)for(let i=0;i<land.grass.length;i++){
    const ring=land.grass[i].points;
    for(let j=0;j<ring.length;j+=5){const [x,z]=ring[j];if(z<100&&!occupied(x,z)&&random()>.25)palm(x,z,.8+random()*.4);}
  }
  // Low branching mangrove crowns and exposed prop roots follow upstream banks.
  for(const land of lands)for(let i=1;i<land.points.length;i++){
    const a=land.points[i-1],b=land.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(len<12)continue;
    for(let d=4;d<len;d+=12/quality.trees){
      const x=a[0]+(b[0]-a[0])*d/len,z=a[1]+(b[1]-a[1])*d/len;if(z<180||z>1800)continue;
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.2,.3,2.4,5),timber);trunk.position.set(x,1.5,z);root.add(trunk);
      for(let j=0;j<(quality.trees>.6?4:2);j++){const angle=j*Math.PI/2; tube(root,[[x+Math.sin(angle)*1.5,-.05,z+Math.cos(angle)*1.5],[x+Math.sin(angle)*.7,1.0,z+Math.cos(angle)*.7],[x,2,z]],.065,timber,4);}
      for(let j=0;j<3;j++){const c=new THREE.Mesh(new THREE.IcosahedronGeometry(1,quality.trees>.6?1:0),garden);c.position.set(x+(j-1)*1.8,3.4+(j%2)*.5,z+(j%2)*1.5);c.scale.set(2.8,1.8,2.5);root.add(c);}
    }
  }
  // Simple original moored cruisers at mapped marina fingers.
  for(const p of mapData.piers){
    if(p.area||random()>.32)continue;
    const a=p.points[0],b=p.points.at(-1),len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<8||len>80)continue;
    const x=(a[0]+b[0])/2+(b[1]-a[1])/len*6,z=(a[1]+b[1])/2-(b[0]-a[0])/len*6;
    if(landAt(x,z)||Math.hypot(x-mapData.spawn.x,z-mapData.spawn.z)<90||mapData.race.some(g=>Math.hypot(x-g[0],z-g[1])<22))continue;
    const boat=new THREE.Group();boat.position.set(x,0,z);boat.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);root.add(boat);
    const hull=new THREE.Mesh(new THREE.CapsuleGeometry(1.25,4.5,3,8),walls[0]);hull.rotation.x=Math.PI/2;hull.scale.z=.5;hull.position.y=.3;boat.add(hull);
    box(boat,1.85,1.4,3,0,1.2,-.4,walls[0],true);box(boat,1.9,.5,2.4,0,1.8,-.3,windows,true);box(boat,2.15,.15,3.1,0,2.13,-.4,navy);
    solids.push({name:'Moored boat',x,z,w:3,d:7,height:3});
  }
  function sign(text,x,y,z,width){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#254d51';ctx.fillRect(0,0,512,96);ctx.fillStyle='#f4e8cb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 36px sans-serif';ctx.fillText(text,256,48,490);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width*96/512),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));m.position.set(x,y,z);root.add(m);
  }
  for(const p of mapData.pois){
    if(p.lighthouse){
      const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.7,27,5),walls[0]);tower.position.set(p.x,terrainHeight(p.x,p.z)+13.5,p.z);root.add(tower);
      for(const [y,r,h,mat] of [[26,3.9,.4,navy],[27.4,2.7,2.5,windows],[28.8,3.4,.5,walls[0]]]){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),mat);m.position.set(p.x,terrainHeight(p.x,p.z)+y-.6,p.z);root.add(m);}
    }else if(p.name.includes('Wharf')||p.name.includes('Marina'))sign(p.name.toUpperCase(),p.x,7,p.z,30);
  }
  for(const r of mapData.ramps){
    const g=new THREE.BufferGeometry(),w=r.width/2,l=r.length/2;
    g.setAttribute('position',new THREE.Float32BufferAttribute([-w,0,-l,w,0,-l,w,r.height,l,-w,r.height,l,-w,0,l,w,0,l],3));g.setIndex([0,3,2,0,2,1,3,4,5,3,5,2,0,4,3,1,2,5]);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material('#dba749'));mesh.position.set(r.x,.08,r.z);root.add(mesh);
    for(const side of [-1,1]){const rail=box(root,.16,.16,r.length,r.x+side*w,r.height/2+.3,r.z,walls[0]);rail.rotation.x=Math.atan2(r.height,r.length);}
  }
  // Merge compatible static meshes. Instanced foliage remains separate.
  root.updateMatrixWorld(true);const batches=new Map(),originals=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material))return;
    const m=mesh.material;
    let g=mesh.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(mesh.matrixWorld);g.computeBoundingSphere();
    const sphere=g.boundingSphere,tile=sphere.radius<150?`${Math.floor(sphere.center.x/400)}:${Math.floor(sphere.center.z/400)}`:'large';
    const key=[tile,m.type,m.color?.getHex(),m.roughness,m.metalness,m.map?.uuid,m.side].join(':');
    if(!batches.has(key))batches.set(key,{material:m,geometries:[]});
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    batches.get(key).geometries.push(g);originals.push(mesh);
  });
  for(const {material:mat,geometries} of batches.values()){
    const g=mergeGeometries(geometries,false);if(!g)throw new Error('Scenery batching failed');const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;root.add(m);geometries.forEach(g=>g.dispose());
  }
  for(const m of originals){m.removeFromParent();m.geometry.dispose();}
  return root;
}
