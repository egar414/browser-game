export class GameAudio {
  constructor(settings) { this.settings=settings;this.context=null; }
  start() {
    if(this.context){this.context.resume().catch(()=>{});return;}
    try {
      const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.connect(ctx.destination);
      this.engineGain=ctx.createGain();this.engineGain.gain.value=0;this.engineGain.connect(this.master);
      this.osc=ctx.createOscillator();this.osc.type='sawtooth';
      const filter=this.engineFilter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;
      this.osc.connect(filter);filter.connect(this.engineGain);this.osc.start();
      this.sub=ctx.createOscillator();this.sub.type='sine';this.sub.connect(this.engineGain);this.sub.start();
      const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const data=buffer.getChannelData(0);
      let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*2-1)*.96;data[i]=last*.2;}
      this.splashBuffer=buffer;
      const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
      this.waterGain=ctx.createGain();this.waterGain.gain.value=0;
      const low=ctx.createBiquadFilter();low.frequency.value=1800;noise.connect(low);low.connect(this.waterGain);this.waterGain.connect(this.master);noise.start();
    } catch {this.context=null;}
  }
  update(v,playing) {
    if(!this.context)return;const now=this.context.currentTime,s=this.settings;
    this.master.gain.setTargetAtTime(s.muted?0:s.master*.28,now,.12);
    this.engineGain.gain.setTargetAtTime(playing?s.engine*(.07+Math.abs(v.throttle)*.10):0,now,.12);
    if(this.engineType!==v.type){
      this.engineType=v.type;const real=new Float32Array(16),imag=new Float32Array(16);
      for(let n=1;n<16;n++)imag[n]=(v.type==='ski'?1/Math.pow(n,1.7):Math.exp(-n*.16)/n)*(n%2===0?.65:1);
      this.osc.setPeriodicWave(this.context.createPeriodicWave(real,imag));
    }
    const rpm=Math.max(v.type==='ski'?1000:750,v.drive?.rpm||0),load=(v.drive?.wetness||0)*Math.abs(v.throttle);
    // Three-cylinder four-stroke PWC versus an original two-stroke outboard timbre.
    const firing=rpm/60*(v.type==='ski'?1.5:v.type==='tinny'?2:3);
    this.osc.frequency.setTargetAtTime(firing,now,.12);
    this.sub.frequency.setTargetAtTime(rpm/60,now,.15);
    this.engineFilter.frequency.setTargetAtTime(450+load*1600+(v.drive?.ventilation||0)*450,now,.16);
    this.waterGain.gain.setTargetAtTime(playing?s.water*(.025+v.speed*.011+Math.abs(v.slip)*.015):0,now,.2);
  }
  splash(impact) {
    if(!this.context)return;const ctx=this.context;
    const noise=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();noise.buffer=this.splashBuffer;
    filter.type='lowpass';filter.frequency.value=650+Math.min(impact,12)*110;
    gain.gain.setValueAtTime(Math.min(.5,impact*.035)*this.settings.water,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);
    noise.connect(filter);filter.connect(gain);gain.connect(this.master);noise.start();noise.stop(ctx.currentTime+.55);

  }
}
