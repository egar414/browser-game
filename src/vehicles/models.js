import{makeSled}from'./sled-model.js';
import {makeDiveBoat} from './dive-boats.js';
import {batchRigidAssembly} from './rigid-model.js';
import {isTinny,VEHICLES,PROPULSION} from '../config.js';
import {makeAnglerShell} from './angler-model.js';
import{makeApex}from'./apex-model.js';
import{makeRacingCat}from'./racing-cat.js';
import{makeTinnyPassenger}from'./tinny-passenger.js';
import{makeSportfisher}from'../systems/offshore-view.js';
import{makeDeckCharacter}from'./wardrobe.js';
import * as THREE from 'three';
import {makeSpark} from './spark-model.js';
import {makeStandardSpark} from './standard-spark.js';
import { makeRider } from './rider.js';
import { buildTender } from './tender.js';
import {marineHullGeometry,marineStation,marineSaddleGeometry} from './marine-hull.js';
import {makeAnglerOutboard} from './angler-outboard.js';
import {deckFittings,marineSteel,roundedBlock,gelcoat} from './marine-details.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const mat = (colour, roughness = 0.5) => new THREE.MeshStandardMaterial({ color: colour, roughness, metalness: 0.08 });
// All current craft are generated locally; retain the async readiness interface.
export async function loadCraftAssets(){return {source:'original-procedural-models'};}
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
function hull(parent,sections,material){
  const mesh=new THREE.Mesh(marineHullGeometry(sections,{closedTop:true,stations:32,panelSteps:2}),material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

function label(parent, text, width, height, x, y, z, rotation = 0) {
  if(typeof document==='undefined')return;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e6edec'; ctx.font = 'bold 86px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 66);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z); mesh.rotation.y = rotation; parent.add(mesh);
}
function inflatable(parent,material){
  const sections=[[-1.98,.07,.07,.12],[-1.76,.29,.28,.16],[-1.1,.31,.3,.18],[.55,.31,.3,.2],[1.25,.27,.28,.29],[1.72,.17,.2,.42],[2.07,.008,.015,.55]],vertices=[],uv=[],indices=[],segments=20,N=40;
  for(let j=0;j<=N;j++){const[z,rx,ry,y]=marineStation(sections,j/N);for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;vertices.push(Math.sin(a)*rx,y+Math.cos(a)*ry,z);uv.push(i/segments,j/N*4);}}
  for(let j=0;j<N;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  for(const j of[0,N]){const n=j*(segments+1);for(let i=1;i<segments-1;i++)j===0?indices.push(n,n+i,n+i+1):indices.push(n,n+i+1,n+i);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.name='Continuous shaped racing pontoon';m.castShadow=m.receiveShadow=true;parent.add(m);
}

export function makeVehicle(type, colour, design='classic',access={}) {
  const root=buildVehicle(type,colour,design,access);
  if(type!=='sled')root.userData.waterMaskType=type==='hyper'&&access.creator!==true?'ski':type;
  return root;
}
function buildVehicle(type, colour, design='classic',access={}) {
  if(type==='sled')return makeSled(colour);
  if(VEHICLES[type]?.diveBoat)return makeDiveBoat(type,colour);
  if(type==='ski')return access.creator===true?makeSpark(colour,design):makeStandardSpark(colour,design);
  if(type==='hyper')return access.creator===true?makeApex(colour):makeStandardSpark(colour,design);
  if(type==='racer')return makeRacingCat(colour);
  if(type==='cruiser'){const root=makeSportfisher('Game Fishing Boat',colour,false),rider=makeDeckCharacter();rider.position.set(0,3.25,-.25);root.add(rider);rider.userData.update=(v,dt)=>rider.userData.animate(v.animationTime||0,0,false);root.userData={...root.userData,body:root,rider};return root;}
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const accent = new THREE.MeshPhysicalMaterial({color:colour,roughness:.3,metalness:.08,clearcoat:.8,clearcoatRoughness:.24});
  const pale = mat('#e0e9d7'), blue = new THREE.MeshPhysicalMaterial({color:'#344b61',roughness:.24,metalness:.25,clearcoat:.65});
  const silver = new THREE.MeshStandardMaterial({color:'#a8b9bd',roughness:.26,metalness:.8});
  let motor, person, passenger, nozzle, propeller, bucket, handlebars;
  if(type==='seago') {
    const graphite=gelcoat('#232a2e'),saddle=mat('#454b4e',.85);
    hull(body,[[-1.82,.40,.14,-.23],[-1.55,.58,.25,-.36],[-.8,.66,.32,-.4],[.3,.66,.43,-.34],[1.05,.55,.43,-.24],[1.6,.27,.33,-.10],[1.85,.01,.24,.02]],rubber);
    hull(body,[[-1.65,.40,.34,.18],[-.85,.49,.46,.24],[.15,.55,.55,.31],[.9,.50,.63,.34],[1.55,.28,.43,.24],[1.8,.01,.25,.15]],graphite);
    const seatMesh=new THREE.Mesh(marineSaddleGeometry([[-1.47,.23,.53,.32],[-1.13,.27,.71,.37],[-.48,.23,.73,.38],[.03,.22,.65,.35],[.38,.16,.6,.42]]),saddle);seatMesh.castShadow=seatMesh.receiveShadow=true;body.add(seatMesh);
    hull(body,[[.12,.17,.67,.43],[.53,.32,.85,.43],[.95,.36,.76,.42],[1.45,.17,.49,.31],[1.74,.01,.28,.2]],graphite);
    for(const side of [-1,1]){
      box(body,.24,.06,1.6,side*.5,.32,-.56,rubber,true);
      for(let i=0;i<12;i++)box(body,.2,.014,.03,side*.5,.355,-1.28+i*.115,dark);
      tube(body,[[side*.4,.35,-1.64],[side*.61,.39,-.85],[side*.63,.43,.28],[side*.51,.45,1.04],[side*.25,.34,1.61]],.026,accent,22);
      const shoulder=box(body,.14,.10,.68,side*.42,.64,.63,graphite,true);shoulder.rotation.y=-side*.3;
      for(let i=0;i<3;i++)box(body,.06,.045,.16,side*.44,.64-i*.035,.27+i*.11,rubber,true);
      label(body,'SEA-DOO',.75,.17,side*.675,.3,-.66,side*Math.PI/2);
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
  } else if(isTinny(type)) {
    const tender=type==='angler'?makeAnglerShell(colour,design):buildTender(colour,design,{length:VEHICLES[type].length,width:VEHICLES[type].width,hp:type==='tinny'?25:50,racing:type==='skua'});body.add(tender);({motor,propeller}=tender.userData);
    // Keep the motor attachment in body coordinates for the shared rider IK.
    body.attach(motor);motor.position.fromArray(PROPULSION[type].motorMount);motor.scale.setScalar(type==='tinny'||type==='angler'?1:1.25);person=makeRider(body,type);passenger=makeTinnyPassenger(body,type==='angler'?{floorY:VEHICLES.angler.footHeight}:{});
    if(type==='angler'||type==='tinny')root.userData.referenceHull=tender;
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
    ({motor,propeller}=makeAnglerOutboard({hp:50,propellerPosition:PROPULSION.cat.propeller}));motor.position.fromArray(PROPULSION.cat.motorMount);body.add(motor);
    const steel=marineSteel();deckFittings(body,{width:1.05,length:2.1,y:.39,z:-.05,material:steel});
    for(const side of[-1,1]){
      for(const z of[-1.1,.1,1.05]){const valve=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.018,12),rubber);valve.position.set(side*.73,.492,z);body.add(valve);}
      tube(body,[[side*.73,.50,-1.35],[side*.73,.57,-1.28],[side*.73,.57,-1.03],[side*.73,.50,-.96]],.018,rubber,14);
      roundedBlock(body,.26,.018,.65,side*.37,.32,-.50,rubber,.008);
    }
    label(body, 'AQUARIUS', 0.65, 0.24, 0, 0.81, -1.445, Math.PI);
    person = makeRider(body, type);
  }
  if(design!=='classic'){
    const stripe=mat(design==='race'?'#f2e6c4':'#eea851',.35);
    if(type==='cat')for(const side of [-1,1])tube(body,[[side*.94,.35,-1.5],[side*1.01,.4,0],[side*.92,.52,1.3]],design==='race'?.025:.045,stripe,16);
  }
  root.userData = { ...root.userData,modelRevision:'fleet-craft-2',body, motor, nozzle, propeller, bucket, handlebars, passenger, rider: person };
  person.userData.update({riderAft:0,steer:0,surgeAcceleration:0,config:VEHICLES[type]},1,root.userData);
  if(isTinny(type)||type==='cat'||type==='seago'){for(const part of [person,passenger,motor,nozzle,bucket,handlebars])if(part)part.userData.dynamic=true;if(propeller)propeller.userData.dynamic=true;batchRigidAssembly(body);if(motor)batchRigidAssembly(motor);}
  return root;
}
