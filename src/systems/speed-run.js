import * as THREE from 'three';
import { OFFSHORE_RUN, waveHeight } from '../config.js';
// Navigation buoys, deliberately non-solid: the authored run remains clear.
export class SpeedRun {
  constructor(scene){
    this.points=[];for(let x=OFFSHORE_RUN.start.x;x<OFFSHORE_RUN.finishX;x+=400)for(const side of[-1,1])this.points.push({x,z:OFFSHORE_RUN.start.z+side*65,end:false});
    for(const side of[-1,1])this.points.push({x:OFFSHORE_RUN.finishX,z:OFFSHORE_RUN.start.z+side*65,end:true});
    const g=new THREE.CylinderGeometry(.5,1.05,1.6,10),m=new THREE.MeshStandardMaterial({color:'#edb14e',roughness:.6});this.buoys=new THREE.InstancedMesh(g,m,this.points.length);this.buoys.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.buoys.frustumCulled=false;scene.add(this.buoys);this.dummy=new THREE.Object3D();this.update(0,OFFSHORE_RUN.start);
  }
  update(time,v){this.buoys.visible=v.x>1700&&Math.abs(v.z-OFFSHORE_RUN.start.z)<1400;if(!this.buoys.visible)return;for(const [i,p]of this.points.entries()){this.dummy.position.set(p.x,waveHeight(p.x,p.z,time)+.5,p.z);this.dummy.scale.set(1,p.end?3:1,1);this.dummy.updateMatrix();this.buoys.setMatrixAt(i,this.dummy.matrix);}this.buoys.instanceMatrix.needsUpdate=true;}
}
