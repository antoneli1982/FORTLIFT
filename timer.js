import {containedInSlot,fitsSlot} from './physics.js';

export const formatTime=(seconds,roundUp=false)=>{const n=Math.max(0,roundUp?Math.ceil(seconds):Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};

// Use monotonic wall time, independent of graphics frame rate or simulation pauses.
export class StorageTimer {
 constructor(){this.limit=180;this.reset();}
 reset(){this.status='idle';this.elapsed=0;this.startedAt=null;this.completedSlot=null;}
 setMinutes(minutes){if(this.status==='running'||!Number.isInteger(minutes)||minutes<1||minutes>30)return false;this.limit=minutes*60;this.reset();return true;}
 start(now){this.reset();this.status='running';this.startedAt=now;}
 get remaining(){return Math.max(0,this.limit-this.elapsed);}
 tick(now){
  if(this.status!=='running')return null;
  this.elapsed=Math.min(this.limit,Math.max(this.elapsed,(now-this.startedAt)/1000));
  if(this.elapsed>=this.limit){this.status='expired';return 'expired';}
  return null;
 }
 recordStorage(result,slot,now){
  this.tick(now);const p=result?.p;
  if(this.status!=='running'||!result?.ok||result.type!=='release'||!p?.boxes||p.attached||!slot||slot.blocked||p.slotId!==slot.id||Math.abs(p.y-slot.y)>.012||!fitsSlot(p,slot)||!containedInSlot(p,slot))return false;
  this.status='completed';this.completedSlot=slot;return true;
 }
}
