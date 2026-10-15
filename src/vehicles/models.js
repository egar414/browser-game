import * as THREE from 'three';
import { makeRider } from './rider.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const mat = (colour, roughness = 0.5) => new THREE.MeshStandardMaterial({ color: colour, roughness, metalness: 0.08 });
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
    indices.push(a, b, b + 5, a, b + 5, a + 5);
  }
  for (let j = 1; j < 4; j++) { indices.push(0, j + 1, j); const n = (sections.length - 1) * 5; indices.push(n, n + j, n + j + 1); }
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
export function makeVehicle(type, colour) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const accent = new THREE.MeshPhysicalMaterial({color:colour,roughness:.3,metalness:.08,clearcoat:.8,clearcoatRoughness:.24});
  const pale = mat('#e0e9d7'), blue = new THREE.MeshPhysicalMaterial({color:'#344b61',roughness:.24,metalness:.25,clearcoat:.65});
  const silver = new THREE.MeshStandardMaterial({color:'#a8b9bd',roughness:.26,metalness:.8});
  let motor, person, nozzle, propeller, bucket, handlebars;
  if (type === 'ski') {
    hull(body, [[-1.48, 0.42, 0.13, -0.2], [-1.15, 0.59, 0.22, -0.29], [-0.35, 0.62, 0.29, -0.3], [0.6, 0.54, 0.37, -0.22], [1.22, 0.3, 0.34, -0.12], [1.55, 0.025, 0.21, 0.05]], dark);
    hull(body, [[-1.03, 0.47, 0.25, 0.1], [-0.5, 0.49, 0.32, 0.2], [0.43, 0.47, 0.48, 0.23], [1.1, 0.28, 0.4, 0.21], [1.45, 0.02, 0.25, 0.2]], accent);
    // Dark faceted foredeck sits inside bright side shoulders, as in the reference.
    hull(body, [[.12,.27,.52,.37],[.55,.37,.59,.37],[1.02,.24,.48,.31],[1.43,.015,.29,.21]], rubber);
    hull(body, [[-.89,.18,.5,.37],[-.55,.24,.62,.39],[-.03,.2,.59,.4],[.2,.13,.48,.36]], accent);
    for(const side of [-1,1]){
      const cheek=box(body,.16,.045,.62,side*.39,.43,.72,dark);cheek.rotation.y=side*-.24;
      tube(body,[[side*.58,.19,-1.21],[side*.63,.26,-.3],[side*.51,.3,.63],[side*.27,.3,1.22]],.034,rubber,16);
      for(let i=0;i<6;i++)box(body,.17,.008,.018,side*.44,.318,-.85+i*.14,dark);
    }
    for (const side of [-1, 1]) {
      box(body, 0.22, 0.06, 1.3, side * 0.44, 0.28, -0.44, rubber);
      tube(body, [[side * 0.55, 0.26, -1.15], [side * 0.58, 0.3, 0], [side * 0.43, 0.38, 0.73]], 0.025, pale);
      box(body, 0.15, 0.24, 0.17, side * 0.43, 0.37, -1.05, accent);
    }
    tube(body, [[0, 0.4, 0.62], [0, 1.14, 0.45]], 0.055, dark);
    handlebars=new THREE.Group();handlebars.position.set(0,1.14,.45);body.add(handlebars);
    tube(handlebars,[[-.35,0,-.12],[0,0,0],[.35,0,-.12]],.04,silver);
    for(const side of [-1,1]){
      box(handlebars,.18,.07,.08,side*.34,0,-.12,rubber,true);
      const guard=box(handlebars,.29,.15,.08,side*.29,.025,.02,rubber,true);guard.rotation.y=side*.18;
    }
    box(body,.13,.2,.09,0,1.04,.48,rubber,true);
    for(const side of [-1,1]){box(body,.18,.18,.38,side*.43,.35,-1.03,rubber,true);}
    nozzle = new THREE.Group(); nozzle.position.set(0,-.04,-1.5); body.add(nozzle);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 12), dark); jet.rotation.x = Math.PI / 2; jet.position.z=-.05; nozzle.add(jet);
    bucket=new THREE.Group();bucket.position.set(0,.15,-1.56);body.add(bucket);
    const gate=new THREE.Mesh(new THREE.SphereGeometry(.21,14,8,0,Math.PI,0,Math.PI*.55),dark);gate.rotation.x=-Math.PI/2;gate.position.z=-.08;bucket.add(gate);
    for(const side of [-1,1])tube(bucket,[[side*.2,0,.04],[side*.2,-.03,-.12]],.025,dark,4);
    box(body, 0.65, 0.035, 0.3, 0, 0.17, -1.2, rubber);
    label(body, 'RAT', 0.34, 0.16, 0, 0.5, 0.96, 0); // Original mark.
    person = makeRider(body, type);
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
  root.userData = { body, motor, nozzle, propeller, bucket, handlebars, rider: person };
  person.userData.update({riderAft:0,steer:0,surgeAcceleration:0},1,root.userData);
  return root;
}
