import * as THREE from 'three';
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
function rider(parent, type) {
  const root = new THREE.Group(); root.position.set(type === 'cat' ? -0.42 : 0, 0.53, type === 'cat' ? -0.72 : -0.3); parent.add(root);
  const shorts = mat('#203c40'), vest = mat('#d0d8bf');
  ellipsoid(root, 1, 0, 0.74, 0, 0.23, 0.37, 0.16, shirt);
  box(root, 0.46, 0.49, 0.28, 0, 0.76, 0.02, vest, true);
  box(root, 0.49, 0.06, 0.3, 0, 0.68, 0.02, dark);
  ellipsoid(root, 0.17, 0, 1.29, 0.05, 0.9, 1.15, 0.95, skin);
  ellipsoid(root, 0.18, 0, 1.4, 0.05, 1, 0.55, 1, dark);
  box(root, 0.29, 0.035, 0.18, 0, 1.38, 0.2, dark);
  box(root, 0.25, 0.05, 0.08, 0, 1.31, 0.19, rubber);
  for (const side of [-1, 1]) {
    const hip = side * 0.15, knee = side * (type === 'cat' ? 0.34 : 0.37);
    tube(root, [[hip, 0.48, -0.12], [knee, 0.2, 0.27], [knee, -0.24, 0.15]], 0.095, shorts, 10);
    box(root, 0.16, 0.1, 0.28, knee, -0.25, 0.23, dark);
    const hand = type === 'cat' ? [side === 1 ? 0.35 : -0.22, side === 1 ? 0.32 : 0.52, side === 1 ? -0.28 : 0.33] : [side * 0.3, 0.61, 0.63];
    tube(root, [[side * 0.23, 1, 0], [side * 0.37, 0.8, 0.28], hand], 0.06, skin, 10);
    ellipsoid(root, 0.075, ...hand, 1, 1, 1, skin);
  }
  return root;
}
export function makeVehicle(type, colour) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const accent = new THREE.MeshPhysicalMaterial({color:colour,roughness:.3,metalness:.08,clearcoat:.8,clearcoatRoughness:.24});
  const pale = mat('#e0e9d7'), blue = new THREE.MeshPhysicalMaterial({color:'#344b61',roughness:.24,metalness:.25,clearcoat:.65});
  const silver = new THREE.MeshStandardMaterial({color:'#a8b9bd',roughness:.26,metalness:.8});
  let motor, person, nozzle, propeller;
  if (type === 'ski') {
    hull(body, [[-1.48, 0.42, 0.13, -0.2], [-1.15, 0.59, 0.22, -0.29], [-0.35, 0.62, 0.29, -0.3], [0.6, 0.54, 0.37, -0.22], [1.22, 0.3, 0.34, -0.12], [1.55, 0.025, 0.21, 0.05]], dark);
    hull(body, [[-1.03, 0.47, 0.25, 0.1], [-0.5, 0.49, 0.32, 0.2], [0.43, 0.47, 0.48, 0.23], [1.1, 0.28, 0.4, 0.21], [1.45, 0.02, 0.25, 0.2]], accent);
    ellipsoid(body, 1, 0, 0.5, -0.4, 0.24, 0.15, 0.64, rubber);
    for (const side of [-1, 1]) {
      box(body, 0.22, 0.06, 1.3, side * 0.44, 0.28, -0.44, rubber);
      tube(body, [[side * 0.55, 0.26, -1.15], [side * 0.58, 0.3, 0], [side * 0.43, 0.38, 0.73]], 0.025, pale);
      box(body, 0.15, 0.24, 0.17, side * 0.43, 0.37, -1.05, accent);
    }
    tube(body, [[0, 0.4, 0.62], [0, 1.14, 0.45]], 0.055, dark);
    tube(body, [[-0.35, 1.14, 0.33], [0, 1.14, 0.45], [0.35, 1.14, 0.33]], 0.04, silver);
    nozzle = new THREE.Group(); nozzle.position.set(0,-.04,-1.5); body.add(nozzle);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 12), dark); jet.rotation.x = Math.PI / 2; jet.position.z=-.05; nozzle.add(jet);
    box(body, 0.65, 0.035, 0.3, 0, 0.17, -1.2, rubber);
    label(body, 'RAT', 0.34, 0.16, 0, 0.5, 0.96, 0); // Original mark.
    person = rider(body, type);
  } else {
    for (const side of [-1, 1]) {
      const x = side * 0.8;
      const pontoon = new THREE.Group(); pontoon.position.x = x; body.add(pontoon);
      ellipsoid(pontoon, 1, 0, 0.18, -0.08, 0.37, 0.38, 1.8, accent);
      ellipsoid(pontoon, 1, 0, 0.37, 1.43, 0.34, 0.4, 0.72, accent);
      tube(pontoon, [[0, 0.55, -1.45], [0, 0.59, 0.5], [0, 0.73, 1.6], [0, 0.54, 1.97]], 0.016, pale);
      for (let z = -1.2; z < 1.5; z += 0.58) {
        const seam = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.008, 4, 24), dark); seam.position.set(0, 0.18, z); seam.scale.y = 1.02; pontoon.add(seam);
        tube(pontoon, [[side * 0.19, 0.44, z], [side * 0.25, 0.55, z + 0.08], [side * 0.19, 0.45, z + 0.17]], 0.017, rubber, 6);
      }
    }
    box(body, 1.05, 0.09, 2.8, 0, 0.31, -0.1, pale);
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
    person = rider(body, type);
  }
  root.userData = { body, motor, nozzle, propeller, rider: person };
  return root;
}
