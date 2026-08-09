class SoundService {
  constructor(){this.ctx=null;this.master=.16;}
  enabled(){try{return localStorage.getItem('operation_sound_enabled')!=='0';}catch{return true;}}
  context(){if(!this.enabled())return null;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!this.ctx)this.ctx=new C();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});return this.ctx;}
  gain(ctx,vol=.15){const g=ctx.createGain();g.gain.value=Math.max(0,Math.min(1,vol*this.master));g.connect(ctx.destination);return g;}
  tone(freq=220,dur=.12,type='sine',vol=.4,when=0){const c=this.context();if(!c)return;const o=c.createOscillator(),g=this.gain(c,vol);o.type=type;o.frequency.setValueAtTime(freq,c.currentTime+when);g.gain.setValueAtTime(vol*this.master,c.currentTime+when);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+when+dur);o.connect(g);o.start(c.currentTime+when);o.stop(c.currentTime+when+dur+.02);}
  noise(dur=.15,vol=.3,filterFreq=900){const c=this.context();if(!c)return;const len=Math.max(1,Math.floor(c.sampleRate*dur)),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=this.gain(c,vol);filter.type='lowpass';filter.frequency.value=filterFreq;src.buffer=buf;src.connect(filter);filter.connect(g);src.start();}
  doorOpen(){this.noise(.22,.55,1050);this.tone(118,.22,'sawtooth',.18);this.tone(88,.18,'sine',.24,.08);}
  doorClose(){this.noise(.09,.7,620);this.tone(72,.13,'triangle',.42);this.tone(48,.18,'sine',.24,.02);}
  success(){this.tone(440,.08,'sine',.22);this.tone(660,.12,'sine',.24,.08);}
  upload(){this.tone(230,.08,'triangle',.16);this.tone(360,.1,'triangle',.18,.07);this.tone(540,.11,'triangle',.18,.14);}
  error(){this.tone(160,.14,'sawtooth',.2);this.tone(115,.18,'sawtooth',.22,.11);}
  notification(){this.tone(720,.08,'sine',.15);this.tone(880,.11,'sine',.18,.12);}
}
export default new SoundService();
