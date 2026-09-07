import {obb} from './physics.js';

export const RACK={width:2.7,depth:1.18,height:4.78,levels:[.34,1.80,2.90]};

// Colliders follow the posts, braced side frames, beams and supporting decks.
// The open volume between levels is deliberately not a solid collider.
export function rackLayout(x,z,bay,empty=false){
 const {width,depth,height,levels}=RACK,obstacles=[],slots=[];
 for(let dx of[-width/2,width/2]){
  for(let dz of[-depth/2,depth/2]){
   obstacles.push(obb(x+dx,z+dz,.0385,.0385,0,0,height));
   obstacles.push(obb(x+dx,z+dz,.08,.08,0,0,.04));
  }
  obstacles.push(obb(x+dx,z,.02,depth/2,0,.35,4.65));
 }
 for(let [level,y]of levels.entries()){
  for(let dz of[-depth/2,depth/2])obstacles.push(obb(x,z+dz,width/2,.036,0,y-.15,y-.02));
  obstacles.push(obb(x,z,(width-.04)/2,(depth-.08)/2,0,y-.028,y));
  for(let [column,dx]of[-.66,.66].entries()){
   const id=`${bay.replaceAll(' ','')}-N${level+1}-${column+1}`;
   slots.push({id,bay,x:x+dx,z,y,yaw:0,hx:.65,hz:.55,clearHeight:(levels[level+1]??4.65)-y-.17,level:level+1,column:column+1,blocked:!empty,targetZ:z-.10});
   if(!empty)obstacles.push(obb(x+dx,z,.60,.40,0,y,y+.71));
  }
 }
 for(let dz of[-depth/2,depth/2])obstacles.push(obb(x,z+dz,width/2,.036,0,4.585,4.715));
 return{obstacles,slots};
}
