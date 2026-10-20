import {test,expect} from '@playwright/test';
test('actual WebGL displacement and optimized normals match the board water model',async({page:p})=>{
 await p.route('**/__surf-gpu-check',r=>r.fulfill({contentType:'text/html',body:'<html><body>Wave GPU validation</body></html>'}));await p.goto('/__surf-gpu-check');
 const result=await p.evaluate(async()=>{
  const {SURF_GLSL,SURF_BREAK:B,setSurfOptions,surfWave}=await import('/src/surf/break.js');
  const gl=document.createElement('canvas').getContext('webgl2');if(!gl)throw Error('WebGL2 unavailable');
  const shader=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;\n'+SURF_GLSL+'\nlayout(location=0) in vec2 query;out vec3 surfaceSample;void main(){surfaceSample=reefSurfWave(query);gl_Position=vec4(0.,0.,0.,1.);}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 colour;void main(){colour=vec4(0.);}'));gl.transformFeedbackVaryings(program,['surfaceSample'],gl.SEPARATE_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const input=gl.createBuffer(),output=gl.createBuffer(),feedback=gl.createTransformFeedback();gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);let heightError=0,normalError=0,count=0;
  for(const faceHeight of [2.2,6.3])for(const direction of [1,-1])for(const time of [1.5,4,8,21.999,22.001,50]){
   setSurfOptions({faceHeight,direction});const points=[];for(const lx of [-120,-80,-35,15,65,110])for(const q of [-12,-3,0,2,5,12])for(const back of [0,2])points.push(B.x+lx,B.z-85+(time%22)*B.travelSpeed+lx*direction*.035-back*B.period*B.travelSpeed+q);
   const data=new Float32Array(points),samples=new Float32Array(data.length/2*3);gl.bindBuffer(gl.ARRAY_BUFFER,input);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,output);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,samples.byteLength,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,output);
   for(const [name,value]of Object.entries({uSurfTime:time,uSurfHeightScale:faceHeight/6.3156,uSurfDirection:direction}))gl.uniform1f(gl.getUniformLocation(program,name),value);
   gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,data.length/2);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,samples);
   for(let i=0;i<data.length/2;i++){const cpu=surfWave(data[i*2],data[i*2+1],time);heightError=Math.max(heightError,Math.abs(cpu.height-samples[i*3]));normalError=Math.max(normalError,Math.abs(cpu.slopeX-samples[i*3+1]),Math.abs(cpu.slopeZ-samples[i*3+2]));count++;}
  }
  gl.deleteBuffer(input);gl.deleteBuffer(output);gl.deleteTransformFeedback(feedback);gl.deleteProgram(program);return {heightError,normalError,count};
 });
 expect(result.heightError).toBeLessThan(.006);expect(result.normalError).toBeLessThan(.015);console.log('CPU/WebGL wave agreement',JSON.stringify(result));
});
