import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, tube, makeVehicle } from '../vehicles/models.js';
export const lands = [
  { name: 'Pelican waterfront', points: [[-640,-610],[-185,-610],[-185,135],[-245,155],[-360,95],[-640,185]], city: true },
  { name: 'Canal gardens', points: [[-65,-420],[40,-420],[40,-80],[-65,-80]] },
  { name: 'North shore', points: [[-65,-610],[250,-610],[250,-530],[-65,-530]] },
  { name: 'Hibiscus island', points: [[145,-420],[250,-420],[250,-330],[145,-330]] },
  { name: 'Banksia island', points: [[145,-220],[250,-220],[250,-80],[145,-80]] },
  { name: 'Mangrove point', points: [[360,-610],[640,-610],[640,-430],[490,-430],[455,-330],[365,-330],[365,-170],[330,-95],[365,-10],[320,55],[355,115],[305,95],[295,15],[290,-100],[320,-190],[320,-330]] },
  { name: 'Mangrove east', points: [[550,-350],[640,-400],[640,100],[490,110],[440,45],[475,-40],[435,-125],[480,-220],[470,-290]] },
  { name: 'Sandbar island', points: [[-25,305],[20,285],[105,305],[130,345],[95,395],[15,400],[-35,355]], sand: true },
  { name: 'South beach', points: [[-640,400],[-400,380],[-280,460],[-210,610],[-250,740],[-640,740]], sand: true },
  { name: 'Ocean headland', points: [[470,295],[640,220],[640,740],[535,740],[510,510],[425,405]], sand: true },
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
    if (!land || land.city || land.name === 'North shore' || (land.name.includes('island') && !land.sand)) continue;
    if (Math.abs(x) < 40 && z > 300) continue;
    const scale = 0.7 + random() * 0.9;
    trunkPositions.push([x, 3 * scale, z, scale]); leafPositions.push([x, 6 * scale, z, scale]);
  }
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion();
  const trunks = new THREE.InstancedMesh(trunkGeo, timber, trunkPositions.length);
  const foliage = new THREE.InstancedMesh(canopyGeo, leaves[0], leafPositions.length);
  trunkPositions.forEach((p, i) => { position.set(...p.slice(0,3)); scale.setScalar(p[3]); matrix.compose(position, quaternion, scale); trunks.setMatrixAt(i, matrix); });
  leafPositions.forEach((p, i) => { position.set(...p.slice(0,3)); scale.set(3.5*p[3], 2.6*p[3], 3.4*p[3]); matrix.compose(position, quaternion, scale); foliage.setMatrixAt(i, matrix); foliage.setColorAt(i, new THREE.Color(['#527757','#69825b','#456850'][i%3])); });
  root.add(trunks, foliage);
  function palm(x, z, size = 1) {
    tube(root, [[x,0.5,z],[x+size,5*size,z],[x+1.5*size,9*size,z]], 0.23*size, timber, 8);
    for (let j = 0; j < 6; j++) {
      const angle = j * Math.PI / 3;
      tube(root, [[x+1.5*size,9*size,z], [x+(1.5+Math.sin(angle)*2.8)*size,9.4*size,z+Math.cos(angle)*2.8*size], [x+(1.5+Math.sin(angle)*4.6)*size,7.9*size,z+Math.cos(angle)*4.6*size]], 0.35*size, leaves[j%3], 5);
    }
  }
  function home(x, z, w, d, h, index, tower = false) {
    const walls = material(['#e9e4d3','#cbd2c4','#d1b19b','#adc6c3'][index%4]);
    box(root,w,h,d,x,h/2+0.65,z,walls);
    box(root,w+1.6,0.6,d+1.6,x,h+0.8,z,material(tower?'#566969':['#657c79','#e4c19a','#727b76'][index%3]));
    const windows = material('#567f85');
    for (let floor = 0; floor < h-2; floor += 3.3) {
      for (let wx=-w/2+2; wx<w/2-1; wx+=4.5) box(root,2,1.5,0.09,x+wx,2.5+floor,z+d/2+0.06,windows);
      for (let wz=-d/2+2; wz<d/2-1; wz+=4.5) box(root,0.09,1.5,2,x+w/2+0.06,2.5+floor,z+wz,windows);
    }
    if (!tower) { box(root,w+3,0.15,5,x,0.9,z+d/2+2,concrete); palm(x-w*0.7,z+2,0.85); }
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
  for (const [x,z,i] of [[-12,-365,0],[-12,-285,1],[-12,-165,2],[192,-375,3],[192,-165,4],[50,-565,5],[180,-565,6]]) home(x,z,24,30,5.5,i);
  function solidBox(w,h,d,x,y,z,mat,name='Jetty') { box(root,w,h,d,x,y,z,mat); solids.push({x,z,w,d,height:y+h/2,name}); }
  for (const z of [-355,-270,-155]) { solidBox(23,0.45,3,-75,1,z,timber); for (const x of [-85,-67]) solidBox(0.4,2.6,0.4,x,0.7,z,timber); }
  // Marina berths only along the western bank, leaving the main passage clear.
  solidBox(36,0.5,4,-166,1,34,timber,'Marina pontoon');
  for (const z of [14,54,84]) {
    solidBox(25,0.5,3,-171,1,z,timber,'Marina pontoon');
    const boat = makeVehicle('cat',['#e7ce8d','#91bfc1','#d39379'][Math.floor(z/25)%3]); boat.position.set(-160,0.2,z+7); boat.rotation.y = Math.PI/2; root.add(boat);
    solids.push({x:-160,z:z+7,w:5,d:3,height:3,name:'Moored boat'});
  }
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
  // Lighthouse gives the ocean entrance a recognisable silhouette.
  const lighthouse = new THREE.Mesh(new THREE.CylinderGeometry(2.5,3.4,24,14), material('#f2e6cb')); lighthouse.position.set(505,12,350);root.add(lighthouse);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(4,3,14),material('#cd6d4b'));cap.position.set(505,26,350);root.add(cap);
  box(root,5,3,5,505,23,350,material('#496c70'));
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
