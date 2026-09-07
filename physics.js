// Metres, seconds, radians. Local +Z is the fork direction; local +X is operator left.
import {cargoSize} from './cargo.js';
export const SETTINGS={wheelbase:1.341,frontAxle:.605,maxForward:8/3.6,maxReverse:5/3.6,minFork:.045,maxFork:3.23,pickupOffset:1.63,supportOffset:.060};
export const SPEED_MODES={precision:{name:'Precisão',kmh:3,maxForward:3/3.6},normal:{name:'Normal',kmh:6,maxForward:6/3.6},travel:{name:'Deslocamento',kmh:8,maxForward:8/3.6}};
export const loadOffset=p=>SETTINGS.pickupOffset+Math.max(0,cargoSize(p).depth-.8)/2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const moveToward=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
export function localToWorld(s,x,z){return{x:s.x+Math.cos(s.yaw)*x+Math.sin(s.yaw)*z,z:s.z-Math.sin(s.yaw)*x+Math.cos(s.yaw)*z};}
export function worldToLocal(s,x,z){let dx=x-s.x,dz=z-s.z;return{x:Math.cos(s.yaw)*dx-Math.sin(s.yaw)*dz,z:Math.sin(s.yaw)*dx+Math.cos(s.yaw)*dz};}
export function obb(x,z,hx,hz,yaw=0,minY=-10,maxY=10){return{x,z,hx,hz,yaw,minY,maxY};}
export function overlaps(a,b,epsilon=.001){
 if(a.maxY<=b.minY+epsilon||b.maxY<=a.minY+epsilon)return false;
 const ax=[Math.cos(a.yaw),-Math.sin(a.yaw)],az=[Math.sin(a.yaw),Math.cos(a.yaw)],bx=[Math.cos(b.yaw),-Math.sin(b.yaw)],bz=[Math.sin(b.yaw),Math.cos(b.yaw)];
 const dx=b.x-a.x,dz=b.z-a.z,dot=(u,v)=>u[0]*v[0]+u[1]*v[1];
 for(let n of[ax,az,bx,bz]){let ra=a.hx*Math.abs(dot(ax,n))+a.hz*Math.abs(dot(az,n)),rb=b.hx*Math.abs(dot(bx,n))+b.hz*Math.abs(dot(bz,n));if(Math.abs(dx*n[0]+dz*n[1])>=ra+rb-epsilon)return false;}return true;
}
export function relativeBox(s,x,z,hx,hz,minY,maxY){const p=localToWorld(s,x,z);return obb(p.x,p.z,hx,hz,s.yaw,minY,maxY);}
export function palletParts(p){const a=[],size=cargoSize(p),sx=size.width/1.2,sz=size.depth/.8;const add=(x,z,hx,hz,y0,y1)=>a.push(relativeBox(p,x*sx,z*sz,hx*sx,hz*sz,y0+(p.y||0),y1+(p.y||0)));
 for(let x of[-.485,0,.485]){add(x,0,.065,.4,0,.023);for(let z of[-.335,0,.335])add(x,z,.065,.065,.023,.101);}
 for(let z of[-.335,0,.335])add(0,z,.6,.065,.101,.121);
 for(let x of[-.525,-.275,0,.275,.525])add(x,0,.0725,.4,.121,.144);
 if(p.boxes)add(0,0,.565,.366,.144,size.height);return a;
}
export function hydraulicBoxes(s){const a=[];for(let x of[-.235,.235])a.push(relativeBox(s,x,1.604,.043,.52,s.fork,s.fork+.040));a.push(relativeBox(s,0,1.0,.471,.08,s.fork+.015,s.fork+.815));const extension=Math.max(0,s.fork-1.42);if(extension>0)a.push(relativeBox(s,0,.938,.34,.08,2.10,2.16+extension));return a;}
export function truckBoxes(s,includeForks=true){const a=[relativeBox(s,0,-.025,.548,.903,.145,1.0),relativeBox(s,0,.938,.42,.108,.09,2.16)];if(includeForks)a.push(...hydraulicBoxes(s));return a;}
export function alignment(s,p){const l=worldToLocal(s,p.x,p.z);let angle=Math.abs(Math.atan2(Math.sin(s.yaw-p.yaw),Math.cos(s.yaw-p.yaw)));angle=Math.min(angle,Math.PI-angle);const relativeHeight=s.fork-(p.y||0),offset=loadOffset(p);return{local:l,angle,relativeHeight,ready:!p.attached&&Math.abs(l.x)<.065&&l.z>=offset-.12&&l.z<=offset+.10&&angle<.075&&relativeHeight>=.042&&relativeHeight<=.064&&Math.abs(s.v)<.16};}
export function containedInSlot(footprint,slot){const c=worldToLocal(slot,footprint.x,footprint.z),a=footprint.yaw-slot.yaw,{width,depth}=cargoSize(footprint);const halfX=Math.abs(Math.cos(a))*width/2+Math.abs(Math.sin(a))*depth/2,halfZ=Math.abs(Math.sin(a))*width/2+Math.abs(Math.cos(a))*depth/2;return Math.abs(c.x)+halfX<=slot.hx+.001&&Math.abs(c.z)+halfZ<=slot.hz+.001;}
export function fitsSlot(p,slot){const size=cargoSize(p);return size.width<=slot.hx*2+.001&&size.depth<=slot.hz*2+.001&&size.height<=(slot.clearHeight??Infinity)+.001;}
export function palletBounds(p){const size=cargoSize(p),y=p.y||0;return obb(p.x,p.z,size.width/2,size.depth/2,p.yaw,y,y+size.height);}
export class Simulation{
 constructor(obstacles=[],pallets=[],slots=[]){this.obstacles=obstacles;this.pallets=pallets;this.slots=slots;this.input={};this.speedMode='normal';this.collisionCooldown=0;this.reset();}
 reset(){this.state={x:-1.2,z:-3.9,yaw:0,v:0,steer:0,fork:.05,loaded:null};this.released=null;this.time=0;this.collisionCooldown=0;this.forkBlocked=false;this.maxSpeed=this.speedLimit();}
 speedLimit(){const s=this.state,selected=SPEED_MODES[this.speedMode].maxForward;let limit=Math.min(selected,s.loaded?6/3.6:SETTINGS.maxForward);if(s.fork>.40)limit=Math.min(limit,3/3.6);return Math.min(limit,SETTINGS.maxForward/(1+Math.abs(s.steer)*1.55));}
 setSpeedMode(mode){if(!Object.hasOwn(SPEED_MODES,mode))return false;this.speedMode=mode;this.maxSpeed=this.speedLimit();return true;}
 collision(s,includeForks=true,hydraulicsOnly=false){const parts=hydraulicsOnly?hydraulicBoxes(s):truckBoxes(s,includeForks),size=s.loaded?cargoSize(s.loaded):null;let carried=size?relativeBox(s,0,loadOffset(s.loaded),size.width/2,size.depth/2,s.fork-SETTINGS.supportOffset,s.fork-SETTINGS.supportOffset+size.height):null;
  for(let o of this.obstacles){if(parts.some(b=>overlaps(b,o))||(carried&&overlaps(carried,o)))return 'obstacle';}
  for(let p of this.pallets){if(p===s.loaded)continue;const bounds=palletBounds(p);if(!hydraulicsOnly&&overlaps(parts[0],bounds))return 'pallet';if(carried&&overlaps(carried,bounds))return 'load';if(includeForks){const pp=palletParts(p);if((hydraulicsOnly?parts:parts.slice(1)).some(b=>pp.some(a=>overlaps(b,a))))return 'fork';}}
  return null;
 }
 step(dt){dt=Math.min(dt,.04);const steps=Math.ceil(dt/(1/120));let event=null;for(let j=0;j<steps;j++){const e=this.substep(dt/steps);if(e)event=e;}return event;}
 substep(dt){let s=this.state,i=this.input;this.time+=dt;this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);
  let steering=(i.left?1:0)-(i.right?1:0),throttle=(i.forward?1:0)-(i.reverse?1:0),lift=(i.lift?1:0)-(i.lower?1:0);
  s.steer=moveToward(s.steer,steering*.97,dt*1.55);
  let max=this.speedLimit();this.maxSpeed=max;
  let target=throttle>0?max:throttle<0?-Math.min(max,SETTINGS.maxReverse):0;
  let braking=!throttle||s.v*throttle<0||Math.abs(s.v)>Math.abs(target);s.v=moveToward(s.v,target,dt*(braking?1.6:s.loaded?.46:.64));
  let next={...s};const yawRate=s.v*Math.tan(s.steer)/SETTINGS.wheelbase;next.yaw=s.yaw+yawRate*dt;
  const front=localToWorld(s,0,SETTINGS.frontAxle),mid=s.yaw+yawRate*dt*.5;next.x=front.x+Math.sin(mid)*s.v*dt-Math.sin(next.yaw)*SETTINGS.frontAxle;next.z=front.z+Math.cos(mid)*s.v*dt-Math.cos(next.yaw)*SETTINGS.frontAxle;
  let hit=this.collision(next);let event=null;
  if(hit&&Math.abs(s.v)>.0001){let direction=Math.sign(s.v);if(this.collisionCooldown===0){let bounce={...s,x:s.x-Math.sin(s.yaw)*direction*.025,z:s.z-Math.cos(s.yaw)*direction*.025};if(!this.collision(bounce)){s.x=bounce.x;s.z=bounce.z;}event={type:'collision',kind:hit};this.collisionCooldown=.55;}s.v=0;}else{s.x=next.x;s.z=next.z;s.yaw=next.yaw;}
  // Keep the released forks in their clear extraction channel until they leave the pallet.
  if(this.released&&!this.withdrawalPending())this.released=null;
  if(this.released)lift=0;
  this.forkBlocked=false;if(lift){
   // Lifting an aligned pallet engages it naturally, without requiring a separate click first.
   if(lift>0&&!s.loaded){const n=this.nearest();if(n?.ready){const result=this.attach(n.p);if(result.ok)event={type:'pickup',message:'Pallet apoiado nos garfos. Continue segurando SUBIR.'};}}
   let h=clamp(s.fork+lift*dt*(s.loaded?.30:.43),s.loaded?SETTINGS.supportOffset:SETTINGS.minFork,SETTINGS.maxFork);let candidate={...s,fork:h};if(!this.collision(candidate,true,true)){s.fork=h;}else{this.forkBlocked=true;if(this.collisionCooldown===0){event={type:'collision',kind:'hydraulic'};this.collisionCooldown=.7;}}
  }
  if(s.loaded){let pos=localToWorld(s,0,loadOffset(s.loaded));Object.assign(s.loaded,{...pos,y:s.fork-SETTINGS.supportOffset,yaw:s.yaw});}
  return event;
 }
 nearest(){let best=null,bestD=Infinity;for(let p of this.pallets){if(p===this.state.loaded)continue;let a=alignment(this.state,p);let d=Math.hypot(a.local.x,a.local.z-loadOffset(p),a.relativeHeight-.05);if(d<bestD){bestD=d;best={p,...a,d};}}return best;}
 slotOccupied(slot){return slot.blocked||this.pallets.some(p=>!p.attached&&(p.slotId===slot.id||(Math.abs((p.y||0)-slot.y)<.02&&overlaps(obb(slot.x,slot.z,slot.hx,slot.hz,slot.yaw),{...palletBounds(p),minY:-10,maxY:10}))));}
 storageTarget(){const s=this.state;if(!s.loaded)return null;const pos=localToWorld(s,0,loadOffset(s.loaded)),size=cargoSize(s.loaded);let best=null,score=Infinity;for(let slot of this.slots){if(this.slotOccupied(slot)||!fitsSlot(s.loaded,slot))continue;const targetZ=slot.z-Math.min(.10,Math.max(0,slot.hz-size.depth/2-.01)),d=Math.hypot(pos.x-slot.x,pos.z-targetZ),gap=s.fork-SETTINGS.supportOffset-slot.y,q=d+Math.abs(gap)*.7;if(q<score){score=q;best={slot,d,gap,contained:containedInSlot({...s.loaded,...pos,yaw:s.yaw},slot),forkHeight:slot.y+SETTINGS.supportOffset};}}return best;}
 support(tolerance=.012){const s=this.state,pos=localToWorld(s,0,loadOffset(s.loaded)),bottom=s.fork-SETTINGS.supportOffset;if(bottom<=tolerance)return{y:0,slot:null};for(let slot of this.slots){if(!this.slotOccupied(slot)&&fitsSlot(s.loaded||{},slot)&&bottom>=slot.y-.001&&bottom-slot.y<=tolerance&&containedInSlot({...s.loaded,...pos,yaw:s.yaw},slot))return{y:slot.y,slot};}return null;}
 withdrawalPending(){if(!this.released)return false;const bounds={...palletBounds(this.released),minY:-10,maxY:10};return hydraulicBoxes(this.state).slice(0,2).some(b=>overlaps({...b,minY:-10,maxY:10},bounds));}
 attach(p){const s=this.state,targetFork=(p.y||0)+SETTINGS.supportOffset,candidate={...s,fork:targetFork,loaded:p};if(this.collision(candidate))return{ok:false,message:'Não há espaço livre para fixar a carga.'};s.fork=targetFork;s.loaded=p;this.released=null;p.attached=true;p.slotId=null;const pos=localToWorld(s,0,loadOffset(s.loaded));Object.assign(p,{...pos,y:s.fork-SETTINGS.supportOffset,yaw:s.yaw});return{ok:true,type:'pickup',p,message:'Pallet preso. Segure SUBIR para elevar a carga.'};}
 toggleLoad(){const s=this.state;if(Math.abs(s.v)>.16)return{ok:false,message:'Pare o equipamento para operar a carga.'};
  if(s.loaded){const support=this.support(.030);if(!support)return{ok:false,message:'Centralize a carga em uma vaga livre e desça até apoiar na prateleira ou no piso.'};const p=s.loaded,pos=localToWorld(s,0,loadOffset(s.loaded));Object.assign(p,{...pos,yaw:s.yaw,y:support.y,attached:false,slotId:support.slot?.id||null});s.fork=support.y+.045;s.loaded=null;this.released=p;return{ok:true,type:'release',p,message:support.slot?`Material guardado no ${support.slot.bay}, nível ${support.slot.level}. Garfos livres: recue em linha reta.`:'Carga solta no piso. Garfos livres: recue em linha reta.'};}
  if(this.withdrawalPending())return{ok:false,message:'A carga já está solta. Recue em linha reta para retirar os garfos e buscar outro pallet.'};
  const n=this.nearest();if(!n?.ready)return{ok:false,message:'Alinhe os garfos nos vãos do pallet e ajuste a altura.'};return this.attach(n.p);
 }
}
