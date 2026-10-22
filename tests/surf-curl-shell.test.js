import test from'node:test';import assert from'node:assert/strict';
import{curlShellGeometry,curlShellMaterial,updateCurlColumn,lipThickness}from'../src/surf/curl-shell.js';
import{surfWave,surfWidth,curlPoint,barrelRoof,setSurfOptions,SURF_BREAK as B}from'../src/surf/break.js';import{boardHitsLip}from'../src/surf/contact.js';
test('barrel is an opaque closed water volume with a thicker crest and shared inner collision surface',()=>{
 const cols=8,rows=16,g=curlShellGeometry(cols,rows),m=curlShellMaterial(),edges=new Map();assert.equal(m.transparent,false);assert.equal(m.opacity,1);assert.equal(m.depthWrite,true);
 for(let i=0;i<g.index.count;i+=3)for(let j=0;j<3;j++){const a=g.index.getX(i+j),b=g.index.getX(i+(j+1)%3),key=Math.min(a,b)+':'+Math.max(a,b);edges.set(key,(edges.get(key)||0)+1);}assert([...edges.values()].every(n=>n===2),'all shell edges closed');
 for(const faceHeight of[2.2,6.3]){setSurfOptions({faceHeight});const x=B.x+73,time=41.5,w=surfWave(x,B.z-85+time*B.travelSpeed,time),sheet=g.attributes.position.count/2;updateCurlColumn(g,0,rows,x,w.crest,time,w);for(let j=0;j<=rows;j++){const theta=j/rows*Math.PI*.98,p=curlPoint(x,w.crest,time,theta,w);assert(Math.abs(g.attributes.position.getY(j)-p.y)<.0001);assert(Math.abs(g.attributes.position.getY(j+sheet)-p.y-lipThickness(theta))<.0001);}assert(lipThickness(Math.PI*.8)>.1);}
 setSurfOptions({faceHeight:2.2});g.dispose();m.dispose();
});
test('falling lip stops a rider crossing the water sheet but permits riding over its top',()=>{
 setSurfOptions({faceHeight:2.2});const x=B.x+73,time=41.5,w=surfWave(x,B.z-85+time*B.travelSpeed,time),z=w.crest+6*surfWidth(),roof=barrelRoof(x,z,time);assert(roof!==null);const s={x,z,y:roof-.5,board:'short',crouch:0};assert(boardHitsLip(s,time));assert(!boardHitsLip({...s,y:roof+1.5},time));assert(!boardHitsLip({...s,y:roof-2},time));assert(!boardHitsLip({...s,board:'body',y:roof-.5},time));
});
