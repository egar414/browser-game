import * as THREE from 'three';
const Y=new THREE.Vector3(0,1,0);
const skin=new THREE.MeshStandardMaterial({color:'#bc896b',roughness:.72});
const suit=new THREE.MeshStandardMaterial({color:'#263d42',roughness:.83});
const vest=new THREE.MeshStandardMaterial({color:'#e1dbc4',roughness:.68});
const dark=new THREE.MeshStandardMaterial({color:'#14292e',roughness:.62});
const limbGeometry=new THREE.CylinderGeometry(1,1,1,8);
export const RIDER_WEIGHT = { response:7, steeringShift:.17, loadShift:.008, maximumShift:.26, bowShift:.0704 };
export function riderWeightTargets(v){
  const aft=THREE.MathUtils.clamp(v.riderAft||0,0,1),bow=v.airborne?0:THREE.MathUtils.clamp(((v.pitch||0)-.3)/.6,0,1)*aft;
  const lean=THREE.MathUtils.clamp(-(v.steer||0)*RIDER_WEIGHT.steeringShift+(v.lateralAcceleration||0)*RIDER_WEIGHT.loadShift,-RIDER_WEIGHT.maximumShift,RIDER_WEIGHT.maximumShift)*(1+bow*.2);
  return {aft,lean,bow};
}
function ball(parent,position,scale,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material);m.position.fromArray(position);m.scale.fromArray(scale);parent.add(m);m.castShadow=true;return m;}
function segment(parent,radius,material){const m=new THREE.Mesh(limbGeometry,material);m.userData.radius=radius;parent.add(m);m.castShadow=true;return m;}
function placeSegment(mesh,a,b){const d=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(Y,d.clone().normalize());mesh.scale.set(mesh.userData.radius,d.length(),mesh.userData.radius);}
// Two-link IK keeps hands and feet at their attachment points while the torso moves.
function joint(a,b,l1,l2,hint){
  const axis=b.clone().sub(a),distance=axis.length();axis.normalize();
  const d=Math.min(l1+l2-.001,Math.max(.001,distance)),along=(l1*l1-l2*l2+d*d)/(2*d);
  const bend=hint.clone().sub(axis.clone().multiplyScalar(hint.dot(axis))).normalize();
  return a.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
}
export function makeRider(parent,type){
  const root=new THREE.Group(),torso=new THREE.Group();parent.add(root);root.add(torso);
  ball(torso,[0,.27,0],[.215,.29,.145],suit);
  ball(torso,[0,.29,.025],[.235,.245,.17],vest);
  for(const side of [-1,1])ball(torso,[side*.16,.32,.155],[.025,.21,.017],dark);
  ball(torso,[0,.69,.015],[.15,.19,.15],skin);
  ball(torso,[0,.8,.005],[.158,.083,.16],dark);
  ball(torso,[0,.79,.14],[.16,.022,.1],dark);
  ball(torso,[0,.71,.153],[.13,.036,.026],dark);
  const limbs=[-1,1].map(side=>({side,arm:[segment(root,.059,skin),segment(root,.052,skin)],leg:[segment(root,.085,suit),segment(root,.071,skin)],hand:ball(root,[0,0,0],[.064,.065,.065],skin),foot:ball(root,[0,0,0],[.083,.045,.16],dark)}));
  for(const limb of limbs){limb.hand.name=limb.side===1?'right-hand':'left-hand';limb.foot.name=limb.side===1?'right-foot':'left-foot';}
  let aft=0,lean=0,bow=0;
  root.userData.update=(v,dt,parts)=>{
    const target=riderWeightTargets(v),blend=1-Math.exp(-dt*RIDER_WEIGHT.response);aft+=(target.aft-aft)*blend;lean+=(target.lean-lean)*blend;bow+=(target.bow-bow)*blend;
    const cat=type==='cat',load=THREE.MathUtils.clamp(v.surgeAcceleration||0,-6,6);
    const hip=new THREE.Vector3((cat?-.42:0)+lean*(cat?.85:1),cat?.74-bow*.035:.75+aft*.15,(cat?-.77:-.38)-aft*(cat?.22:.24)-bow*RIDER_WEIGHT.bowShift);
    const pose=v.airTricks?.pose,b=v.airTricks?.blend||0;
    if(pose==='hangman'){hip.x-=b*.24;hip.y+=b*.08;}
    if(pose==='superman'){hip.y+=b*.42;hip.z-=b*.38;}
    torso.position.copy(hip);torso.rotation.set(.35+aft*.42+load*.012+bow*.08,0,lean*.85);
    if(pose==='hangman')torso.rotation.z-=b*.42;
    if(pose==='superman')torso.rotation.x+=b*.9;
    torso.updateMatrix();
    root.userData.balance={aft,lean,bow,hip:hip.toArray()};
    for(const l of limbs){
      const {side}=l;
      const shoulder=new THREE.Vector3(side*.21,.48,0).applyMatrix4(torso.matrix);
      let hand;
      if(cat){
        hand=side===1?new THREE.Vector3(-.25,.45,.65).applyEuler(parts.motor.rotation).add(parts.motor.position):new THREE.Vector3(-.66,.61,-.36);
      }else{
        hand=new THREE.Vector3(side*.3,0,-.12).applyAxisAngle(Y,-v.steer*.43).add(parts.handlebars.position);
      }
      if(pose==='nohander')hand.lerp(new THREE.Vector3(hip.x+side*.7,hip.y+.55,hip.z+.12),b);
      const elbow=joint(shoulder,hand,.36,.39,new THREE.Vector3(side,.1,-.2));
      placeSegment(l.arm[0],shoulder,elbow);placeSegment(l.arm[1],elbow,hand);l.hand.position.copy(hand);
      const legHip=hip.clone().add(new THREE.Vector3(side*.14,0,0));
      const foot=new THREE.Vector3(cat?-.42+side*.23:side*.44,cat?.4:.32,(cat?-.75:-.37)-aft*(cat?.12:.48));
      if(pose==='hangman')foot.lerp(new THREE.Vector3(hip.x-.55,hip.y-.25,hip.z-.35+side*.15),b);
      if(pose==='superman')foot.lerp(new THREE.Vector3(hip.x+side*.18,hip.y+.12,hip.z-.82),b);
      const knee=joint(legHip,foot,.46,.47,new THREE.Vector3(side*.6,.05,1));
      placeSegment(l.leg[0],legHip,knee);placeSegment(l.leg[1],knee,foot);l.foot.position.copy(foot);
    }
  };
  return root;
}
