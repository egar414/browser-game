import{makeSpark}from'./spark-model.js';
// The photo-based hull is available for normal play; Creator detailing stays personal.
export function makeStandardSpark(colour='#1260f4',design='classic'){return makeSpark(colour,design,false);}
