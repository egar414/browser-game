import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, tube, makeVehicle } from '../vehicles/models.js';
export const lands = [
  { name: 'Mooloolaba waterfront', points: [[-640,-610],[-185,-610],[-185,135],[-245,155],[-360,95],[-640,185]], city: true },
  { name:'Minyama north canal island',points:[[-57,-420],[32,-420],[40,-410],[40,-330],[30,-320],[-55,-320],[-65,-330],[-65,-410]] },
  { name:'Minyama south canal island',points:[[-55,-275],[30,-275],[40,-265],[40,-90],[30,-80],[-55,-80],[-65,-90],[-65,-265]] },
  { name: 'Minyama canal bank', points: [[-65,-610],[250,-610],[250,-530],[-65,-530]] },
  { name: 'Kawana canal island', points: [[145,-420],[250,-420],[250,-330],[145,-330]] },
  { name: 'Kawana residential island', points: [[145,-220],[250,-220],[250,-80],[145,-80]] },
  { name: 'Mangrove point', points: [[360,-610],[640,-610],[640,-430],[490,-430],[455,-330],[365,-330],[365,-170],[330,-95],[365,-10],[320,55],[355,115],[305,95],[295,15],[290,-100],[320,-190],[320,-330]] },
  { name: 'Mangrove east', points: [[550,-350],[640,-400],[640,100],[490,110],[440,45],[475,-40],[435,-125],[480,-220],[470,-290]] },
  { name: 'Sandbar island', points: [[-25,305],[20,285],[105,305],[130,345],[95,395],[15,400],[-35,355]], sand: true },
  { name:'Mooloolaba Spit',points:[[-245,125],[-185,135],[-180,205],[-215,300],[-250,430],[-345,420],[-355,385],[-285,275]],sand:true },
  { name: 'Mooloolaba beach', points: [[-640,400],[-400,380],[-280,460],[-210,610],[-250,740],[-640,740]], sand: true },
  { name: 'Point Cartwright headland', points: [[470,295],[640,220],[640,740],[535,740],[510,510],[425,405]], sand: true },
];
export const ramps = [{ x: 165, z: 240, width: 13, length: 17, height: 3.4 }, { x: 245, z: 300, width: 12, length: 20, height: 4.6 }];
export const solids = [];
export function pointInPoly(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function edgeDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
export function collision(x, z, radius = 1, y = 0) {
  for (const land of lands) if (pointInPoly(x, z, land.points) || land.points.some((p, i) => edgeDistance(x, z, p, land.points[(i + 1) % land.points.length]) < radius)) return land.name;
  for (const s of solids) if (y < s.height && Math.abs(x - s.x) < s.w / 2 + radius && Math.abs(z - s.z) < s.d / 2 + radius) return s.name;
  return null;
}
const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
function landMesh(land, inset = 0, y = 0.48, colour = '#d1c190') {
  const cx = land.points.reduce((s, p) => s + p[0], 0) / land.points.length, cz = land.points.reduce((s, p) => s + p[1], 0) / land.points.length;
  const points = land.points.map(p => [p[0] + (cx - p[0]) * inset, p[1] + (cz - p[1]) * inset]);
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], -p[1])));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material(colour)); mesh.position.y = y - 1.8; mesh.receiveShadow = true; return mesh;
}
function seeded(seed) { let s = seed; return () => ((s = Math.imul(s, 1664525) + 1013904223 | 0) >>> 0) / 4294967296; }
export function buildEnvironment(scene, quality) {
  const root = new THREE.Group(); scene.add(root); solids.length = 0;
  const sand = material('#d8c79c'), concrete = material('#b9b6a3'), timber = material('#876a48'), road = material('#627473');
  const leaves = [material('#456f53'), material('#557e58'), material('#6b8d61')];
  for (const land of lands) {
    root.add(landMesh(land));
    if (!land.sand) root.add(landMesh(land, 0.075, 0.63, land.city ? '#99a386' : '#819574'));
  }
  const random = seeded(54);
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 7, 6), canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkPositions = [], leafPositions = [];
  for (let i = 0; i < 1250 * quality.trees; i++) {
    const x = -610 + random() * 1220, z = -590 + random() * 1180;
    const land = lands.find(l => pointInPoly(x, z, l.points));
    if (!land || land.city || land.name === 'Minyama canal bank' || (land.name.includes('island') && !land.sand)) continue;
    if (Math.abs(x) < 40 && z > 300) continue;
    const scale = 0.7 + random() * 0.9;
    trunkPositions.push([x, 3 * scale, z, scale]);
    leafPositions.push([x, 6.3 * scale, z, scale]);
    leafPositions.push([x+2*scale, 5.7*scale, z+.8*scale, scale*.68]);
    leafPositions.push([x-1.7*scale, 5.9*scale, z-1.1*scale, scale*.72]);
  }
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion();
  const trunks = new THREE.InstancedMesh(trunkGeo, timber, trunkPositions.length);
  const foliage = new THREE.InstancedMesh(canopyGeo, material('#ffffff'), leafPositions.length);
  trunkPositions.forEach((p, i) => { position.set(...p.slice(0,3)); scale.setScalar(p[3]); matrix.compose(position, quaternion, scale); trunks.setMatrixAt(i, matrix); });
  leafPositions.forEach((p, i) => { position.set(...p.slice(0,3)); scale.set(3.5*p[3], 2.6*p[3], 3.4*p[3]); matrix.compose(position, quaternion, scale); foliage.setMatrixAt(i, matrix); foliage.setColorAt(i, new THREE.Color(['#52755b','#6b835b','#3f6754'][i%3])); });
  root.add(trunks, foliage);
  function palm(x, z, size = 1) {
    tube(root, [[x,0.5,z],[x+size,5*size,z],[x+1.5*size,9*size,z]], 0.23*size, timber, 8);
    for (let j = 0; j < 8; j++) {
      const angle = j * Math.PI / 4,positions=[],indices=[];
      for(let i=0;i<=10;i++){
        const t=i/10,width=Math.pow(Math.sin(t*Math.PI),.65)*.48*size;
        const cx=x+(1.5+Math.sin(angle)*t*5)*size,cz=z+Math.cos(angle)*t*5*size;
        const cy=(9+Math.sin(t*Math.PI)*.9-t*t*2.4)*size;
        for(const side of [-1,1])positions.push(cx+Math.cos(angle)*width*side,cy-Math.abs(width)*.12,cz-Math.sin(angle)*width*side);
        if(i<10){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const leafMaterial=leaves[j%3];leafMaterial.side=THREE.DoubleSide;
      const frond=new THREE.Mesh(g,leafMaterial);frond.castShadow=true;root.add(frond);
    }
  }
  function home(x, z, w, d, h, index, tower = false) {
    const walls = material(['#e9e4d3','#cbd2c4','#d1b19b','#adc6c3'][index%4]);
    box(root,w,h,d,x,h/2+0.65,z,walls);
    box(root,w+1.6,0.6,d+1.6,x,h+0.8,z,material(tower?'#566969':['#657c79','#e4c19a','#727b76'][index%3]));
    const windows = new THREE.MeshStandardMaterial({color:'#315c69',roughness:.16,metalness:.46});
    for (let floor = 0; floor < h-2; floor += 3.3) {
      for (let wx=-w/2+2; wx<w/2-1; wx+=4.5) box(root,2,1.5,0.09,x+wx,2.5+floor,z+d/2+0.06,windows);
      for (let wz=-d/2+2; wz<d/2-1; wz+=4.5) box(root,0.09,1.5,2,x+w/2+0.06,2.5+floor,z+wz,windows);
      if(tower){
        box(root,2.5,.2,d+1.2,x+w/2+1.1,1.2+floor,z,concrete);
        box(root,.12,.8,d+.9,x+w/2+2.3,1.72+floor,z,walls);
      }
    }
    if (!tower) {
      // Pitched coastal roofs and shaded verandas break up the old flat boxes.
      const roof=new THREE.BufferGeometry(),rw=w*.56,rd=d*.56,base=h+1.0;
      roof.setAttribute('position',new THREE.Float32BufferAttribute([x-rw,base,z-rd,x+rw,base,z-rd,x-rw,base,z+rd,x+rw,base,z+rd,x,base+2.8,z-rd,x,base+2.8,z+rd],3));
      roof.setIndex([0,2,5,0,5,4,4,5,3,4,3,1,0,4,1,2,3,5]);roof.computeVertexNormals();
      root.add(new THREE.Mesh(roof,material(['#7c8b8d','#b68c70','#637a7b'][index%3])));
      box(root,w+3,0.15,5,x,0.9,z+d/2+2,concrete);
      for(const side of [-1,1])box(root,.28,2.8,.28,x+side*w*.48,2.3,z+d/2+3.8,walls);
      box(root,w+2,.15,4.5,x,3.75,z+d/2+2.1,walls);palm(x-w*.7,z+2,.85);
    }
  }
  // Waterfront town, with a continuous esplanade and road behind it.
  box(root, 8,0.1,600,-204,0.75,-170,concrete);
  box(root, 12,0.1,610,-246,0.75,-170,road);
  for (let z=-455, i=0; z<100; z+=48,i++) {
    home(-224,z,22,24,5.5,i);
    if (i%2 === 0) home(-285,z+8,22,24,14+i*2,i+1,true);
    palm(-198,z+16,1.2);
  }
  // Houses and small private jetties on the canal islands.
  for (const [x,z,i] of [[-12,-365,0],[-12,-255,1],[-12,-165,2],[192,-375,3],[192,-165,4],[50,-565,5],[180,-565,6]]) home(x,z,24,30,5.5,i);
  function solidBox(w,h,d,x,y,z,mat,name='Jetty') { box(root,w,h,d,x,y,z,mat); solids.push({x,z,w,d,height:y+h/2,name}); }
  for (const z of [-355,-270,-155]) { solidBox(23,0.45,3,-75,1,z,timber); for (const x of [-85,-67]) solidBox(0.4,2.6,0.4,x,0.7,z,timber); }
  // Marina berths only along the western bank, leaving the main passage clear.
  solidBox(36,0.5,4,-166,1,34,timber,'Marina pontoon');
  for (const z of [14,54,84]) {
    solidBox(25,0.5,3,-171,1,z,timber,'Marina pontoon');
    const boat = makeVehicle('cat',['#e7ce8d','#91bfc1','#d39379'][Math.floor(z/25)%3]); boat.position.set(-160,0.2,z+7); boat.rotation.y = Math.PI/2; root.add(boat);
    solids.push({x:-160,z:z+7,w:5,d:3,height:3,name:'Moored boat'});
  }
  // A compact interpretation of The Wharf and Mooloolaba Spit, with the
  // marina opening onto the broad river. This is not a surveyed street map.
  for(let i=0;i<4;i++){
    home(-226,158+i*22,18,17,4.2,i);
    box(root,7,.4,21,-207,1,158+i*22,timber);
  }
  function placeSign(text,x,y,z,width){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const c=canvas.getContext('2d');c.fillStyle='#214b51';c.fillRect(0,0,512,96);c.fillStyle='#f3e9ce';c.font='bold 42px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,48);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width*96/512),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=Math.PI/2;root.add(m);
  }
  placeSign('MOOLOOLABA WHARF',-205,5.7,171,25);
  // Boat ramp and launch hut.
  const ramp = box(root,18,0.4,17,-188,0.35,112,concrete); ramp.rotation.z = -0.05;
  home(-220,127,17,13,4,0);
  function bridge(x1,x2,z) {
    box(root,x2-x1,0.9,12,(x1+x2)/2,9.2,z,concrete);
    box(root,x2-x1,0.12,8,(x1+x2)/2,9.75,z,road);
    for (const side of [-1,1]) {
      box(root,x2-x1,0.16,0.2,(x1+x2)/2,11,z+side*5.7,concrete);
      for (let x=x1; x<=x2; x+=9) box(root,0.12,1.3,0.12,x,10.4,z+side*5.7,concrete);
    }
    for (const x of [x1+13,x2-13]) solidBox(2.5,10,5,x,4,z,concrete,'Bridge pier');
  }
  bridge(-215,-40,-235); bridge(25,160,-145);
  // Floating wedge ramps. Their upper surface also drives the physical launch.
  for (const r of ramps) {
    const g = new THREE.BufferGeometry(); const w=r.width/2,l=r.length/2;
    g.setAttribute('position',new THREE.Float32BufferAttribute([-w,0,-l,w,0,-l,w,r.height,l,-w,r.height,l,-w,0,l,w,0,l],3));
    g.setIndex([0,3,2,0,2,1,3,4,5,3,5,2,0,4,3,1,2,5]);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,material('#ddab45'));mesh.position.set(r.x,0.08,r.z);root.add(mesh);
    for(const side of [-1,1]) { const rail=box(root,0.15,0.15,r.length,r.x+side*w, r.height/2+0.3,r.z,material('#fff1c7'));rail.rotation.x=Math.atan2(r.height,r.length); }
  }
  // Channel and river-mouth buoys.
  for (const [x,z] of [[-97,160],[320,160],[-90,245],[380,245],[165,205],[245,260],[220,470],[370,470]]) {
    const buoy = new THREE.Mesh(new THREE.ConeGeometry(0.9,1.5,8),material(x>200?'#d26a4b':'#a5c7a0'));buoy.position.set(x,0.75,z);root.add(buoy);
  }
  // Modern concrete lighthouse silhouette inspired by Point Cartwright.
  const lighthouse=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.6,26,5),material('#e1e5d9'));lighthouse.position.set(505,13.4,350);root.add(lighthouse);
  for(const [y,r,h,colour] of [[5,3.7,3,'#4e8984'],[9,3.5,2,'#6d9a9a'],[25,3.7,.5,'#455e61'],[26.5,2.6,2.5,'#345d62'],[28,3.2,.5,'#e3e8dc']]){
    const part=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),material(colour));part.position.set(505,y,350);root.add(part);
  }
  placeSign('POINT CARTWRIGHT',480,3.6,325,22);
  // Static scenery is batched by material; hundreds of windows and tree roots
  // should not become hundreds of draw calls on an ordinary laptop.
  root.updateMatrixWorld(true);
  const batches=new Map(),originals=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material))return;
    const m=mesh.material,key=[m.type,m.color?.getHex(),m.roughness,m.metalness,m.map?.uuid,m.transparent,m.side].join(':');
    if(!batches.has(key))batches.set(key,{material:m,geometries:[]});
    let geometry=mesh.geometry.clone();if(geometry.index)geometry=geometry.toNonIndexed();
    geometry.applyMatrix4(mesh.matrixWorld);
    // Every built-in source geometry has position/normal/uv. Custom hulls
    // have no uv; fill it so compatible material batches remain mergeable.
    if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
    batches.get(key).geometries.push(geometry);originals.push(mesh);
  });
  for(const {material:mat,geometries} of batches.values()){
    const geometry=mergeGeometries(geometries,false);if(!geometry)throw new Error('Scenery batching failed');
    const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);geometries.forEach(g=>g.dispose());
  }
  for(const mesh of originals){mesh.removeFromParent();mesh.geometry.dispose();}
  return root;
}
