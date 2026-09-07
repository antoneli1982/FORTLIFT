import {SETTINGS,clamp} from './physics.js';

// Layered electric traction, tyre noise, pump, reversing alarm and dual-tone horn.
// The graph is allocated once and unlocked by a real keyboard/touch gesture.
export class ForkliftSound {
 constructor(onState=()=>{}){this.enabled=true;this.context=null;this.onState=onState;this.unavailable=false;}
 init(){
  if(this.context||this.unavailable)return;
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Audio){this.unavailable=true;this.onState();return;}
  try{
   const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=0;
   const limiter=c.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=5;this.master.connect(limiter);limiter.connect(c.destination);
   const tone=(type,f,cutoff)=>{const osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();osc.type=type;osc.frequency.value=f;filter.type='lowpass';filter.frequency.value=cutoff;gain.gain.value=0;osc.connect(filter);filter.connect(gain);gain.connect(this.master);osc.start();return{osc,gain,filter};};
   this.motor=tone('triangle',90,650);this.inverter=tone('sine',400,1800);this.pump=tone('sawtooth',170,780);this.reverse=tone('sine',960,1600);
   this.hornA=tone('sawtooth',370,1500);this.hornB=tone('sawtooth',445,1650);
   const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let last=0;
   for(let i=0;i<data.length;i++){last=(last+.025*(Math.random()*2-1))/1.025;data[i]=last*8;}
   const noise=(frequency,q)=>{const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;source.loop=true;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();return{gain,filter};};
   this.rolling=noise(650,.6);this.flow=noise(1350,1.2);c.onstatechange=()=>this.onState();
  }catch{this.unavailable=true;this.context?.close().catch(()=>{});this.context=null;this.onState();}
 }
 unlock(){if(!this.enabled)return;this.init();if(this.context&&this.context.state!=='running')this.context.resume().then(()=>this.onState()).catch(()=>this.onState());this.onState();}
 setEnabled(on){this.enabled=on;if(on)this.unlock();else this.silence();this.onState();}
 silence(){if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.012);}
 update(sim,paused=false){
  const c=this.context;if(!c)return;
  const t=c.currentTime,s=sim.state,v=Math.abs(s.v),speed=clamp(v/SETTINGS.maxForward,0,1),working=sim.input.forward||sim.input.reverse;
  this.master.gain.setTargetAtTime(this.enabled&&!paused?.48:0,t,.025);
  const set=(voice,level)=>voice.gain.gain.setTargetAtTime(level,t,.028);
  const lifting=!!sim.input.lift!==!!sim.input.lower;
  const hydraulics=lifting&&!sim.forkBlocked&&!sim.withdrawalPending()&&(sim.input.lift?s.fork<SETTINGS.maxFork-.001:s.fork>(s.loaded?SETTINGS.supportOffset:SETTINGS.minFork)+.001);
  this.motor.osc.frequency.setTargetAtTime(68+speed*210+(working?12:0),t,.10);
  this.inverter.osc.frequency.setTargetAtTime(320+speed*1100,t,.10);
  set(this.motor,.014+speed*.10+(working&&v>.02?.025:0));set(this.inverter,v>.02?.011+speed*.032:0);
  this.rolling.filter.frequency.setTargetAtTime(250+speed*950,t,.12);set(this.rolling,speed*.22);
  this.pump.osc.frequency.setTargetAtTime(sim.input.lift?(s.loaded?185:165):135,t,.08);set(this.pump,hydraulics?.075:0);set(this.flow,hydraulics?.055:0);
  set(this.reverse,s.v<-.02&&sim.time%1.05<.39?.16:0);
  set(this.hornA,sim.input.horn?.18:0);set(this.hornB,sim.input.horn?.13:0);
 }
}
