import * as THREE from'three';
// Temporary discovery labels only; normal free roam keeps its clear view.
export function visitLabel(text){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;
 const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(16,53,61,.9)';ctx.beginPath();ctx.roundRect(0,0,512,80,16);ctx.fill();ctx.fillStyle='#ffcf70';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,40);
 const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));sprite.scale.set(9,1.4,1);sprite.visible=false;return sprite;
}
