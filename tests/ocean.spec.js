import {test,expect}from'@playwright/test';
import{WAVE_GLSL,wavePhases,waveHeight,seaAmplitude,waveChop,setSeaState,setWeatherClock}from'../src/ocean.js';
test('GPU water and CPU buoyancy agree offshore, through the mouth and inside a canal',async({page})=>{
 setWeatherClock(1800);setSeaState('swell',0,true);
 const samples=[[1270,-1745,1792000000],[1650,-1650,1792000000.5],[1110,-1740,12],[1270,-1745,50],[1395,-1725,80],[1650,-1650,40],[1120,-1320,80],[-236.6,-888.8,20],[1550,-1000,300],[0,300,35]].map(([x,z,t])=>({x,z,t,chop:waveChop(x,z),amplitude:seaAmplitude(t),phases:wavePhases(t),expected:waveHeight(x,z,t)}));
 setSeaState('calm',0,true);
 await page.goto('about:blank');
 const result=await page.evaluate(({code,samples})=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const gl=canvas.getContext('webgl2');if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw Error('Float GPU diagnostic unavailable');
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}'));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;uniform vec4 u;uniform float amplitude;uniform vec3 windPhase;uniform vec3 swellPhase;uniform float groupPhase;out vec4 colour;'+code+'\nvoid main(){colour=vec4(oceanWavePhased(u.xy,amplitude,u.w,windPhase,swellPhase,groupPhase),1.);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,1,1,0,gl.RGBA,gl.FLOAT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);const target=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Float framebuffer incomplete');gl.viewport(0,0,1,1);
  return samples.map(s=>{gl.uniform4f(gl.getUniformLocation(program,'u'),s.x,s.z,s.t,s.chop);gl.uniform1f(gl.getUniformLocation(program,'amplitude'),s.amplitude);gl.uniform3fv(gl.getUniformLocation(program,'windPhase'),s.phases.wind);gl.uniform3fv(gl.getUniformLocation(program,'swellPhase'),s.phases.swell);gl.uniform1f(gl.getUniformLocation(program,'groupPhase'),s.phases.group);gl.drawArrays(gl.TRIANGLES,0,3);const out=new Float32Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.FLOAT,out);return{expected:s.expected,rendered:out[0],error:Math.abs(s.expected-out[0]),glError:gl.getError()};});
 },{code:WAVE_GLSL,samples});
 for(const r of result){expect(r.glError).toBe(0);expect(r.error).toBeLessThan(.003);}
 console.log('GPU/CPU maximum height error (metres)',Math.max(...result.map(r=>r.error)));
});
