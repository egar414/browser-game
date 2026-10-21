import * as THREE from 'three';
import {practiceSpawn,PRACTICE_SPAWNS} from './practice.js';
import {surfWave} from './break.js';
export function createSurfDebug(scene,session,view){
 const root=document.createElement('details');root.id='surf-debug';root.innerHTML='<summary>SURF LAB · DEV ONLY</summary><label><input type="checkbox" data-contact> Contacts</label> <label><input type="checkbox" data-normal> Normals</label><div>'+Object.keys(PRACTICE_SPAWNS).map(id=>`<button data-spawn="${id}">${id}</button>`).join('')+'</div><pre></pre>';document.body.append(root);
 const markers=new THREE.Group();scene.add(markers);const dots=Array.from({length:3},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.09,6,4),new THREE.MeshBasicMaterial({color:0xffd351,depthTest:false}));markers.add(m);return m;});
 const normal=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),2,0xff6655);scene.add(normal);
 for(const b of root.querySelectorAll('[data-spawn]'))b.onclick=()=>{if(practiceSpawn(session,b.dataset.spawn))view.cameraReady=false;};
 const text=root.querySelector('pre'),contact=root.querySelector('[data-contact]'),normals=root.querySelector('[data-normal]');let elapsed=0;
 return {update(dt){root.hidden=!session.active;markers.visible=session.active&&root.open&&contact.checked;normal.visible=session.active&&root.open&&normals.checked;if(!session.active||!root.open)return;
  for(let i=0;i<dots.length;i++){const p=session.contacts[i];dots[i].position.set(p.x,p.height,p.z);dots[i].material.color.setHex(p.load>.5?0x66ff99:0xff6655);}
  const w=surfWave(session.x,session.z,session.time);normal.position.set(session.x,session.y,session.z);normal.setDirection(new THREE.Vector3(w.normal.x,w.normal.y,w.normal.z));
  elapsed+=dt;if(elapsed<.12)return;elapsed=0;text.textContent=`${session.mode} / ${session.contactState} ${(session.contact*100).toFixed()}%\nspeed ${session.speed.toFixed(2)} · water-relative ${session.relativeSpeed.toFixed(2)} m/s\ngrip ${session.grip.toFixed(2)} · rail ${(session.railAngle*180/Math.PI).toFixed()}°\ncompression ${session.compression.toFixed(2)} · pump ${session.pumpCharge.toFixed(2)}\nyaw ${session.yawRate.toFixed(2)} · pitch ${session.pitchRate.toFixed(2)} rad/s\n${w.section.name} · across ${w.q.toFixed(2)} m\npocket ${(session.x-w.peel).toFixed(1)} m · ${session.move}`;
 }};
}
