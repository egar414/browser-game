import * as THREE from'three';import{makeDeckCharacter}from'./wardrobe.js';
export function makeSled(colour='#cced31'){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const dark=new THREE.MeshStandardMaterial({color:'#1e252a',roughness:.8}),paint=new THREE.MeshPhysicalMaterial({color:colour,roughness:.27,metalness:.1,clearcoat:.6}),metal=new THREE.MeshStandardMaterial({color:'#89999f',metalness:.75,roughness:.3}),glass=new THREE.MeshPhysicalMaterial({color:'#183a46',roughness:.15,metalness:.2});
 const box=(w,h,d,x,y,z,m=dark)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);body.add(o);o.castShadow=true;return o;};
 // A long rear rubber track, repeated cleats and exposed suspension rollers.
 box(.52,.32,1.8,0,-.02,-.52);box(.63,.08,1.6,0,.15,-.48,metal);
 for(let i=0;i<16;i++){box(.58,.055,.055,0,-.19,-1.35+i*.108);box(.57,.035,.055,0,.15,-1.35+i*.108);}
 for(const side of[-1,1])for(let i=0;i<4;i++){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.06,12),metal);wheel.rotation.z=Math.PI/2;wheel.position.set(side*.285,-.02,-1.15+i*.36);body.add(wheel);}
 const hood=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),paint);hood.scale.set(.46,.40,.80);hood.position.set(0,.42,.50);body.add(hood);hood.castShadow=true;
 box(.58,.1,.9,0,.34,-.52,paint);box(.34,.23,1.05,0,.53,-.48);box(.20,.18,.36,0,.57,.93,glass);const windshield=box(.46,.32,.055,0,.82,.66,glass);windshield.rotation.x=-.35;
 const handlebars=new THREE.Group();handlebars.position.set(0,.94,.18);body.add(handlebars);const bar=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.8,10),metal);bar.rotation.z=Math.PI/2;handlebars.add(bar);
 const skis=[];for(const side of[-1,1]){
  const ski=new THREE.Group();ski.position.set(side*.57,-.14,.97);body.add(ski);const path=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,-.52),new THREE.Vector3(0,0,.24),new THREE.Vector3(0,.12,.54),new THREE.Vector3(0,.27,.63)]);const runner=new THREE.Mesh(new THREE.TubeGeometry(path,14,.065,6,false),dark);runner.scale.x=1.55;ski.add(runner);
  const loop=new THREE.Mesh(new THREE.TorusGeometry(.15,.024,5,12,Math.PI*1.5),paint);loop.rotation.y=Math.PI/2;loop.position.set(0,.16,.36);ski.add(loop);const suspension=box(.045,.38,.045,side*.54,.10,.78,metal);suspension.rotation.z=side*.3;skis.push(ski);
  box(.12,.05,.92,side*.37,.26,-.36,metal);for(let i=0;i<4;i++)box(.10,.024,.08,side*.37,.30,-.65+i*.18,dark);
  const vent=box(.025,.18,.34,side*.43,.42,.55,dark);vent.rotation.z=side*.2;
 }
 const rider=makeDeckCharacter();rider.scale.setScalar(.82);rider.position.set(0,-.08,-.55);body.add(rider);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),paint);helmet.position.set(0,1.73,0);rider.add(helmet);const visor=new THREE.Mesh(new THREE.BoxGeometry(.34,.13,.08),dark);visor.position.set(0,1.76,.19);rider.add(visor);rider.getObjectByName('hair').visible=false;rider.userData.faceParts.push(helmet,visor);
 const update=(v,dt)=>{rider.userData.animate(v.animationTime||0,0,false,true);rider.rotation.z=-v.steer*.18;rider.rotation.x=-.14+(v.riderAft||0)*.24;rider.position.z=-.55-(v.riderAft||0)*.16;
  for(const side of[-1,1]){rider.getObjectByName('hand'+side).position.set(side*.38,1.24,.88);const arm=rider.getObjectByName('arm'+side);arm.position.set(side*.33,1.28,.54);arm.rotation.x=-1.0;arm.scale.y=.36;rider.getObjectByName('foot'+side).position.set(side*.40,.41,.10);}
  for(const ski of skis)ski.rotation.y=-v.steer*.4;handlebars.rotation.y=-v.steer*.3;
 };
 rider.userData.update=update;root.userData={body,rider,handlebars,skis,detailedModel:true};return root;
}
