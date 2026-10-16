// Original bright, sculpted coastal art direction. No borrowed game assets.
export const COASTAL_STYLE={
 name:'Sculpted coast',wallBevel:.045,
 sand:'#f0d39a',grass:'#75ac4d',park:'#5d9e50',road:'#697b87',
 walls:['#f4dfbd','#b1dccc','#e6b79c','#ddd8ee'],
 roofs:['#3f7088','#b87860','#4c6076','#88a9b2','#796b91'],
 garden:'#458c50',fence:'#efe4ce',
 canopyBottom:'#287566',canopyMiddle:'#60a943',canopyTop:'#b4d867',
 canopyTints:['#e6f4bf','#d1eab7','#e8efbc'],
 skyHorizon:[.48,.74,.91],skyZenith:[.035,.19,.58],
 waterDeep:[.006,.13,.20],waterShallow:[.025,.43,.34],
 haze:'#96c4df',hazeDensity:.0007,
};
export const glslColour=rgb=>`vec3(${rgb.map(v=>Number.isInteger(v)?`${v}.0`:String(v)).join(',')})`;
