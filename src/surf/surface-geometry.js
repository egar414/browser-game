import {PlaneGeometry} from 'three';
import {SURF_SURFACE as PATCH} from './break.js';
// More rows over the riding face, fewer over broad offshore swells. The vertex
// shader still samples the same wave everywhere; this only places mesh vertices.
export function surfSurfaceGeometry(columns,rows){
 const geometry=new PlaneGeometry(PATCH.width,1,columns,rows);geometry.rotateX(-Math.PI/2);
 const position=geometry.attributes.position,nearStart=-140,farFraction=.28;
 for(let i=0;i<position.count;i++){
  const t=position.getZ(i)+.5,z=t<farFraction?PATCH.minZ+t/farFraction*(nearStart-PATCH.minZ):nearStart+(t-farFraction)/(1-farFraction)*(PATCH.maxZ-nearStart);
  position.setZ(i,z-PATCH.centerZ);
 }
 position.needsUpdate=true;return geometry;
}
