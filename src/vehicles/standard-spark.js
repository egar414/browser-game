import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeRider} from './rider.js';
import {batchRigidAssembly} from './rigid-model.js';
const mat=(color,roughness=.5)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.08});
// Original regular Sea-Doo Spark Trixx; the reference-sculpted version is a Creator perk.
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
export function makeStandardSpark(colour='#1679e8',design='classic'){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const dark=mat('#182b32'),rubber=mat('#101a20',.9),silver=mat('#a8b9bd',.26),accent=mat(colour,.4);
 let person,nozzle,bucket,handlebars;
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
    person = makeRider(body, 'ski');
 if(design!=='classic')for(const side of[-1,1])tube(body,[[side*.49,.33,-.83],[side*.51,.39,-.1],[side*.38,.54,.56],[side*.22,.41,1.04]],.018,mat(design==='race'?'#f2e6c4':'#eea851'),16);
 for(const part of[person,nozzle,bucket,handlebars])part.userData.dynamic=true;
 for(const group of[body,handlebars,nozzle,bucket])batchRigidAssembly(group);
 root.userData={body,rider:person,nozzle,bucket,handlebars,detailedModel:false,modelSource:'standard-spark'};
 person.userData.update({riderAft:0,steer:0,surgeAcceleration:0},1,root.userData);return root;
}
