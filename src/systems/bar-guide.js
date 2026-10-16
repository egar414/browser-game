import * as THREE from 'three';
import { SPAWN, waveHeight } from '../config.js';

export const BAR_ZONE={x:600,z:-1630,radius:240};
export const BAR_LAUNCH={x:625,z:-1770,heading:0};
// Follow the mapped river, leave between the rock walls, then round the
// left into the authored shoals. A straight arrow from the marina cuts land.
export const BAR_ROUTE=[
  [SPAWN.x,SPAWN.z],[-220,-1003],
  // Stable geographic route anchors: new upstream channel vertices must not
  // move the entrance guide to a different river section.
  [-225.4, -1003.5],
  [-32.3, -992.8],
  [181.4, -891.2],
  [330.9, -755.6],
  [583.5, -744.2],
  [804.3, -782.6],
  [926.8, -844.7],
  [1011.4, -915.8],
  [1096.6, -1034.7],
  [1117.6, -1319.6],
  [1108.7, -1358.5],
  [1083.9, -1394.1],
  [1040.2, -1423.8],
  [960,-1480],[900,-1540],[820,-1610],
  [BAR_ZONE.x,BAR_ZONE.z],
];
export const BAR_MARKERS=[[350,-1550],[600,-1830],[800,-1685]];
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class BarGuide {
  constructor(scene=null,solids=[]){
    this.active=false;this.index=1;this.buoys=[];
    if(!scene)return;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const c=canvas.getContext('2d');c.fillStyle='#ec8b3f';c.fillRect(0,0,512,256);c.fillStyle='#153b40';c.textAlign='center';c.font='bold 72px Arial';c.fillText('BAR WAVES',256,110);c.font='26px Arial';c.fillText('ESTUARY RATS · PLAY ZONE',256,180);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const orange=new THREE.MeshStandardMaterial({color:'#ed8b3e',roughness:.6}),white=new THREE.MeshStandardMaterial({color:'#eee9d5',roughness:.7});
    const board=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:.7});
    for(const [x,z]of BAR_MARKERS){
      const g=new THREE.Group(),base=new THREE.Mesh(new THREE.CylinderGeometry(.75,1.1,1.1,12),orange),stripe=new THREE.Mesh(new THREE.CylinderGeometry(.76,.76,.22,12),white),mast=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,4,8),white),sign=new THREE.Mesh(new THREE.PlaneGeometry(5,2.5),board);
      base.position.y=.3;stripe.position.y=.6;mast.position.y=2.3;sign.position.y=4.4;g.add(base,stripe,mast,sign);g.position.set(x,0,z);scene.add(g);this.buoys.push(g);
      solids.push({x,z,w:1.8,d:1.8,height:5.7,name:'Bar wave-zone buoy'});
    }
  }
  toggle(v){
    this.active=!this.active;if(!this.active)return;
    let best=Infinity;
    for(let i=1;i<BAR_ROUTE.length;i++){
      const a=BAR_ROUTE[i-1],b=BAR_ROUTE[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((v.x-a[0])*dx+(v.z-a[1])*dz)/(dx*dx+dz*dz)));
      const d=Math.hypot(v.x-a[0]-dx*t,v.z-a[1]-dz*t);
      if(d<best){best=d;this.index=i;}
    }
  }
  update(v){if(!this.active)return;while(this.index<BAR_ROUTE.length-1&&Math.hypot(v.x-BAR_ROUTE[this.index][0],v.z-BAR_ROUTE[this.index][1])<25)this.index++;}
  status(v){
    const p=BAR_ROUTE[this.index],distance=Math.hypot(p[0]-v.x,p[1]-v.z),arrived=Math.hypot(v.x-BAR_ZONE.x,v.z-BAR_ZONE.z)<BAR_ZONE.radius;
    return {active:this.active,arrived,index:this.index,target:{x:p[0],z:p[1]},distance,bearing:angle(Math.atan2(p[0]-v.x,p[1]-v.z)-v.heading),zone:BAR_ZONE};
  }
  render(time){for(const g of this.buoys){g.position.y=waveHeight(g.position.x,g.position.z,time);g.rotation.z=Math.sin(time*.7+g.position.x)*.045;}}
}
