// Original bright, sculpted coastal art direction. No borrowed game assets.
export const COASTAL_STYLE={
 name:'Sunlit coastal adventure',wallBevel:.045,
 sand:'#efd39f',grass:'#71b74b',park:'#4e9e4e',road:'#697b87',
 walls:['#f4dfbd','#b1dccc','#e6b79c','#ddd8ee'],
 roofs:['#3f7088','#b87860','#4c6076','#88a9b2','#796b91'],
 garden:'#458c50',fence:'#efe4ce',
 canopyBottom:'#194f42',canopyMiddle:'#439341',canopyTop:'#a1cb57',
 canopyTints:['#e6f4bf','#d1eab7','#e8efbc'],
 skyHorizon:[.48,.74,.91],skyZenith:[.035,.19,.58],
 waterDeep:[.004,.085,.28],waterShallow:[.015,.40,.43],
 haze:'#9fc9e5',hazeDensity:.00052,
};
export const glslColour=rgb=>`vec3(${rgb.map(v=>Number.isInteger(v)?`${v}.0`:String(v)).join(',')})`;
