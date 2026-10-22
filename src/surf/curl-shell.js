import{BufferGeometry,BufferAttribute,MeshPhysicalMaterial,DoubleSide}from'three';
import{curlPoint,surfScale}from'./break.js';
// The underside is the same surface used by barrelRoof/contact sampling. The
// outer sheet adds volume above it; closed tip edges give the lip a visible rim.
export const lipThickness=theta=>(.12+.25*Math.sin(theta*.8)**2)*Math.sqrt(surfScale());
export function curlShellGeometry(columns,rows){
 const sheet=(columns+1)*(rows+1),g=new BufferGeometry(),uv=new Float32Array(sheet*4),indices=[];
 for(let side=0;side<2;side++)for(let i=0;i<=columns;i++)for(let j=0;j<=rows;j++){
  const n=side*sheet+i*(rows+1)+j;uv[n*2]=i/columns;uv[n*2+1]=j/rows;
  if(i<columns&&j<rows){const b=n+rows+1;indices.push(...(side?[n,n+1,b,n+1,b+1,b]:[n,b,n+1,n+1,b,b+1]));}
 }
 const join=(a,b)=>indices.push(a,b,a+sheet,b,b+sheet,a+sheet);
 for(let i=0;i<columns;i++){join(i*(rows+1),(i+1)*(rows+1));join(i*(rows+1)+rows,(i+1)*(rows+1)+rows);}
 for(let j=0;j<rows;j++){join(j,j+1);join(columns*(rows+1)+j,columns*(rows+1)+j+1);}
 g.setAttribute('position',new BufferAttribute(new Float32Array(sheet*6),3));g.setAttribute('uv',new BufferAttribute(uv,2));g.setAttribute('curlStrength',new BufferAttribute(new Float32Array(sheet*2),1));g.setIndex(indices);return g;
}
export function updateCurlColumn(g,i,rows,x,crest,time,w){
 const sheet=g.attributes.position.count/2;
 for(let j=0;j<=rows;j++){
  const theta=j/rows*Math.PI*.98,p=curlPoint(x,crest,time,theta,w),n=i*(rows+1)+j;
  g.attributes.position.setXYZ(n,x,p.y,crest+p.q);g.attributes.position.setXYZ(n+sheet,x,p.y+lipThickness(theta),crest+p.q);
  g.attributes.curlStrength.setX(n,w.curl);g.attributes.curlStrength.setX(n+sheet,w.curl);
 }
}
export function curlShellMaterial(){
 const m=new MeshPhysicalMaterial({color:'#238ea2',roughness:.22,metalness:.02,clearcoat:.85,side:DoubleSide,transparent:false,opacity:1,depthWrite:true});
 m.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float curlStrength;varying float surfStrength;varying vec2 surfUv;varying vec3 surfPoint;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nsurfUv=uv;surfStrength=curlStrength;surfPoint=position;');
  shader.fragmentShader='varying float surfStrength;varying vec2 surfUv;varying vec3 surfPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   if(surfStrength<.2)discard;
   float striation=.5+.5*sin(surfPoint.x*1.8+sin(surfPoint.z*3.4)*.3+surfUv.y*12.);
   float foam=smoothstep(.78,.97,surfUv.y)*(.82+.18*striation);
   vec3 face=mix(vec3(.025,.23,.32),vec3(.12,.62,.67),smoothstep(.05,.7,surfUv.y));
   diffuseColor.rgb=mix(face*(.92+striation*.08),vec3(.88,.97,.94),foam);
  `);
 };return m;
}
