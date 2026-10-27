import * as THREE from 'three';
let maps;
// Original brushed alloy: one shared 256² colour/roughness pair, no downloads.
export function marineAlloyMaps(){
 if(maps)return maps;const size=256,colour=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),height=new Float32Array(size*size),normals=new Uint8Array(size*size*4);let seed=314159;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(let y=0;y<size;y++){const brush=rand();for(let x=0;x<size;x++){const i=(y*size+x)*4,pit=rand(),streak=Math.sin(x*.027+y*.31)*.012,grain=.79+brush*.07+rand()*.10+streak,scuff=pit>.995?.15:0;colour.set([Math.min(255,(grain+scuff)*255),Math.min(255,(grain+scuff)*258),Math.min(255,(grain+scuff)*263),255],i);const r=145+brush*32+pit*24;rough.set([r,r,r,255],i);}}
 // Shallow rolled plate and a few long scuffs perturb reflected light, rather
 // than painting high-contrast noise onto a perfectly flat sheet.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)height[y*size+x]=Math.sin(x*.049+Math.sin(y*.036))*.04+Math.sin(y*.073+x*.011)*.025+(rand()-.5)*.002;
 for(let line=0;line<46;line++){const x0=rand()*size,y0=rand()*size,length=8+rand()*100,slope=(rand()-.5)*.22;for(let t=0;t<length;t++){const x=Math.floor(x0+t)%size,y=(Math.floor(y0+t*slope)+size)%size,i=y*size+x;const fade=Math.sin(t/length*Math.PI);height[i]-=.014*fade;const p=i*4;rough[p]=rough[p+1]=rough[p+2]=Math.max(85,rough[p]-fade*45);}}
 const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=new THREE.Vector3((at(x-1,y)-at(x+1,y))*7,(at(x,y-1)-at(x,y+1))*7,1).normalize(),i=(y*size+x)*4;normals.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],i);}
 const texture=(data,name,srgb=false)=>{const t=new THREE.DataTexture(data,size,size);t.name=name;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t;};
 maps={map:texture(colour,'Original brushed marine alloy',true),roughnessMap:texture(rough,'Marine alloy micro roughness'),normalMap:texture(normals,'Rolled alloy and hairline scratches')};return maps;
}
export function marineAlloyMaterial(colour){return new THREE.MeshStandardMaterial({color:colour,...marineAlloyMaps(),normalScale:new THREE.Vector2(.7,.7),metalness:.56,roughness:.63,side:THREE.DoubleSide});}
export function hullUV(geometry){const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){const side=Math.abs(n.getX(i))>.35;uv.set([p.getZ(i)*2.5,(side?p.getY(i):p.getX(i))*4],i*2);}geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;}
