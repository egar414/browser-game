import * as THREE from 'three';

const material=(color,metalness=0,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide});
function mesh(root,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
function block(root,w,h,d,x,y,z,mat){return mesh(root,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
function rail(root,points,r,mat){return mesh(root,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,6,false),mat);}
function marking(root,text,w,h,x,y,z,rotation){
  if(typeof document==='undefined')return;
  const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f5eee2';ctx.font='bold 86px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,68);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  const m=mesh(root,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,side:THREE.DoubleSide}),x,y,z);m.rotation.y=rotation;
}
// Original 2.25 m open alloy hull based on the supplied tender photograph.
// The horsepower label and propulsion tuning are a gameplay specification.
export function buildTender(colour='#bdc9cc',design='classic'){
  const root=new THREE.Group();root.name='Tender 225';
  const alloy=material(colour,.78,.39),ribs=material('#8a999b',.72,.49),rubber=material('#202a2c',.02,.86),red=material('#c93b30',.1,.42),motorPaint=material('#202c36',.3,.27);
  const sections=[[-1.08,.52,.39,-.23],[-.82,.59,.43,-.27],[.12,.58,.47,-.23],[.68,.42,.51,-.10],[1.09,.14,.55,.08],[1.17,.015,.56,.18]];
  const vertices=[],indices=[];
  for(const [z,w,top,bottom]of sections)vertices.push(-w,top,z,-w*.76,bottom+.06,z,0,bottom,z,w*.76,bottom+.06,z,w,top,z);
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<4;j++){const a=i*5+j,b=a+5;indices.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);
  const flat=g.toNonIndexed();flat.computeVertexNormals();mesh(root,flat,alloy);g.dispose();
  const transom=new THREE.Shape([new THREE.Vector2(-.52,.39),new THREE.Vector2(.52,.39),new THREE.Vector2(.4,-.17),new THREE.Vector2(0,-.23),new THREE.Vector2(-.4,-.17)]);
  mesh(root,new THREE.ShapeGeometry(transom),alloy,0,0,-1.08);
  for(const side of [-1,1]){
    rail(root,sections.map(([z,w,y])=>[side*w,y,z]),.024,alloy);
    rail(root,sections.map(([z,w,y,b])=>[side*w*.9,(y+b)*.5,z]),.012,ribs);
    for(let z=-.85;z<.75;z+=.24){const w=z>.2?.5-(z-.2)*.37:.54;rail(root,[[side*w,.37,z],[side*w*.75,-.12,z],[0,-.16,z]],.012,ribs);}
    // Rows of small raised rivets catch the light along the gunwale.
    for(let i=0;i<sections.length-1;i++){
      const a=sections[i],b=sections[i+1];for(let t=0;t<1;t+=.22){const z=THREE.MathUtils.lerp(a[0],b[0],t),w=THREE.MathUtils.lerp(a[1],b[1],t),y=THREE.MathUtils.lerp(a[2],b[2],t);mesh(root,new THREE.SphereGeometry(.008,5,4),ribs,side*(w+.004),y-.035,z);}
    }
    rail(root,[[side*.29,.54,.76],[side*.18,.61,.94],[side*.06,.57,1.08]],.013,alloy);
    if(design!=='classic')rail(root,sections.slice(0,-1).map(([z,w,y])=>[side*(w+.003),y-.08,z]),design==='race'?.017:.025,red);
  }
  block(root,.88,.045,1.36,0,-.09,-.22,ribs);
  for(let i=0;i<10;i++)block(root,.012,.008,1.32,-.39+i*.087,-.063,-.22,alloy);
  for(const [z,w]of [[-.61,1.05],[.32,.98]]){
    block(root,w,.1,.29,0,.31,z,alloy);block(root,w-.07,.016,.23,0,.37,z,rubber);
    for(const side of [-1,1])block(root,.04,.32,.23,side*w*.35,.12,z,ribs);
  }
  // Bow plate, fuel tank, hose, bailer and a folded orange flotation vest.
  block(root,.20,.025,.15,0,.5,.91,alloy);
  block(root,.31,.15,.22,.22,.02,-.87,red);block(root,.06,.025,.04,.22,.11,-.87,rubber);
  rail(root,[[.22,.08,-.9],[.38,.14,-1.02],[.2,.32,-1.14]],.009,rubber);
  block(root,.22,.07,.18,.17,-.005,-.02,material('#ed8630'));
  block(root,.10,.09,.13,-.29,-.02,.03,red);
  for(const x of [-.10,.10])block(root,.045,.18,.1,x,.35,-1.10,motorPaint);
  const motor=new THREE.Group();motor.name='25 hp outboard';motor.position.set(.12,.27,-1.12);root.add(motor);
  mesh(motor,new THREE.CapsuleGeometry(.175,.20,4,12),motorPaint,0,.25,-.015).scale.set(1,.9,1.12);
  block(motor,.35,.035,.34,0,.22,-.01,red);
  block(motor,.075,.57,.10,0,-.23,0,motorPaint);
  mesh(motor,new THREE.SphereGeometry(1,12,8),motorPaint,0,-.63,-.02).scale.set(.07,.07,.19);
  block(motor,.22,.023,.27,0,-.48,-.03,motorPaint);
  rail(motor,[[0,.26,.14],[-.12,.27,.35],[-.32,.27,.54]],.019,rubber);
  block(motor,.045,.065,.09,-.32,.27,.54,rubber);
  const propeller=new THREE.Group();propeller.position.set(0,-.65,-.18);motor.add(propeller);
  for(let i=0;i<3;i++){const blade=block(propeller,.055,.18,.025,Math.sin(i*Math.PI*2/3)*.07,Math.cos(i*Math.PI*2/3)*.07,0,alloy);blade.rotation.z=-i*Math.PI*2/3;blade.rotation.y=.35;}
  marking(motor,'25',.24,.15,0,.32,-.215,Math.PI);marking(motor,'25',.24,.15,.179,.32,-.015,Math.PI/2);
  root.userData={motor,propeller};return root;
}
