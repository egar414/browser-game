import * as THREE from 'three';
// Original generated images are bundled/fingerprinted by Vite. Each GPU texture
// is shared across scenery rebuilds, boats, water and reflection captures.
export const SURFACE_ASSETS={
 water:new URL('../assets/textures/coastal-water.webp',import.meta.url).href,
 sky:new URL('../assets/textures/coastal-sky.webp',import.meta.url).href,
 sand:new URL('../assets/textures/coastal-sand.webp',import.meta.url).href,
 grass:new URL('../assets/textures/coastal-grass.webp',import.meta.url).href,
 rock:new URL('../assets/textures/coastal-rock.webp',import.meta.url).href,
 timber:new URL('../assets/textures/coastal-timber.webp',import.meta.url).href,
};
const fallback={water:'#18605e',sky:'#7caacb',sand:'#d4c4a0',grass:'#697a40',rock:'#72726b',timber:'#9b9182'},cache=new Map();
export function surfaceTexture(kind){
 if(cache.has(kind))return cache.get(kind).texture;
 if(!SURFACE_ASSETS[kind])throw new Error(`Unknown surface texture: ${kind}`);
 let texture;
 if(typeof document==='undefined'){
  const c=new THREE.Color(fallback[kind]);texture=new THREE.DataTexture(new Uint8Array([c.r*255,c.g*255,c.b*255,255]),1,1);
 }else{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=fallback[kind];ctx.fillRect(0,0,1,1);texture=new THREE.CanvasTexture(canvas);}
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=kind==='sky'?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;texture.anisotropy=4;texture.name=`Generated coastal ${kind}`;texture.needsUpdate=true;
 const entry={texture,loaded:false,failed:false,promise:null};cache.set(kind,entry);
 entry.promise=typeof Image==='undefined'?Promise.resolve(false):new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   // WebGL immutable storage cannot resize a 1px fallback in place. Release
   // its GPU allocation before uploading the decoded full-size image.
   texture.dispose();texture.image=image;texture.needsUpdate=true;entry.loaded=true;texture.userData.loaded=true;resolve(true);};image.onerror=()=>{entry.failed=true;resolve(false);};image.src=SURFACE_ASSETS[kind];
 });return texture;
}
export async function loadSurfaceTextures(){Object.keys(SURFACE_ASSETS).forEach(surfaceTexture);await Promise.all([...cache.values()].map(e=>e.promise));return surfaceTextureStatus();}
export function surfaceTextureStatus(){return{loaded:[...cache].filter(([,e])=>e.loaded).map(([k])=>k),failed:[...cache].filter(([,e])=>e.failed).map(([k])=>k),count:cache.size};}
export function coastalMaterial(kind,tint='#ffffff'){
 const m=new THREE.MeshStandardMaterial({color:tint,map:surfaceTexture(kind),roughness:kind==='timber'?.87:.96});m.userData.surfaceKind=kind;return m;
}

export const SKY_TEXTURE_GLSL=`
 vec3 coastalSky(sampler2D skyMap,vec3 direction){
  vec3 d=normalize(direction);
  vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);
  return texture2D(skyMap,uv).rgb;
 }
`;
