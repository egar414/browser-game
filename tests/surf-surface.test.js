import test from 'node:test';import assert from 'node:assert/strict';
import {surfSurfaceGeometry} from '../src/surf/surface-geometry.js';import {SURF_BREAK as B,SURF_SURFACE as P,surfHeight,setSurfOptions} from '../src/surf/break.js';
test('Low mesh resolves the overhead riding face to within board waterline clearance',()=>{
 setSurfOptions({faceHeight:2.2,direction:1});const cols=112,rows=320,g=surfSurfaceGeometry(cols,rows),a=g.attributes.position;let maxError=0,maxStep=0;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const i=row*(cols+1)+col,j=i+cols+1,x1=B.x+a.getX(i),x2=B.x+a.getX(i+1),z1=B.z+P.centerZ+a.getZ(i),z2=B.z+P.centerZ+a.getZ(j);
  if(x1<B.x-140||x2>B.x+145||z1<B.z-130||z2>B.z+280)continue;maxStep=Math.max(maxStep,Math.abs(z2-z1));
  const sampled=(surfHeight(x1,z1,4)+surfHeight(x2,z1,4)+surfHeight(x1,z2,4)+surfHeight(x2,z2,4))/4,actual=surfHeight((x1+x2)/2,(z1+z2)/2,4);maxError=Math.max(maxError,Math.abs(sampled-actual));
 }
 assert(maxStep<2.2);assert(maxError<.12,'mesh interpolation error '+maxError);g.dispose();
});
