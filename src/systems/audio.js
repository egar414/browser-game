export class GameAudio {
  constructor(settings) { this.settings=settings;this.context=null; }
  start() {
    if(this.context){this.context.resume().catch(()=>{});return;}
    try {
      const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.connect(ctx.destination);
      this.engineGain=ctx.createGain();this.engineGain.gain.value=0;this.engineGain.connect(this.master);
      this.osc=ctx.createOscillator();this.osc.type='sawtooth';
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;
      this.osc.connect(filter);filter.connect(this.engineGain);this.osc.start();
      this.sub=ctx.createOscillator();this.sub.type='sine';this.sub.connect(this.engineGain);this.sub.start();
      const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const data=buffer.getChannelData(0);
      let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*2-1)*.96;data[i]=last*.2;}
      const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
      this.waterGain=ctx.createGain();this.waterGain.gain.value=0;
      const low=ctx.createBiquadFilter();low.frequency.value=1800;noise.connect(low);low.connect(this.waterGain);this.waterGain.connect(this.master);noise.start();
    } catch {this.context=null;}
  }
  update(v,playing) {
    if(!this.context)return;const now=this.context.currentTime,s=this.settings;
    this.master.gain.setTargetAtTime(s.muted?0:s.master*.28,now,.12);
    this.engineGain.gain.setTargetAtTime(playing?s.engine*(.07+Math.abs(v.throttle)*.10):0,now,.12);
    const base=v.type==='ski'?57:36;
    this.osc.frequency.setTargetAtTime(base+v.speed*(v.type==='ski'?7.3:4.5)+Math.max(0,v.throttle)*35+(v.airborne?35:0),now,.16);
    this.sub.frequency.setTargetAtTime(base*.5+v.speed*1.5,now,.18);
    this.waterGain.gain.setTargetAtTime(playing?s.water*(.025+v.speed*.011+Math.abs(v.slip)*.015):0,now,.2);
  }
  splash(impact) {
    if(!this.context)return;const ctx=this.context;
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(120,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(25,ctx.currentTime+.3);
    gain.gain.setValueAtTime(Math.min(.3,impact*.018)*this.settings.water,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);
    osc.connect(gain);gain.connect(this.master);osc.start();osc.stop(ctx.currentTime+.4);
  }
}
