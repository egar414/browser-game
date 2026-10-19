// Extend the open cockpit and foredeck while retaining cabin/crew proportions.
export const SPORTFISHER_SHAPE={aftExtension:1.1,bowExtension:.8,aftJoin:-1.8,bowJoin:2,baseStern:-5,baseBow:5.65,beam:3.96};
export function sportfisherZ(z){
 const s=SPORTFISHER_SHAPE;
 return z<s.aftJoin?z+(z-s.aftJoin)/(s.aftJoin-s.baseStern)*s.aftExtension:z>s.bowJoin?z+(z-s.bowJoin)/(s.baseBow-s.bowJoin)*s.bowExtension:z;
}
export const SPORTFISHER_STERN=sportfisherZ(-5),SPORTFISHER_BOW=sportfisherZ(5.65),SPORTFISHER_LENGTH=SPORTFISHER_BOW-SPORTFISHER_STERN;
export const SPORTFISHER_DECK={minX:-1.38,maxX:1.38,minZ:sportfisherZ(-4.35),maxZ:sportfisherZ(-2.05),spawnZ:sportfisherZ(-3.25)};
