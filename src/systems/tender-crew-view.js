import * as THREE from 'three';
import {makeTinnyPassenger} from '../vehicles/tinny-passenger.js';
import {VEHICLES} from '../config.js';
export function makeCrewActor(){const root=new THREE.Group();root.userData.passenger=makeTinnyPassenger(root);return root;}
export function animateCrewActor(root,p,dt){root.userData.passenger.userData.update({...p,config:VEHICLES.tinny},dt);}
export class TenderCrewView{
 constructor(scene){this.actor=makeCrewActor();this.actor.visible=false;scene.add(this.actor);}
 update(p,dt,firstPerson){const a=this.actor;a.visible=!!p&&!firstPerson;if(!p)return;a.position.set(p.x,p.y,p.z);a.rotation.set(-p.pitch,p.heading,p.roll,'YXZ');animateCrewActor(a,p,dt);}
}
