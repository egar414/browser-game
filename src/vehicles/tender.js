import * as THREE from 'three';
import {batchRigidAssembly} from './rigid-model.js';
import {makeAnglerOutboard} from './angler-outboard.js';
import {marineHullGeometry,marineSurface,marineStation,marineRibGeometry} from './marine-hull.js';
import {brushedAlloy,marineSteel,roundedBlock as block,detailTube as rail,deckFittings} from './marine-details.js';

export const TENDER_SECTIONS=[[-1.08,.52,.39,-.23],[-.82,.59,.43,-.27],[.12,.58,.47,-.23],[.68,.42,.51,-.10],[1.09,.14,.55,.08],[1.17,.015,.56,.18]];
const shape={ratio:.76,rise:.06};
const material=(color,roughness=.65)=>new THREE.MeshStandardMaterial({color,roughness});
function add(root,geometry,material,name){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;root.add(m);return m;}
function group(root,name){const g=new THREE.Group();g.name=name;g.userData.dynamic=true;root.add(g);return g;}
function plate(root,points,y,material,thickness=.008){const s=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))),g=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1});g.rotateX(-Math.PI/2);const m=add(root,g,material,'Formed plate');m.position.y=y-thickness;return m;}
function marking(root,text,x,y,z,side){
 if(typeof document==='undefined')return;const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#e6c967';ctx.font='italic bold 44px sans-serif';ctx.textAlign='center';ctx.fillText(text,128,48);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=add(root,new THREE.PlaneGeometry(.64,.16),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.4}),'Racing hull lettering');m.position.set(x,y,z);m.rotation.y=side*Math.PI/2;
}
// Distinct short tender proportions retained; the Wasp's construction standard
// is applied to its own curved plate hull, ribs, benches and motor assemblies.
export function buildTender(colour='#bdc9cc',design='classic',options={}){
 const root=new THREE.Group();root.name=options.racing?'Super Skua 370':options.hp===50?'Dingi 200':'Tender 225';root.userData.dynamic=true;
 const moored=options.detail==='moored',N=moored?20:40,alloy=brushedAlloy(colour),formed=brushedAlloy(options.racing?'#6d7980':'#a8b3ba'),polished=marineSteel(),rubber=material('#20262a',.85),red=material('#bd3b29',.4),gold=material('#d7b356',.36);
 const hull=group(root,'Curved aluminium hull'),structure=group(root,'Welded interior structure'),fittings=group(root,'Gunwales handles and fittings'),benches=[];
 add(hull,marineHullGeometry(TENDER_SECTIONS,{...shape,stations:N,panelSteps:moored?2:3,thickness:.005}),alloy,'Five-millimetre alloy hull skin');
 for(const side of[-1,1]){
  const ps=Array.from({length:N+1},(_,i)=>marineSurface(TENDER_SECTIONS,i/N,side,shape));rail(fittings,ps,.022,polished,N).name='Rolled gunwale';
  rail(hull,Array.from({length:N+1},(_,i)=>marineSurface(TENDER_SECTIONS,i/N,side*.78,shape)),.0065,formed,N);
  for(const t of moored?[.18,.65]:[.1,.27,.45,.63,.79]){
   const p=marineSurface(TENDER_SECTIONS,t,side*.985,shape);block(fittings,.018,.022,.03,p.x,p.y,p.z,polished,.004);
  }
  const stern=marineStation(TENDER_SECTIONS,.015);plate(fittings,[[side*(stern[1]-.01),-1.05],[side*(stern[1]-.01),-.88],[side*(stern[1]-.19),-1.05]],.385,alloy);
  rail(fittings,[[side*.34,.30,-1.09],[side*.34,.24,-1.16],[side*.46,.24,-1.16],[side*.46,.30,-1.09]],.008,polished,12);
  if(options.racing||design!=='classic'){
   rail(fittings,Array.from({length:N},(_,i)=>marineSurface(TENDER_SECTIONS,i/N,side*.94,shape)),options.racing?.014:.01,options.racing?gold:red,N);
   if(options.racing)marking(fittings,'SKUA',side*.589,.28,-.24,side);
  }
 }
 for(const t of moored?[.18,.50,.74]:[.12,.30,.48,.65,.80])add(structure,marineRibGeometry(TENDER_SECTIONS,t,{width:.025,height:.017,shape}),formed,'Formed support rib');
 for(const side of[-1,1])for(const lane of[.24,.47])rail(structure,Array.from({length:N},(_,i)=>marineSurface(TENDER_SECTIONS,.035+i/N*.76,side*lane,shape).add(new THREE.Vector3(0,.012,0))),.008,formed,N);
 for(const[z,w]of[[-.61,1.05],[.32,.98]]){
  const seat=group(root,z<0?'Aft bench':'Forward bench');block(seat,w,.042,.29,0,.31,z,alloy,.008);block(seat,w-.07,.018,.23,0,.342,z,rubber,.007);
  for(const side of[-1,1]){block(seat,.045,.20,.22,side*(w*.39),.19,z,formed,.006);block(seat,.09,.018,.24,side*(w*.39),.086,z,formed,.005);}seat.userData.fullWidth=true;benches.push(seat);
 }
 const bow=group(root,'Bow seat and stem');plate(bow,[[-.24,.76],[.24,.76],[.008,1.16]],.51,alloy);rail(bow,[[-.025,.56,1.11],[-.025,.61,1.14],[.025,.61,1.14],[.025,.56,1.11]],.007,polished,12);
 block(structure,.91,.028,.08,0,.235,-1.025,formed,.006);
 const fuel=block(fittings,.28,.14,.21,.23,.025,-.87,red,.025);fuel.name='Fuel tank';block(fittings,.05,.02,.045,.23,.105,-.87,rubber,.008);rail(fittings,[[.23,.08,-.88],[.36,.13,-1.0],[.19,.30,-1.14]],.007,rubber,12);
 if(!moored){deckFittings(fittings,{width:.98,length:1.25,y:.43,z:-.16,material:polished});block(fittings,.20,.045,.15,.18,-.01,-.08,material('#e89339'),.015);}
 const{motor,propeller}=makeAnglerOutboard({hp:options.hp||25});motor.position.set(.12,.27,-1.12);motor.userData.dynamic=true;root.add(motor);
 for(const part of[hull,structure,fittings,...benches,bow])batchRigidAssembly(part);
 root.scale.set((options.width||1.22)/1.22,1,(options.length||2.25)/2.25);root.userData={dynamic:true,motor,propeller,hull,structure,fittings,benches,bow,modelRevision:'fleet-craft-2',plateThickness:.005};return root;
}
