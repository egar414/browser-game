import{makeApex}from'./apex-model.js';
import{makeRacingCat}from'./racing-cat.js';
import{makeTinnyPassenger}from'./tinny-passenger.js';
import{makeSportfisher}from'../systems/offshore-view.js';
import{makeDeckCharacter}from'./wardrobe.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeRider } from './rider.js';
import { buildTender } from './tender.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const mat = (colour, roughness = 0.5) => new THREE.MeshStandardMaterial({ color: colour, roughness, metalness: 0.08 });
let skiShell=null;
export async function loadCraftAssets(){const gltf=await new GLTFLoader().loadAsync(new URL('../assets/sparkplug.glb',import.meta.url).href);skiShell=gltf.scene;}
const dark = mat('#182b32'), rubber = mat('#101a20', 0.9), skin = mat('#bd8867'), shirt = mat('#eee9d1');
export function box(parent, w, h, d, x, y, z, material, radius = false) {
  const geometry=radius?new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.15):new THREE.BoxGeometry(w,h,d);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function tube(parent, points, radius, material, segments = 20) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 7, false), material);
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
function ellipsoid(parent, radius, x, y, z, sx, sy, sz, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10), material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function hull(parent, sections, material) {
  const verts = [], indices = [];
  for (const [z, width, top, bottom] of sections) {
    for (const [x, y] of [[-width, top], [width, top], [width * 0.72, bottom + 0.05], [0, bottom], [-width * 0.72, bottom + 0.05]]) verts.push(x, y, z);
  }
  for (let s = 0; s < sections.length - 1; s++) for (let j = 0; j < 5; j++) {
    const a = s * 5 + j, b = s * 5 + (j + 1) % 5;
    indices.push(a, b + 5, b, a, a + 5, b + 5);
  }
  for (let j = 1; j < 4; j++) { indices.push(0, j, j + 1); const n = (sections.length - 1) * 5; indices.push(n, n + j + 1, n + j); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(indices); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function label(parent, text, width, height, x, y, z, rotation = 0) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e6edec'; ctx.font = 'bold 86px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 66);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z); mesh.rotation.y = rotation; parent.add(mesh);
}
function inflatable(parent,material){
  // Long racing tube with a continuous taper and an upswept, pointed bow.
  const sections=[[-1.98,.07,.07,.12],[-1.76,.29,.28,.16],[-1.1,.31,.3,.18],[.55,.31,.3,.2],[1.25,.27,.28,.29],[1.72,.17,.2,.42],[2.07,.008,.015,.55]],vertices=[],indices=[],segments=20;
  for(const [z,rx,ry,y] of sections)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;vertices.push(Math.sin(a)*rx,y+Math.cos(a)*ry,z);}
  for(let j=0;j<sections.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;parent.add(m);
}
export function makeVehicle(type, colour, design='classic') {
  if(type==='hyper')return makeApex(colour);
  if(type==='racer')return makeRacingCat(colour);
  if(type==='cruiser'){const root=makeSportfisher('Reef Runner',colour,false),rider=makeDeckCharacter();rider.position.set(0,3.25,-.25);root.add(rider);rider.userData.update=(v,dt)=>rider.userData.animate(v.animationTime||0,0,false);root.userData={body:root,rider};return root;}
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const accent = new THREE.MeshPhysicalMaterial({color:colour,roughness:.3,metalness:.08,clearcoat:.8,clearcoatRoughness:.24});
  const pale = mat('#e0e9d7'), blue = new THREE.MeshPhysicalMaterial({color:'#344b61',roughness:.24,metalness:.25,clearcoat:.65});
  const silver = new THREE.MeshStandardMaterial({color:'#a8b9bd',roughness:.26,metalness:.8});
  let motor, person, passenger, nozzle, propeller, bucket, handlebars;
  if (type === 'ski') {
    // Closed outward-facing V hull, sculpted shoulders and recessed footwells.
    hull(body,[[-1.45,.44,.16,-.18],[-1.18,.57,.24,-.28],[-.55,.61,.3,-.3],[.24,.58,.35,-.26],[.85,.46,.38,-.18],[1.28,.25,.29,-.08],[1.49,.015,.17,.08]],dark);
    hull(body,[[-1.17,.36,.29,.16],[-.72,.39,.34,.22],[.05,.43,.44,.28],[.55,.47,.5,.31],[1.04,.32,.4,.27],[1.4,.02,.22,.18]],accent);
    hull(body,[[.13,.24,.61,.38],[.52,.34,.77,.4],[.91,.29,.62,.34],[1.22,.16,.42,.27],[1.4,.01,.24,.19]],rubber);
    // A raised saddle and distinct pedestal separate the rider from the bow hood.
    hull(body,[[-1.1,.15,.41,.25],[-.83,.23,.58,.27],[-.26,.21,.62,.31],[.19,.14,.55,.35]],rubber);
    box(body,.43,.17,1.08,0,.65,-.48,accent,true);
    ellipsoid(body,1,0,.65,-.91,.2,.09,.17,accent);
    hull(body,[[.01,.17,.66,.54],[.3,.14,.67,.46],[.48,.1,.61,.42]],dark);
    box(body,.19,.045,.13,0,.71,.31,silver,true);
    for(const side of [-1,1]){
      box(body,.22,.055,1.25,side*.44,.285,-.43,rubber);
      for(let i=0;i<9;i++)box(body,.19,.009,.026,side*.44,.318,-.97+i*.12,dark);
      tube(body,[[side*.53,.21,-1.26],[side*.61,.27,-.35],[side*.53,.32,.55],[side*.29,.31,1.15]],.035,rubber,18);
      tube(body,[[side*.32,.37,-.98],[side*.33,.43,-.22],[side*.36,.48,.24]],.024,dark,10);
      const shoulder=box(body,.13,.07,.53,side*.39,.5,.58,accent);shoulder.rotation.y=side*-.24;
      const vent=box(body,.025,.12,.29,side*.34,.51,.24,rubber);vent.rotation.y=side*-.2;
      for(let i=0;i<4;i++)box(body,.03,.018,.025,side*.36,.47+i*.025,.19+i*.025,silver);
      const wedge=box(body,.21,.19,.33,side*.43,.35,-1.06,rubber,true);wedge.rotation.x=.22;
    }
    tube(body,[[0,.56,.51],[0,1.24,.35]],.045,silver,10);
    tube(body,[[0,.6,.5],[0,1.02,.39]],.068,dark,8);
    handlebars=new THREE.Group();handlebars.position.set(0,1.24,.35);body.add(handlebars);
    tube(handlebars,[[-.37,0,-.12],[-.17,.025,-.02],[0,0,0],[.17,.025,-.02],[.37,0,-.12]],.03,dark,12);
    for(const side of [-1,1]){
      box(handlebars,.19,.065,.075,side*.34,0,-.12,rubber,true);
      const guard=box(handlebars,.28,.13,.07,side*.29,.025,.025,rubber,true);guard.rotation.y=side*.2;
    }
    box(body,.68,.04,.3,0,.21,-1.25,rubber);
    tube(body,[[-.15,.29,-1.13],[0,.35,-1.25],[.15,.29,-1.13]],.025,dark,10);
    nozzle = new THREE.Group(); nozzle.position.set(0,-.04,-1.5); body.add(nozzle);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 12), dark); jet.rotation.x = Math.PI / 2; jet.position.z=-.05; nozzle.add(jet);
    bucket=new THREE.Group();bucket.position.set(0,.15,-1.56);body.add(bucket);
    const gate=new THREE.Mesh(new THREE.SphereGeometry(.21,14,8,0,Math.PI,0,Math.PI*.55),dark);gate.rotation.x=-Math.PI/2;gate.position.z=-.08;bucket.add(gate);
    for(const side of [-1,1])tube(bucket,[[side*.2,0,.04],[side*.2,-.03,-.12]],.025,dark,4);
    box(body, 0.65, 0.035, 0.3, 0, 0.17, -1.2, rubber);
    for(const side of [-1,1])label(body,'ER',.23,.105,side*.555,.28,-.08,side*Math.PI/2);
    person = makeRider(body, type);
  } else if(type==='seago') {
    const graphite=new THREE.MeshPhysicalMaterial({color:'#232a2e',roughness:.28,metalness:.18,clearcoat:.8}),saddle=mat('#454b4e',.85);
    hull(body,[[-1.82,.40,.14,-.23],[-1.55,.58,.25,-.36],[-.8,.66,.32,-.4],[.3,.66,.43,-.34],[1.05,.55,.43,-.24],[1.6,.27,.33,-.10],[1.85,.01,.24,.02]],rubber);
    hull(body,[[-1.65,.40,.34,.18],[-.85,.49,.46,.24],[.15,.55,.55,.31],[.9,.50,.63,.34],[1.55,.28,.43,.24],[1.8,.01,.25,.15]],graphite);
    hull(body,[[-1.47,.23,.53,.32],[-1.13,.27,.71,.37],[-.48,.23,.73,.38],[.03,.22,.65,.35],[.38,.16,.6,.42]],saddle);
    hull(body,[[.12,.17,.67,.43],[.53,.32,.85,.43],[.95,.36,.76,.42],[1.45,.17,.49,.31],[1.74,.01,.28,.2]],graphite);
    for(const side of [-1,1]){
      box(body,.24,.06,1.6,side*.5,.32,-.56,rubber,true);
      for(let i=0;i<12;i++)box(body,.2,.014,.03,side*.5,.355,-1.28+i*.115,dark);
      tube(body,[[side*.4,.35,-1.64],[side*.61,.39,-.85],[side*.63,.43,.28],[side*.51,.45,1.04],[side*.25,.34,1.61]],.026,accent,22);
      const shoulder=box(body,.14,.10,.68,side*.42,.64,.63,graphite,true);shoulder.rotation.y=-side*.3;
      for(let i=0;i<3;i++)box(body,.06,.045,.16,side*.44,.64-i*.035,.27+i*.11,rubber,true);
      label(body,'SEAGO',.75,.17,side*.675,.3,-.66,side*Math.PI/2);
      tube(body,[[side*.18,.53,-1.43],[side*.23,.64,-1.33],[side*.25,.57,-1.15]],.035,rubber,8);
    }
    box(body,.89,.06,.38,0,.22,-1.59,rubber,true);box(body,.55,.09,.11,0,.44,-1.51,accent,true);
    tube(body,[[0,.59,.55],[0,1.2,.39]],.06,graphite,8);
    handlebars=new THREE.Group();handlebars.position.set(0,1.2,.39);body.add(handlebars);
    tube(handlebars,[[-.4,0,-.12],[-.19,.02,-.01],[0,.02,.02],[.19,.02,-.01],[.4,0,-.12]],.032,dark,14);
    for(const side of [-1,1])box(handlebars,.19,.075,.085,side*.34,0,-.12,rubber,true);
    box(handlebars,.17,.06,.14,0,.04,.09,rubber,true);box(handlebars,.12,.009,.07,0,.074,.09,blue,true);
    nozzle=new THREE.Group();nozzle.position.set(0,-.06,-1.8);body.add(nozzle);
    const outlet=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,.24,18),dark);outlet.rotation.x=Math.PI/2;outlet.position.z=-.06;nozzle.add(outlet);
    bucket=new THREE.Group();bucket.position.set(0,.1,-1.81);body.add(bucket);box(bucket,.4,.15,.18,0,0,-.09,graphite,true);
    person=makeRider(body,type);
  } else if(type==='tinny') {
    const tender=buildTender(colour,design);body.add(tender);({motor,propeller}=tender.userData);
    // Keep the motor attachment in body coordinates for the shared rider IK.
    body.attach(motor);person=makeRider(body,type);passenger=makeTinnyPassenger(body);
  } else {
    for (const side of [-1, 1]) {
      const x = side * 0.73;
      const pontoon = new THREE.Group(); pontoon.position.x = x; body.add(pontoon);
      inflatable(pontoon,accent);
      tube(pontoon,[[side*.15,.44,-1.65],[side*.18,.46,-.4],[side*.17,.5,.9],[side*.1,.59,1.55]],.05,blue,18);
      tube(pontoon,[[side*.23,-.015,-1.6],[side*.285,-.025,-.3],[side*.27,.015,.85],[side*.14,.27,1.65]],.025,blue,18);
      tube(pontoon, [[0, 0.47, -1.45], [0, 0.52, 0.5], [0, 0.63, 1.6], [0, 0.57, 1.97]], 0.016, pale);
      for (let z = -1.2; z < 1.5; z += 0.58) {
        const seam = new THREE.Mesh(new THREE.TorusGeometry(0.306, 0.004, 4, 24), pale); seam.position.set(0, 0.18, z); seam.scale.y = 1.02; pontoon.add(seam);
        tube(pontoon, [[side * 0.19, 0.44, z], [side * 0.25, 0.55, z + 0.08], [side * 0.19, 0.45, z + 0.17]], 0.017, rubber, 6);
      }
    }
    box(body, 1.05, 0.065, 2.8, 0, 0.28, -0.1, blue);
    box(body, 1.32, 0.49, 0.11, 0, 0.51, -1.38, dark);
    box(body, 1.34, 0.08, 0.16, 0, 0.79, -1.38, accent);
    for (let z = -0.9; z < 1; z += 0.38) box(body, 0.95, 0.025, 0.025, 0, 0.37, z, dark);
    motor = new THREE.Group(); motor.position.set(0.18, 0.4, -1.65); body.add(motor);
    box(motor, 0.48, 0.68, 0.56, 0, 0.42, 0, blue, true);
    ellipsoid(motor, 1, 0, 0.74, 0, 0.24, 0.14, 0.28, blue);
    box(motor, 0.32, 0.05, 0.6, 0, 0.46, 0, silver);
    box(motor, 0.13, 0.8, 0.18, 0, -0.29, 0.02, blue);
    ellipsoid(motor, 1, 0, -0.73, -0.01, 0.1, 0.1, 0.25, blue);
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 3), silver); prop.rotation.x = Math.PI / 2; prop.position.set(0, -0.72, -0.23); propeller=new THREE.Group();propeller.position.copy(prop.position);prop.position.set(0,0,0);propeller.add(prop);motor.add(propeller);
    box(motor, 0.28, 0.035, 0.4, 0, -0.5, -0.05, dark);
    tube(motor, [[0, 0.4, 0.16], [-0.12, 0.45, 0.45], [-0.25, 0.45, 0.65]], 0.035, dark);
    label(motor, '50', 0.35, 0.25, 0, 0.53, -0.29, Math.PI);
    label(motor, '50', 0.35, 0.25, 0.245, 0.53, 0, Math.PI / 2);
    label(body, 'RATS', 0.65, 0.24, 0, 0.81, -1.445, Math.PI);
    person = makeRider(body, type);
  }
  if(type==='ski'&&skiShell){
    for(const child of [...body.children])if(![person,nozzle,bucket,handlebars].includes(child)){
      body.remove(child);child.traverse(o=>o.geometry?.dispose());
    }
    const shell=skiShell.clone(true);
    shell.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();if(o.material.name.startsWith('Accent'))o.material.color.set(colour);o.castShadow=o.receiveShadow=true;}});
    body.add(shell);root.userData.blenderShell=true;
  }
  if(design!=='classic'){
    const stripe=mat(design==='race'?'#f2e6c4':'#eea851',.35);
    if(type==='ski')for(const side of [-1,1])tube(body,[[side*.49,.33,-.83],[side*.51,.39,-.1],[side*.38,.54,.56],[side*.22,.41,1.04]],design==='race'?.018:.032,stripe,16);
    else if(type==='cat')for(const side of [-1,1])tube(body,[[side*.94,.35,-1.5],[side*1.01,.4,0],[side*.92,.52,1.3]],design==='race'?.025:.045,stripe,16);
  }
  root.userData = { blenderShell:type==='ski'&&!!skiShell, body, motor, nozzle, propeller, bucket, handlebars, passenger, rider: person };
  person.userData.update({riderAft:0,steer:0,surgeAcceleration:0},1,root.userData);
  return root;
}
