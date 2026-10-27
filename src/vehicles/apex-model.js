import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {marineHullGeometry,marineSaddleGeometry} from './marine-hull.js';
import { makeRider } from './rider.js';

// Original performance-PWC bodywork, shaped from the user's side-profile reference.
// Bow is +Z. The champagne hull, red shoulders and raised tail are separate surfaces.
export function makeApex(colour='#b9b49b') {
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const shell=new THREE.MeshPhysicalMaterial({color:colour,metalness:.24,roughness:.29,clearcoat:.85});
  const red=new THREE.MeshPhysicalMaterial({color:'#dc3b21',metalness:.12,roughness:.29,clearcoat:.8});
  const black=new THREE.MeshPhysicalMaterial({color:'#172125',metalness:.13,roughness:.34,clearcoat:.55});
  const rubber=new THREE.MeshStandardMaterial({color:'#111719',roughness:.9});
  const seat=new THREE.MeshStandardMaterial({color:'#30383a',roughness:.86});
  const metal=new THREE.MeshStandardMaterial({color:'#bac7c9',metalness:.85,roughness:.25});
  const screen=new THREE.MeshStandardMaterial({color:'#25576a',metalness:.35,roughness:.18,emissive:'#102a35',emissiveIntensity:.35});
  const add=(g,m,x=0,y=0,z=0,parent=body)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  const box=(w,h,d,x,y,z,m,parent=body)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.16),m,x,y,z,parent);
  const tube=(points,r,m,parent=body,n=16)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),n,r,6,false),m,0,0,0,parent);
  const shape=(sections,m)=>add(marineHullGeometry(sections,{closedTop:true,stations:32,panelSteps:2,rise:.03}),m);

  shape([[-1.79,.43,.16,-.22],[-1.55,.60,.25,-.34],[-.8,.65,.30,-.38],[.32,.64,.36,-.34],[1.02,.52,.39,-.23],[1.6,.27,.29,-.08],[1.83,.008,.18,.02]],shell);
  shape([[-1.72,.44,.32,.18],[-1.08,.53,.38,.23],[-.32,.55,.44,.27],[.53,.54,.49,.31],[1.2,.38,.42,.28],[1.75,.02,.25,.17]],black);
  add(marineSaddleGeometry([[-1.36,.23,.61,.32],[-1.08,.26,.74,.36],[-.61,.25,.68,.38],[-.15,.23,.65,.40],[.34,.17,.60,.43]]),seat);
  // Raised passenger saddle/back pad is visibly separate from the rear deck.
  const tail=box(.47,.26,.28,0,.81,-1.21,red);tail.rotation.x=-.28;
  box(.44,.04,.29,0,.96,-1.18,rubber);
  shape([[.15,.18,.65,.45],[.52,.32,.88,.46],[.95,.37,.79,.43],[1.46,.18,.46,.30],[1.76,.008,.26,.19]],black);
  for(const side of[-1,1]){
    const shoulder=shape([[.22,.01,.63,.47],[.48,.21,.74,.49],[.97,.20,.63,.43],[1.3,.008,.43,.32]],red);shoulder.position.x=side*.25;shoulder.rotation.y=side*.15;
    box(.22,.06,1.57,side*.49,.30,-.53,rubber);
    for(let j=0;j<12;j++)box(.19,.011,.026,side*.49,.335,-1.24+j*.115,seat);
    tube([[side*.43,.24,-1.7],[side*.62,.32,-1.1],[side*.65,.36,.16],[side*.52,.38,1.03],[side*.27,.27,1.61]],.025,rubber);
    tube([[side*.45,.31,-1.58],[side*.55,.36,-1.1],[side*.56,.37,-.76]],.018,red,body,8);
    box(.028,.13,.58,side*.63,.15,-1.0,black);
    for(let j=0;j<3;j++){const vent=box(.025,.055,.14,side*.65,.16,-1.21+j*.19,rubber);vent.rotation.x=.15;}
    box(.025,.075,.40,side*.61,.28,.58,rubber);
    tube([[side*.17,.55,-1.45],[side*.23,.66,-1.32],[side*.26,.57,-1.10]],.025,black,body,8);
    for(let j=0;j<4;j++)box(.06,.018,.20,side*.38,.59-j*.022,.37+j*.10,rubber);
  }
  box(.88,.05,.35,0,.22,-1.62,rubber);box(.55,.055,.11,0,.39,-1.56,red);
  tube([[0,.60,.54],[0,1.19,.40]],.055,black,body,8);
  const handlebars=new THREE.Group();handlebars.userData.dynamic=true;handlebars.position.set(0,1.19,.40);body.add(handlebars);
  tube([[-.39,0,-.13],[-.17,.025,-.01],[0,.015,.02],[.17,.025,-.01],[.39,0,-.13]],.029,black,handlebars,12);
  for(const side of[-1,1]){box(.18,.069,.08,side*.33,0,-.12,rubber,handlebars);box(.025,.075,.085,side*.42,0,-.12,red,handlebars);}
  box(.19,.055,.15,0,.035,.10,black,handlebars);box(.135,.008,.08,0,.067,.10,screen,handlebars);
  const nozzle=new THREE.Group();nozzle.userData.dynamic=true;nozzle.position.set(0,-.06,-1.81);body.add(nozzle);
  const outlet=add(new THREE.CylinderGeometry(.145,.18,.23,18),black,0,0,-.06,nozzle);outlet.rotation.x=Math.PI/2;
  const lip=add(new THREE.TorusGeometry(.145,.014,6,20),metal,0,0,-.183,nozzle);
  for(let j=0;j<4;j++){const a=j*Math.PI/2;const blade=box(.045,.11,.015,Math.sin(a)*.065,Math.cos(a)*.065,-.186,metal,nozzle);blade.rotation.z=-a;}
  const bucket=new THREE.Group();bucket.userData.dynamic=true;bucket.position.set(0,.1,-1.82);body.add(bucket);box(.40,.15,.17,0,0,-.09,black,bucket);
  const rider=makeRider(body,'hyper');rider.userData.dynamic=true;
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#192429';ctx.font='italic bold 76px sans-serif';ctx.textAlign='center';ctx.fillText('RXP-X 300',256,88);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    for(const side of[-1,1]){const label=add(new THREE.PlaneGeometry(.87,.22),m,side*.65,.11,-.30);label.rotation.y=side*Math.PI/2;}
  }
  // Batch fixed bodywork; keep rider IK, steering, trim nozzle and bucket moving.
  body.updateMatrixWorld(true);const groups=new Map(),remove=[];
  body.traverse(o=>{if(!o.isMesh)return;for(let p=o.parent;p&&p!==body;p=p.parent)if(p.userData.dynamic)return;let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);remove.push(o);});
  for(const[m,gs]of groups){const mesh=new THREE.Mesh(mergeGeometries(gs),m);mesh.castShadow=mesh.receiveShadow=true;body.add(mesh);gs.forEach(g=>g.dispose());}for(const o of remove){o.removeFromParent();o.geometry.dispose();}
  root.userData={body,rider,handlebars,nozzle,bucket,apex:true,modelRevision:'fleet-craft-2'};return root;
}
