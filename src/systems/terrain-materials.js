import * as THREE from 'three';
import {surfaceTexture} from './surface-textures.js';
// Small, original tileable textures, bundled with the game as procedural code.
export function groundMaterial(colour,kind){
  const n=128,heights=new Float32Array(n*n),pixels=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4);
  let seed=kind==='sand'?341:982;const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
  const grids=[4,16,64].map(size=>({size,data:Array.from({length:size*size},random)}));
  const smooth=x=>x*x*(3-2*x);
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){
    let h=0;
    grids.forEach(({size,data},i)=>{const u=x/n*size,v=z/n*size,a=Math.floor(u),b=Math.floor(v),tx=smooth(u-a),tz=smooth(v-b),at=(a,b)=>data[(b%size)*size+a%size];h+=THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(a,b),at(a+1,b),tx),THREE.MathUtils.lerp(at(a,b+1),at(a+1,b+1),tx),tz)*[.5,.3,.2][i];});
    const fleck=random(),value=kind==='sand'?168+h*75:120+h*110;
    heights[z*n+x]=h*.7+fleck*.3;
    const i=(z*n+x)*4;pixels.set([value+(kind==='sand'?10:0),value+(kind==='grass'?9:0),value-(kind==='grass'?15:5),255],i);
  }
  const at=(x,z)=>heights[((z+n)%n)*n+(x+n)%n];
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){
    const dx=(at(x+1,z)-at(x-1,z))*.8,dz=(at(x,z+1)-at(x,z-1))*.8,v=new THREE.Vector3(-dx,-dz,1).normalize();normal.set([(v.x*.5+.5)*255,(v.y*.5+.5)*255,(v.z*.5+.5)*255,255],(z*n+x)*4);
  }
  const texture=data=>{const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
  const map=texture(pixels);map.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.MeshStandardMaterial({color:kind==='grass'?'#eef0de':'#ffffff',map:surfaceTexture(kind),normalMap:texture(normal),normalScale:new THREE.Vector2(.32,.32),roughness:1});m.userData.ground=true;m.userData.surfaceKind=kind;map.dispose();return m;
}
