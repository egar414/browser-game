// Surf physics in metres, seconds and radians. Assistance is kept separate.
export const SURF_PHYSICS={
 gravity:9.81,rideHeight:.12,contactFrequency:26,
 contactReach:.38,noseSample:.38,tailSample:-.36,
 steeringResponse:10,yawResponse:14,railResponse:8,
 gripSlipSpeed:6,gripFloor:.65,compressionResponse:7,
 pumpLoadRate:.7,pumpMaxCharge:.8,pumpMaxBoost:.75,pumpCooldown:1.1,
 stallDrag:.28,baseDrag:.035,speedDrag:.007,turnDrag:.075,
 airPitchRate:.9,landingWobbleDecay:4,
 turnMinDistance:1.8,turnMinAngle:.4,turnMinSpeed:3.8,
};
export const SURF_ASSIST={
 forgiving:{tolerance:.45,autoCrouch:1,landingAlign:.45,whitewaterSpeed:2.6,whitewaterSeconds:2.4},
 standard:{tolerance:.2,autoCrouch:.44,landingAlign:.2,whitewaterSpeed:3.1,whitewaterSeconds:1.4},
 expert:{tolerance:0,autoCrouch:0,landingAlign:0,whitewaterSpeed:3.5,whitewaterSeconds:.6},
};
