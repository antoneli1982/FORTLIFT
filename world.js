import * as T from 'three';
import {V,box,beam,cyl,label,textTexture,materials as M,procedural,createPallet} from './model.js';
import {obb} from './physics.js';
import {PRODUCTS,cargoSize} from './cargo.js';
import {RACK,rackLayout} from './racks.js';
export function createWarehouse(scene,mobile){
 const root=new T.Group();scene.add(root);const obstacles=[],slots=[],slotMarkers=[];
 const concrete=procedural('concrete',512);concrete.repeat.set(12,16);const floorMat=new T.MeshStandardMaterial({color:'#b2b9b8',map:concrete,bumpMap:concrete,bumpScale:.011,roughness:.82,metalness:.06});
 const floor=new T.Mesh(new T.PlaneGeometry(24,32),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;root.add(floor);
 const seam=new T.MeshStandardMaterial({color:'#737c7c',roughness:.92});for(let x=-12;x<=12;x+=3)box(root,.009,.002,32,x,.001,0,seam);for(let z=-16;z<=16;z+=4)box(root,24,.002,.009,0,.001,z,seam);
 const wall=new T.MeshStandardMaterial({color:'#b6c0c1',roughness:.78});const wallBase=new T.MeshStandardMaterial({color:'#57666c',roughness:.87});
 box(root,.20,6.6,32,-12,3.3,0,wall);box(root,.20,6.6,32,12,3.3,0,wall);box(root,24,6.6,.2,0,3.3,16,wall);box(root,24,6.6,.2,0,3.3,-16,wall);
 obstacles.push(obb(-12,0,.1,16),obb(12,0,.1,16),obb(0,16,12,.1),obb(0,-16,12,.1));
 for(let x of[-11.87,11.87])box(root,.025,1.12,32,x,.56,0,wallBase);
 for(let z of[-15.87,15.87])box(root,24,1.12,.026,0,.56,z,wallBase);
 // Corrugated wall ribs and steel roof trusses.
 for(let z=-15.6;z<16;z+=.6)for(let x of[-11.86,11.86])box(root,.024,5.45,.025,x,3.92,z,wall);
 const structure=new T.MeshStandardMaterial({color:'#3f5059',metalness:.7,roughness:.45});
 for(let z=-14;z<=14;z+=7){for(let x of[-11.6,11.6]){box(root,.20,6.6,.23,x,3.3,z,structure);box(root,.31,.036,.35,x,.025,z,M.steel);obstacles.push(obb(x,z,.16,.18));}box(root,23.4,.18,.20,0,6.6,z,structure);box(root,23.4,.10,.12,0,5.89,z,structure);for(let x=-11.5;x<11.5;x+=2.3)beam(root,[x,5.89,z],[x+1.15,6.6,z],.067,.075,structure);for(let x=-10.35;x<11.5;x+=2.3)beam(root,[x,6.6,z],[x+1.15,5.89,z],.067,.075,structure);}
 const ceiling=new T.MeshStandardMaterial({color:'#bac4c8',roughness:.88,side:T.DoubleSide});box(root,24,.035,32,0,6.85,0,ceiling);
 const lum=new T.MeshStandardMaterial({color:'#f9faf4',emissive:'#f5f3df',emissiveIntensity:3,roughness:.1});
 for(let x of[-7,0,7])for(let z of[-11,-3,5,12]){box(root,1.1,.06,.22,x,6.03,z,structure,.008);box(root,1.02,.012,.18,x,5.988,z,lum,.008);beam(root,[x,6.61,z],[x,6.06,z],.008,.008,M.steel);}
 // High clerestory windows, dock shutters and safety bollards.
 const windowmat=new T.MeshStandardMaterial({color:'#d8eaf0',emissive:'#a6cbd7',emissiveIntensity:.6,roughness:.2,metalness:.2});
 for(let x=-9;x<=9;x+=3){box(root,2.4,1.0,.021,x,5.05,15.866,windowmat);box(root,.035,1.02,.03,x,5.05,15.84,structure);}
 for(let x of[-7,0,7]){
  box(root,3.7,3.7,.14,x,1.85,15.83,structure);box(root,3.40,3.4,.07,x,1.72,15.71,M.silver);
  for(let y=.25;y<3.35;y+=.22)box(root,3.40,.018,.027,x,y,15.66,seam);
  const sign=textTexture([{text:'DOCA '+(x<0?'01':x===0?'02':'03'),size:62,y:83,align:'center',x:256}],{w:512,h:132,bg:'#1f2c34'});label(root,sign,1.5,.39,x,4,15.64,Math.PI);
  for(let side of[-1,1]){cyl(root,.083,.083,.88,x+side*2.0,.44,15.12,M.yellow,16);for(let y of[.19,.51,.79])cyl(root,.085,.085,.12,x+side*2.0,y,15.12,M.dark,16);obstacles.push(obb(x+side*2,15.12,.1,.1,0,0,.9));}
 }
 function floorLine(x,z,w,d){box(root,w,.003,d,x,.005,z,M.yellow);}
 for(let x of[-3.7,3.7]){floorLine(x,1.3,.06,24);for(let z=-10;z<=12;z+=3)floorLine(x+(x>0?.13:-.13),z,.055,.5);}
 for(let z of[-11.6,12.2])floorLine(0,z,7.45,.055);
 const area=textTexture([{text:'MOVIMENTAÇÃO',size:60,y:81,align:'center',x:512},{text:'MANTENHA A ÁREA LIVRE',size:31,y:136,align:'center',x:512}],{w:1024,h:180,color:'#d0b34c'});label(root,area,3.5,.615,0,.008,-10,Math.PI,-Math.PI/2);
 const rackGroup=new T.Group();root.add(rackGroup);
 function rack(x,z,bay){const {width,depth,levels}=RACK;const layout=rackLayout(x,z,bay,true);obstacles.push(...layout.obstacles);slots.push(...layout.slots);
  for(let dx of[-width*.5,width*.5])for(let dz of[-depth*.5,depth*.5]){box(rackGroup,.077,4.78,.077,x+dx,2.39,z+dz,M.rack);box(rackGroup,.16,.032,.16,x+dx,.017,z+dz,M.steel);for(let yy=.5;yy<4.6;yy+=.3)box(rackGroup,.025,.014,.002,x+dx,yy,z+dz-.04,M.dark);}
  for(let y of levels){for(let dz of[-depth*.5,depth*.5])box(rackGroup,width,.13,.072,x,y-.085,z+dz,M.beam);box(rackGroup,width-.04,.028,depth-.08,x,y-.014,z,M.steel);}
  for(let dz of[-depth*.5,depth*.5])box(rackGroup,width,.13,.072,x,4.65,z+dz,M.beam);
  for(let side of[-1,1])for(let yy=.4;yy<4.1;yy+=1.25){beam(rackGroup,[x+side*width*.5,yy,z-depth*.5],[x+side*width*.5,yy+1.2,z+depth*.5],.03,.023,M.rack);beam(rackGroup,[x+side*width*.5,yy+1.2,z-depth*.5],[x+side*width*.5,yy,z+depth*.5],.03,.023,M.rack);}
  const code=textTexture([{text:bay,size:46,y:51,align:'center',x:128}],{bg:'#f3f0df',color:'#283942',w:256,h:72});label(rackGroup,code,.43,.12,x,1.72,z-depth*.5-.045,Math.PI);
  for(let slot of layout.slots){
   const marker=new T.Group();marker.position.set(slot.x,slot.y+.008,slot.z);scene.add(marker);
   const material=new T.MeshBasicMaterial({color:'#82cba0',transparent:true,opacity:.80,depthWrite:false});
   for(let dx of[-.60,.60])box(marker,.013,.003,1.0,dx,0,0,material);for(let dz of[-.5,.5])box(marker,1.21,.003,.013,0,0,dz,material);
   const tag=textTexture([{text:`N${slot.level} · ${slot.y.toFixed(2).replace('.',',')} m`,size:34,y:46,align:'center',x:128}],{bg:'#284839',w:256,h:64});label(rackGroup,tag,.42,.105,slot.x,slot.y-.083,z-depth*.5-.045,Math.PI);
   slotMarkers.push({slot,marker,material});
  }
 }
 for(let side of[-1,1])for(let j=0;j<4;j++){rack(side*6.7,-6+j*4.4,(side<0?'A':'B')+'0'+(j+1));}
 rack(0,6.8,'C01');
 const storeSign=textTexture([{text:'C01 · ARMAZENAGEM',size:49,y:64,align:'center',x:384}],{bg:'#243a31',w:768,h:100});label(rackGroup,storeSign,2.25,.293,0,4.2,6.16,Math.PI);
 // Twelve movable receiving loads and only three initially occupied rack slots.
 const products=Object.keys(PRODUCTS),positions=[{x:-1.2,z:0,product:'cartons'},{x:2.2,z:2.8,product:'drums'}];
 for(let i=0;i<10;i++)positions.push({x:[-8.8,-4.8,-.8,3.2,7.2][i%5],z:i<5?-9:-13,product:products[(i+2)%products.length]});
 for(const [bay,level,column,product]of[['A02',1,2,'crate'],['B03',3,1,'rolls'],['C01',1,2,'cartons']]){const slot=slots.find(s=>s.bay===bay&&s.level===level&&s.column===column);positions.push({x:slot.x,z:slot.z,y:slot.y,slotId:slot.id,product});}
 const pallets=positions.map((p,id)=>({...p,id,y:p.y||0,yaw:0,boxes:true,attached:false,slotId:p.slotId||null}));const palletMeshes=pallets.map(p=>{const m=createPallet(p);m.position.set(p.x,p.y,p.z);m.rotation.y=p.yaw;scene.add(m);return m;});
 for(const p of pallets.filter(p=>!p.slotId)){const{width,depth}=cargoSize(p);for(let dx of[-width/2-.14,width/2+.14])floorLine(p.x+dx,p.z,.025,depth+.28);for(let dz of[-depth/2-.14,depth/2+.14])floorLine(p.x,p.z+dz,width+.28,.025);}
 const initialPallets=pallets.map(p=>({...p}));return{root,obstacles,pallets,palletMeshes,slots,slotMarkers,initialPallets};
}
