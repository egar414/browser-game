import{crewVestGeometry,crewLimbGeometry}from'./sculpted-crew.js';
import{coastalHeadGeometry,coastalCapGeometry}from'./coastal-character-detail.js';
import {isTinny} from '../config.js';
import{beachWear}from'./wardrobe.js';
import * as THREE from 'three';
const Y=new THREE.Vector3(0,1,0);
const skin=new THREE.MeshStandardMaterial({color:'#bc896b',roughness:.72,vertexColors:true});
const suit=beachWear.shorts;
const vest=beachWear.vest;
const dark=new THREE.MeshStandardMaterial({color:'#14292e',roughness:.62});
const limbGeometry=crewLimbGeometry();
export const RIDER_WEIGHT = { response:7, steeringShift:.17, loadShift:.008, maximumShift:.26, bowShift:.0704 };
export function riderWeightTargets(v){
  const aft=THREE.MathUtils.clamp(v.riderAft||0,0,1),bow=v.airborne?0:THREE.MathUtils.clamp(((v.pitch||0)-.3)/.6,0,1)*aft;
  const lean=THREE.MathUtils.clamp(-(v.steer||0)*RIDER_WEIGHT.steeringShift+(v.lateralAcceleration||0)*RIDER_WEIGHT.loadShift,-RIDER_WEIGHT.maximumShift,RIDER_WEIGHT.maximumShift)*(1+bow*.2);
  return {aft,lean:lean+(isTinny(v.type)?-(v.roll||0)*.22*bow:0),bow};
}
function ball(parent,position,scale,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),material);m.position.fromArray(position);m.scale.fromArray(scale);parent.add(m);m.castShadow=true;return m;}
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
  const jacket=new THREE.Mesh(crewVestGeometry(),vest);jacket.castShadow=true;torso.add(jacket);
  for(const side of [-1,1])ball(torso,[side*.16,.32,.155],[.025,.21,.017],dark);
  const face=new THREE.Group();torso.add(face);root.userData.face=face;const eye=new THREE.Object3D();eye.position.set(0,.73,.14);torso.add(eye);root.userData.eye=eye;
  const head=ball(face,[0,.69,.015],[.15,.19,.15],skin);head.geometry.dispose();head.geometry=coastalHeadGeometry();
  const cap=ball(face,[0,.8,.005],[.158,.083,.16],dark);cap.geometry.dispose();cap.geometry=coastalCapGeometry();
  ball(face,[0,.79,.14],[.16,.022,.1],dark);
  ball(face,[0,.71,.153],[.13,.036,.026],dark);
  const limbs=[-1,1].map(side=>({side,arm:[segment(root,.085,vest),segment(root,.064,skin)],leg:[segment(root,.105,suit),segment(root,.081,skin)],hand:ball(root,[0,0,0],[.064,.065,.065],skin),foot:ball(root,[0,0,0],[.083,.045,.16],dark)}));
  root.traverse(o=>{if(o.isMesh&&o.material.vertexColors&&!o.geometry.attributes.color)o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count*3).fill(1),3));});
  for(const limb of limbs){limb.hand.name=limb.side===1?'right-hand':'left-hand';limb.foot.name=limb.side===1?'right-foot':'left-foot';}
  root.userData.bodyParts=[...torso.children.filter(o=>o.isMesh),...limbs.flatMap(l=>[...l.leg,l.foot])];
  let aft=0,lean=0,bow=0;
  root.userData.update=(v,dt,parts)=>{
    const target=riderWeightTargets(v),blend=1-Math.exp(-dt*RIDER_WEIGHT.response);aft+=(target.aft-aft)*blend;lean+=(target.lean-lean)*blend;bow+=(target.bow-bow)*blend;
    const cat=type==='cat',tinny=isTinny(type),outboard=cat||tinny,load=THREE.MathUtils.clamp(v.surgeAcceleration||0,-6,6),soaked=THREE.MathUtils.clamp(v.sprayReaction||0,0,1);
    const hullScale=tinny?(v.config?.length||2.25)/2.25:1;
    const hip=new THREE.Vector3((tinny?-.25:cat?-.42:0)+lean*(outboard?.85:1),tinny?(v.config?.riderHipHeight??.53)+aft*.05-bow*.05:cat?.74-bow*.035:.75+aft*.15,(tinny?-.57*hullScale:cat?-.77:-.38)-aft*(tinny?.20:cat?.22:.24)-bow*RIDER_WEIGHT.bowShift);
    hip.y-=soaked*.10;
    const pose=v.airTricks?.pose,b=v.airTricks?.blend||0;
    if(pose==='hangman'){hip.x-=b*.24;hip.y+=b*.08;}
    if(pose==='superman'){hip.y+=b*.42;hip.z-=b*.38;}
    if(pose==='heartattack'){hip.y+=b*.44;hip.z-=b*.23;}
    torso.position.copy(hip);torso.rotation.set(.35+aft*.42+load*.012+bow*.08+soaked*.25,0,lean*.85);
    if(pose==='hangman')torso.rotation.z-=b*.42;
    if(pose==='superman')torso.rotation.x+=b*.9;
    if(pose==='heartattack')torso.rotation.x+=b*1.25;
    torso.updateMatrix();
    root.userData.balance={aft,lean,bow,soaked,hip:hip.toArray()};
    for(const l of limbs){
      const {side}=l;
      const shoulder=new THREE.Vector3(side*.21,.48,0).applyMatrix4(torso.matrix);
      let hand;
      if(outboard){
        hand=side===1?(tinny?new THREE.Vector3(-.32,.27,.54):new THREE.Vector3(-.25,.45,.65)).multiply(parts.motor.scale).applyEuler(parts.motor.rotation).add(parts.motor.position):(tinny?new THREE.Vector3(-.49,.43,-.26*hullScale):new THREE.Vector3(-.66,.61,-.36));
      }else{
        hand=new THREE.Vector3(side*.3,0,-.12).applyAxisAngle(Y,-v.steer*.43).add(parts.handlebars.position);
      }
      if(pose==='nohander')hand.lerp(new THREE.Vector3(hip.x+side*.7,hip.y+.55,hip.z+.12),b);
      const elbow=joint(shoulder,hand,.36,.39,new THREE.Vector3(side,.1,-.2));
      placeSegment(l.arm[0],shoulder,elbow);placeSegment(l.arm[1],elbow,hand);l.hand.position.copy(hand);
      const legHip=hip.clone().add(new THREE.Vector3(side*.14,0,0));
      const foot=new THREE.Vector3(tinny?-.20+side*.22:cat?-.42+side*.23:side*.44,tinny?(v.config?.footHeight??.04):cat?.4:.32,(tinny?-.20*hullScale:cat?-.75:-.37)-aft*(outboard?.12:.48));
      if(pose==='hangman')foot.lerp(new THREE.Vector3(hip.x-.55,hip.y-.25,hip.z-.35+side*.15),b);
      if(pose==='heartattack')foot.lerp(new THREE.Vector3(hip.x+side*.20,hip.y+.65,hip.z-.45),b);
      if(pose==='superman')foot.lerp(new THREE.Vector3(hip.x+side*.18,hip.y+.12,hip.z-.82),b);
      const knee=joint(legHip,foot,.46,.47,new THREE.Vector3(side*.6,.05,1));
      placeSegment(l.leg[0],legHip,knee);placeSegment(l.leg[1],knee,foot);l.foot.position.copy(foot);
    }
  };
  return root;
}
