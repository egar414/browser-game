import * as THREE from'three';
import{waveHeight}from'../config.js';
import{FISHING_SPOTS}from'./fishing.js';
export function dolphinState(index,time,breachOffset=0){
 const spot=FISHING_SPOTS[index%3],angle=time*.045+index*1.9,radius=35+(index%3)*14,x=spot.x+Math.sin(angle)*radius,z=spot.z+Math.cos(angle)*radius;
 const phase=((time+breachOffset+index*2.7)%9)/9,leap=phase>.45&&phase<.82?Math.sin((phase-.45)/.37*Math.PI):0;
 return{x,z,y:waveHeight(x,z,time)-.08+leap*2.8,heading:angle+Math.PI/2,pitch:leap?Math.cos((phase-.45)/.37*Math.PI)*.65:Math.sin(time*1.1+index)*.05,leap};
}
function dolphin(){
 const g=new THREE.Group(),grey=new THREE.MeshStandardMaterial({color:'#658594',roughness:.45,metalness:.1}),belly=new THREE.MeshStandardMaterial({color:'#a7b9b9',roughness:.55});
 const ell=(x,y,z,sx,sy,sz,m)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);return o;};
 ell(0,0,0,.29,.32,1.12,grey);ell(0,-.15,.13,.25,.18,.85,belly);ell(0,.07,.86,.28,.28,.42,grey);ell(0,-.02,1.22,.11,.09,.35,grey);
 const fin=(vertices,m)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();const o=new THREE.Mesh(geo,m);o.material.side=THREE.DoubleSide;g.add(o);return o;};
 fin([0,.2,-.26,0,.85,-.51,0,.22,.28],grey);for(const s of [-1,1]){fin([s*.2,-.04,.35,s*.7,-.18,-.07,s*.18,-.08,-.25],grey);fin([0,0,-.95,s*.55,0,-1.46,s*.04,0,-1.27],grey);ell(s*.22,.12,1.02,.024,.025,.025,new THREE.MeshBasicMaterial({color:'#101c25'}));}
 g.name='Bottlenose dolphin';return g;
}
export class Dolphins{
 constructor(scene,label=null){this.label=label;this.focusUntil=0;if(label)scene.add(label);this.models=Array.from({length:6},()=>{const m=dolphin();scene.add(m);return m;});this.visible=0;this.breachOffset=0;}
 approach(time,collision){
  const p=dolphinState(0,time),h=p.heading;
  for(const distance of [10,16,24]){const x=p.x-Math.sin(h)*distance,z=p.z-Math.cos(h)*distance;if(!collision(x,z,5,0)){this.breachOffset=9*.46-time;this.focusUntil=time+40;return{x,z,heading:h};}}
  return null;
 }
 render(time,player,quality){if(this.label){const p=dolphinState(0,time,this.breachOffset);this.label.visible=time<this.focusUntil;this.label.position.set(p.x,p.y+3.0,p.z);}this.visible=0;this.models.forEach((m,i)=>{const p=dolphinState(i,time,this.breachOffset);m.visible=(quality!=='Low'||i<3)&&Math.hypot(p.x-player.x,p.z-player.z)<380;if(!m.visible)return;this.visible++;m.position.set(p.x,p.y,p.z);m.rotation.set(-p.pitch,p.heading,0,'YXZ');});}
}
