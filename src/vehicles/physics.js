import { VEHICLES, SPAWN, WORLD, waveHeight } from '../config.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export class VehiclePhysics {
  constructor(type = 'ski', collision = () => null, onEvent = () => {}) {
    this.type = type; this.config = VEHICLES[type]; this.collision = collision; this.onEvent = onEvent;
    this.safe = { ...SPAWN }; this.recover();
  }
  recover(nearest = false) {
    if(nearest&&Number.isFinite(this.x)&&Number.isFinite(this.z)){
      const x=this.x,z=this.z;let found=false;
      for(const radius of [0,8,18,35,70]){
        for(let i=0;i<(radius?16:1);i++){
          const angle=i/16*Math.PI*2,nx=x+Math.sin(angle)*radius,nz=z+Math.cos(angle)*radius;
          if(nx>WORLD.minX+40&&nx<WORLD.maxX-40&&nz>WORLD.minZ+40&&nz<WORLD.maxZ-40&&!this.collision(nx,nz,4,0)){
            this.safe={x:nx,z:nz,heading:this.heading};found=true;break;
          }
        }
        if(found)break;
      }
    }
    Object.assign(this, { x: this.safe.x, z: this.safe.z, heading: this.safe.heading, vx: 0, vz: 0, vy: 0, y: 0.2,
      pitch: 0, roll: 0, yawRate: 0, throttle: 0, steer: 0, airborne: false, airTime: 0, spin: 0,
      wipeout: 0, wheelieTime: 0, donut: 0, driftTime: 0, trickCooldown: 0, speed: 0, slip: 0, boundary: false });
    this.previous = this.snapshot();
  }
  snapshot() { return { x: this.x, y: this.y, z: this.z, heading: this.heading, pitch: this.pitch, roll: this.roll }; }
  setType(type) { this.type = type; this.config = VEHICLES[type]; this.recover(); }
  wipe(reason) {
    if (this.wipeout) return;
    this.wipeout = 1.6; this.vx *= 0.15; this.vz *= 0.15; this.onEvent({ type: 'wipeout', label: reason });
  }
  update(dt, input, time, ramps = []) {
    this.previous = this.snapshot();
    if (this.wipeout > 0) { this.wipeout -= dt; if (this.wipeout <= 0) this.recover(true); return; }
    const c = this.config;
    this.trickCooldown = Math.max(0, this.trickCooldown - dt);
    this.throttle = damp(this.throttle, input.throttle, 3.6, dt);
    this.steer = damp(this.steer, input.steer, 6, dt);
    let fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let forward = this.vx * fx + this.vz * fz;
    this.speed = Math.hypot(this.vx, this.vz);
    this.slip = this.vx * fz - this.vz * fx;
    if (!this.airborne) {
      let acceleration = this.throttle * (this.throttle >= 0 ? c.acceleration : (forward > 1 ? 12 : c.reverseAcceleration));
      if (forward > c.maxSpeed || forward < -c.reverseMax) acceleration = 0;
      this.vx += fx * acceleration * dt; this.vz += fz * acceleration * dt;
      const grip = input.freestyle ? c.slideGrip : c.lateralGrip;
      const lateral = (this.vx * fz - this.vz * fx) * (1 - Math.exp(-grip * dt));
      this.vx -= fz * lateral; this.vz += fx * lateral;
      const drag = Math.exp(-(c.drag + this.speed * c.waterDrag) * dt);
      this.vx *= drag; this.vz *= drag;
      const authority = (0.22 + 0.78 * Math.max(0, this.throttle)) * Math.min(1, Math.abs(forward) / 5);
      const yawTarget = this.steer * c.steer * authority * Math.sign(forward || 1) * (input.freestyle ? 1.48 : 1);
      this.yawRate = damp(this.yawRate, yawTarget, this.type === 'ski' ? 4.5 : 2.8, dt);
    } else {
      this.yawRate = damp(this.yawRate, this.steer * c.airSteer, 2.5, dt);
      this.spin += this.yawRate * dt; this.airTime += dt;
      this.pitch = clamp(this.pitch + input.trim * dt * (this.type === 'ski' ? 0.9 : 0.45), -0.9, 1.1);
      this.vy -= 9.81 * dt;
    }
    this.heading += this.yawRate * dt;
    const oldX = this.x, oldZ = this.z;
    this.x += this.vx * dt; this.z += this.vz * dt;
    const hit = this.collision(this.x, this.z, c.width * 0.5 + 0.35, this.y);
    if (hit) {
      this.x = oldX; this.z = oldZ;
      this.vx *= -0.22; this.vz *= -0.22;
      if (this.speed > 14) this.wipe('Hard collision');
      else if (this.trickCooldown === 0) { this.onEvent({ type: 'bump', label: 'Mind the shoreline' }); this.trickCooldown = 1; }
    }
    this.boundary = this.x < WORLD.minX + 35 || this.x > WORLD.maxX - 35 || this.z < WORLD.minZ + 35 || this.z > WORLD.maxZ - 35;
    if (this.x < WORLD.minX || this.x > WORLD.maxX || this.z < WORLD.minZ || this.z > WORLD.maxZ) { this.onEvent({ type: 'boundary', label: 'Back to safe water' }); this.recover(); return; }
    fx = Math.sin(this.heading); fz = Math.cos(this.heading);
    const half = c.length * 0.4, width = c.width * 0.43;
    // Four water samples: separate port/starboard and bow/stern supports.
    const samples = [-1, 1].map(side => [-1, 1].map(end => waveHeight(
      this.x + fx * half * end + fz * width * side,
      this.z + fz * half * end - fx * width * side, time)));
    const water = samples.flat().reduce((a, b) => a + b) / 4 + c.rideHeight;
    const surfacePitch = Math.atan2((samples[0][1] + samples[1][1] - samples[0][0] - samples[1][0]) / 2, half * 2);
    const surfaceRoll = Math.atan2((samples[1][0] + samples[1][1] - samples[0][0] - samples[0][1]) / 2, width * 2);
    if (!this.airborne) {
      const lift = this.type === 'ski' && input.freestyle && forward > 5 ? c.wheelieAngle * clamp(this.throttle, 0, 1) * clamp(1 - Math.abs(this.steer) * 0.85, 0, 1) : 0;
      const plane = this.type === 'cat' ? Math.max(0, this.throttle) * 0.2 * Math.exp(-Math.pow((this.speed - 7) / 8, 2)) : 0.035 * this.throttle;
      const trim = input.trim * (this.type === 'ski' ? 0.34 : 0.14);
      this.pitch = damp(this.pitch, surfacePitch + lift + plane + trim, 3, dt);
      this.roll = damp(this.roll, surfaceRoll + this.steer * clamp(this.speed / 25, 0, 1) * (this.type === 'ski' ? 0.43 : 0.18), 4, dt);
      this.vy += ((water - this.y) * c.spring - this.vy * c.damping) * dt;
      this.y += this.vy * dt;
      if (this.pitch > c.wipeoutAngle && this.speed > 6) this.wipe('Over the balance point');
      let onRamp=false;
      for (const ramp of ramps) {
        // A ramp rises toward +Z. Entering backward hits its foam-covered side instead of launching.
        if (Math.abs(this.x - ramp.x) < ramp.width / 2 && this.z > ramp.z - ramp.length / 2 && this.z < ramp.z + ramp.length / 2 && this.vz > 7) {
          onRamp=true;
          const slopeY = ((this.z - (ramp.z - ramp.length / 2)) / ramp.length) * ramp.height;
          this.y = Math.max(this.y, slopeY + c.rideHeight); this.vy = this.vz * ramp.height / ramp.length;
          if (this.z > ramp.z + ramp.length / 2 - Math.max(0.7, this.vz * dt * 1.5)) { this.launch(Math.max(4.5, this.vy+1), 0.23); break; }
        }
      }
      // Large steep chop can unweight a fast hull. No jump input or repeated aerial launch.
      if (!this.airborne && !onRamp && this.z > 170 && this.speed > 17 && this.y > water + 0.22 && this.vy > 1.2) this.launch(this.vy, this.pitch);
      if (!this.airborne && this.pitch > 0.65 && this.speed > 7) {
        this.wheelieTime += dt;
        if (this.wheelieTime > 1.6 && !this.trickCooldown) { this.onEvent({ type: 'score', label: 'Bow rider', points: 100 }); this.trickCooldown = 4; this.wheelieTime = 0; }
      } else this.wheelieTime = 0;
      if (Math.abs(this.yawRate) > 0.8 && this.speed > 5 && input.freestyle) {
        this.donut += Math.abs(this.yawRate) * dt;
        if (this.donut > Math.PI * 2 && !this.trickCooldown) { this.onEvent({ type: 'score', label: 'Rooster tail donut', points: 180 }); this.donut = 0; this.trickCooldown = 5; }
      } else this.donut = Math.max(0, this.donut - dt);
      if (Math.abs(this.slip) > 4 && this.speed > 10 && Math.abs(this.steer) > 0.25) {
        this.driftTime += dt;
        if (this.driftTime > 1 && !this.trickCooldown) { this.onEvent({ type: 'score', label: 'Spray carve', points: 75 }); this.trickCooldown = 4; this.driftTime = 0; }
      } else this.driftTime = 0;
    } else {
      this.y += this.vy * dt;
      if (this.y <= water && this.vy < 0) {
        const impact = -this.vy, lateralImpact = Math.abs(this.slip);
        this.y = water; this.airborne = false;
        this.onEvent({ type: 'splash', impact });
        if (Math.abs(this.pitch) > 0.85 || lateralImpact > 21 || impact > 13) this.wipe('Rough landing');
        else {
          const spins = Math.floor((Math.abs(this.spin) + 0.35) / (2 * Math.PI));
          const halfspin = Math.abs(this.spin) > Math.PI - 0.3;
          if (this.airTime > 0.45) this.onEvent({ type: 'score', label: spins ? `${spins * 360}° spin · landed` : halfspin ? '180° · landed' : 'Clean air', points: Math.round(this.airTime * 80) + (spins ? spins * 400 : halfspin ? 180 : 0) });
          const loss = clamp(1 - impact * 0.025 - lateralImpact * 0.012, 0.4, 0.95);
          this.vx *= loss; this.vz *= loss; this.vy = -impact * 0.08;
        }
        this.airTime = 0; this.spin = 0;
      }
    }
    if (!this.airborne && !hit && this.speed < 12 && Math.abs(this.pitch) < 0.4 && !this.boundary && this.z > 0) this.safe = { x: this.x, z: this.z, heading: this.heading };
    if (![this.x, this.y, this.z, this.heading, this.vx, this.vz].every(Number.isFinite) || this.y < -3) this.recover();
  }
  launch(velocity, pitch) { if (this.airborne) return; this.airborne = true; this.vy = velocity; this.pitch = pitch; this.airTime = 0; this.spin = 0; }
}
