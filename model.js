import * as T from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import {cargoSize} from './cargo.js';

export const V = (x,y,z)=>new T.Vector3(x,y,z);
const textureCache=new Map(),labelMaterialCache=new WeakMap(),boxCache=new Map(),cylinderCache=new Map();
const metal=(color,roughness=.4,metalness=.6)=>new T.MeshStandardMaterial({color,roughness,metalness});
export function procedural(kind,size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');let seed=7391;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const d=x.createImageData(size,size);
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){
  let n=rand(),v;if(kind==='wood')v=126+22*Math.sin(i*.16+Math.sin(j*.06)*1.5)+n*21;else if(kind==='rubber')v=92+n*60;else v=139+n*19+Math.sin(i*.045)*3+Math.cos(j*.03)*4;
  const k=(j*size+i)*4;d.data[k]=v;d.data[k+1]=kind==='wood'?v*.78:v;d.data[k+2]=kind==='wood'?v*.5:v;d.data[k+3]=255;
 }x.putImageData(d,0,0);
 if(kind==='wood'){x.strokeStyle='#71553555';for(let i=0;i<45;i++){let a=rand()*size;x.beginPath();x.moveTo(a,0);x.bezierCurveTo(a+8,size*.3,a-4,size*.7,a,size);x.stroke();}}
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;return tex;
}
export const materials={silver:metal('#aeb5b7',.32,.65),orange:metal('#ff7509',.28,.34),dark:metal('#232b2e',.47,.55),steel:metal('#4e595c',.27,.82),chrome:metal('#b8c4cc',.18,.95),black:metal('#11171a',.73,.05),rubber:metal('#202629',.9,.02),leather:metal('#262d30',.68,.02),red:metal('#e3291d',.32,.2),yellow:metal('#f3b81f',.43,.35),wood:metal('#c6a579',.91,0),rack:metal('#526d76',.47,.65),beam:metal('#dc6726',.48,.5),cardboard:metal('#bc976c',.95,0)};
export function initTextures(){let t=procedural('rubber');t.repeat.set(5,5);materials.rubber.bumpMap=t;materials.rubber.bumpScale=.0016;materials.leather.bumpMap=t;materials.leather.bumpScale=.002;materials.wood.map=procedural('wood');materials.wood.bumpMap=materials.wood.map;materials.wood.bumpScale=.002;}
export function mesh(parent,geometry,mat,x=0,y=0,z=0){let m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function box(p,w,h,d,x,y,z,m,r=0){let key=[w,h,d,r].join(',');let g=boxCache.get(key);if(!g){g=r?new RoundedBoxGeometry(w,h,d,r<.015?1:3,Math.min(r,w*.49,h*.49,d*.49)):new T.BoxGeometry(w,h,d);boxCache.set(key,g);}return mesh(p,g,m,x,y,z);}
export function cyl(p,r1,r2,h,x,y,z,m,n=24){let key=[r1,r2,h,n].join(',');let g=cylinderCache.get(key);if(!g){g=new T.CylinderGeometry(r1,r2,h,n);cylinderCache.set(key,g);}return mesh(p,g,m,x,y,z);}
export function tube(p,points,r,m,steps=32){const curve=new T.CatmullRomCurve3(points.map(a=>V(...a)));return mesh(p,new T.TubeGeometry(curve,steps,r,8,false),m);}
export function beam(p,a,b,w,d,m){const av=V(...a),bv=V(...b),mid=av.clone().add(bv).multiplyScalar(.5);const b1=box(p,w,av.distanceTo(bv),d,...mid,m);b1.quaternion.setFromUnitVectors(V(0,1,0),bv.sub(av).normalize());return b1;}
export function textTexture(lines,{bg=null,color='#fff',w=512,h=256}={}){const key=JSON.stringify({lines,bg,color,w,h});if(textureCache.has(key))return textureCache.get(key);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,w,h);}lines.forEach(l=>{x.font=`${l.weight||'bold'} ${l.size||60}px Arial`;x.fillStyle=l.color||color;x.textAlign=l.align||'left';x.fillText(l.text,l.x??24,l.y??90)});const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textureCache.set(key,t);return t;}
export function label(p,tex,w,h,x,y,z,ry=0,rx=0){let m=labelMaterialCache.get(tex);if(!m){m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});labelMaterialCache.set(tex,m);}const o=mesh(p,new T.PlaneGeometry(w,h),m,x,y,z);o.rotation.set(rx,ry,0);o.castShadow=false;return o;}
function loft(p,levels,m){const N=80,pos=[],uv=[],ix=[];
 levels.forEach((l,j)=>{for(let i=0;i<N;i++){let a=i/N*Math.PI*2,s=Math.sin(a),c=Math.cos(a);pos.push(Math.sign(s)*Math.pow(Math.abs(s),.56)*l.w,l.y,l.z+Math.sign(c)*Math.pow(Math.abs(c),.62)*l.d);uv.push(i/N,j/(levels.length-1));}});
 for(let j=0;j<levels.length-1;j++)for(let i=0;i<N;i++){let a=j*N+i,b=j*N+(i+1)%N,c=(j+1)*N+i,d=(j+1)*N+(i+1)%N;ix.push(a,b,c,b,d,c);}
 for(let i=1;i<N-1;i++){ix.push(0,i+1,i);let off=(levels.length-1)*N;ix.push(off,off+i,off+i+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return mesh(p,g,m);
}
function sidePanel(p,side){
 const s=new T.Shape(); // Profile in (longitudinal z, vertical y), including a real wheel arch.
 s.moveTo(-.75,.15);s.bezierCurveTo(-.88,.25,-.91,.47,-.84,.69);s.bezierCurveTo(-.77,.81,-.68,.91,-.56,.92);s.lineTo(-.22,.63);s.bezierCurveTo(.04,.47,.28,.49,.57,.49);s.bezierCurveTo(.68,.51,.83,.48,.87,.40);s.lineTo(.866,.33);s.bezierCurveTo(.84,.51,.67,.56,.56,.53);s.bezierCurveTo(.40,.50,.30,.37,.32,.16);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:.065,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.025,bevelThickness:.018,curveSegments:24});g.rotateY(-Math.PI/2);mesh(p,g,materials.silver,side*.49,0,0);
 // Raised sweeping battery cover: a separate pressed panel and seam.
 const c=new T.Shape();c.moveTo(-.78,.72);c.bezierCurveTo(-.78,.95,-.42,1.00,-.13,.91);c.bezierCurveTo(.04,.83,.06,.64,.04,.52);c.bezierCurveTo(-.26,.56,-.55,.65,-.78,.72);
 const cg=new T.ExtrudeGeometry(c,{depth:.045,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:4,curveSegments:24});cg.rotateY(-Math.PI/2);mesh(p,cg,materials.silver,side*.46,0,0);
 tube(p,[[side*.535,.505,.06],[side*.54,.56,-.15],[side*.51,.67,-.51],[side*.46,.75,-.77]],.007,materials.black);
 const branding=textTexture([{text:'STILL',size:86,y:89},{text:'RX20-16',size:52,y:153,color:'#ff823d'}],{bg:'#242d31',w:512,h:208});
 label(p,branding,.39,.16,side*.526,.742,-.245,side*Math.PI/2);
 for(let i=0;i<3;i++){const slot=box(p,.008,.014,.10,side*.532,.865,-.14-i*.13,materials.dark,.006);slot.rotation.x=-.16;}
 for(let z of[-.56,-.1]){const b=cyl(p,.008,.008,.006,side*.543,.6,z,materials.chrome,6);b.rotation.z=Math.PI/2;}
}
function wheel(p,x,y,z,r,width){const hub=new T.Group();hub.position.set(x,y,z);p.add(hub);const spin=new T.Group();hub.add(spin);
 // Lathed shoulder profile with flat industrial tread, recessed rim and axle cap.
 const points=[[0,-width*.48],[r*.62,-width*.5],[r*.84,-width*.48],[r*.96,-width*.38],[r,-width*.24],[r,width*.24],[r*.96,width*.38],[r*.84,width*.48],[r*.62,width*.5],[0,width*.48]].map(a=>new T.Vector2(...a));
 const t=mesh(spin,new T.LatheGeometry(points,48),materials.rubber);t.rotation.z=Math.PI/2;
 for(let side of[-1,1]){const h=cyl(spin,r*.60,r*.60,.014,side*(width*.5+.002),0,0,materials.dark,40);h.rotation.z=Math.PI/2;const ring=mesh(spin,new T.TorusGeometry(r*.56,.011,8,40),materials.steel,side*(width*.5+.009),0,0);ring.rotation.y=Math.PI/2;const cap=cyl(spin,r*.33,r*.36,.025,side*(width*.5+.022),0,0,materials.dark,24);cap.rotation.z=Math.PI/2;for(let j=0;j<6;j++){let a=j/6*Math.PI*2;const b=cyl(spin,.011,.011,.014,side*(width*.5+.023),Math.sin(a)*r*.43,Math.cos(a)*r*.43,materials.steel,6);b.rotation.z=Math.PI/2;}}
 const tread=new T.InstancedMesh(new T.BoxGeometry(width*.76,.004,.018),materials.black,44);const d=new T.Object3D();for(let j=0;j<44;j++){let a=j/44*Math.PI*2;d.position.set(0,Math.cos(a)*r,Math.sin(a)*r);d.rotation.set(a,.20*(j%2?1:-1),0);d.updateMatrix();tread.setMatrixAt(j,d.matrix);}tread.castShadow=true;spin.add(tread);
 return {hub,spin,r};
}
function forkGeometry(){const s=new T.Shape();s.moveTo(-.017,.00);s.lineTo(1.00,.00);s.lineTo(1.035,.008);s.lineTo(.93,.031);s.lineTo(.09,.041);s.quadraticCurveTo(.038,.043,.034,.09);s.lineTo(.034,.48);s.lineTo(-.012,.48);s.lineTo(-.017,.00);const g=new T.ExtrudeGeometry(s,{depth:.08,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,curveSegments:12});g.rotateY(-Math.PI/2);return g;}

export function createForklift(){
 initTextures();const root=new T.Group();root.name='STILL_RX20_16';const body=new T.Group();root.add(body);body.name='chassis';
 box(body,.88,.21,1.40,0,.25,-.10,materials.dark,.05);
 loft(body,[{y:.20,w:.43,d:.20,z:-.70},{y:.24,w:.49,d:.22,z:-.70},{y:.43,w:.536,d:.245,z:-.68},{y:.70,w:.53,d:.245,z:-.65},{y:.85,w:.48,d:.23,z:-.65},{y:.88,w:.42,d:.19,z:-.64}],materials.orange);
 // Bumper wrap, top shoulder and charging hatch.
 loft(body,[{y:.69,w:.538,d:.247,z:-.65},{y:.704,w:.538,d:.247,z:-.65}],materials.dark);
 loft(body,[{y:.857,w:.46,d:.217,z:-.65},{y:.89,w:.47,d:.215,z:-.65},{y:.95,w:.41,d:.18,z:-.64}],materials.silver);
 box(body,.37,.14,.024,0,.53,-.935,materials.dark,.025);
 const rearBrand=textTexture([{text:'STILL',size:77,y:93,align:'center',x:256}],{w:512,h:132});label(body,rearBrand,.37,.096,0,.756,-.900,Math.PI);
 for(let x of[-.34,.34]){box(body,.11,.044,.026,x,.83,-.856,materials.dark,.012);box(body,.084,.027,.014,x,.834,-.874,new T.MeshStandardMaterial({color:'#ec301e',emissive:'#7e0902',emissiveIntensity:.6,roughness:.25}),.008);}
 sidePanel(body,-1);sidePanel(body,1);
 box(body,.87,.058,.58,0,.455,.36,materials.silver,.027);box(body,.74,.016,.54,0,.495,.35,materials.rubber,.01);
 for(let i=0;i<12;i++)box(body,.68,.005,.008,0,.507,.10+i*.041,materials.black,.002);
 for(let x of[-.48,.48]){box(body,.12,.027,.29,x,.361,.29,materials.dark,.012);for(let i=0;i<5;i++)box(body,.10,.005,.009,x,.377,.19+i*.045,materials.steel);}
 const fronts=[wheel(root,-.464,.241,.605,.241,.175),wheel(root,.464,.241,.605,.241,.175)];
 const steeringAxle=new T.Group();steeringAxle.position.set(0,.191,-.736);root.add(steeringAxle);cyl(steeringAxle,.07,.08,.22,0,.10,0,materials.dark);const rear=[wheel(steeringAxle,-.086,0,0,.191,.118),wheel(steeringAxle,.086,0,0,.191,.118)];
 // Sculpted tubular overhead guard; curved A-pillars and smooth roof shoulders.
 for(let side of[-1,1]){
  tube(body,[[side*.46,.45,.68],[side*.465,.72,.65],[side*.46,1.25,.43],[side*.44,1.78,.19],[side*.435,1.99,-.02],[side*.435,2.067,-.25],[side*.435,2.067,-.64],[side*.455,1.98,-.81],[side*.46,1.60,-.825],[side*.465,1.04,-.79],[side*.46,.86,-.71]],.030,materials.silver,64);
  tube(body,[[side*.485,.74,.62],[side*.485,.96,.535],[side*.485,1.15,.45]],.016,materials.dark,14);
  box(body,.10,.019,.135,side*.447,1.77,.19,materials.dark,.008);
 }
 for(let z of[-.73,-.55,-.36,-.17,.015])beam(body,[-.434,2.059,z],[.434,2.059,z],.025,.034,materials.silver);
 box(body,.83,.023,.37,0,2.059,-.57,materials.silver,.016);
 // Seat suspension bellows, slide rails and contoured seat cushions.
 box(body,.66,.28,.57,0,.696,-.23,materials.silver,.045);
 for(let x of[-.18,.18])box(body,.038,.035,.49,x,.866,-.245,materials.steel,.006);
 for(let j=0;j<5;j++)box(body,.37,.020,.35,0,.88+j*.018,-.28,j%2?materials.black:materials.dark,.008);
 box(body,.49,.096,.44,0,1.017,-.26,materials.leather,.045);
 for(let x of[-.219,.219]){let cushion=box(body,.074,.106,.396,x,1.051,-.26,materials.leather,.034);cushion.rotation.z=x>0?-.14:.14;}
 const seatback=new T.Group();seatback.position.set(0,1.025,-.483);seatback.rotation.x=-.19;body.add(seatback);
 box(seatback,.47,.43,.085,0,.221,0,materials.black,.038);box(seatback,.416,.32,.056,0,.225,.055,materials.leather,.028);box(seatback,.44,.085,.12,0,.43,.036,materials.leather,.03);
 for(let x of[-.174,.174])box(seatback,.05,.33,.04,x,.25,.089,materials.leather,.019);
 for(let x of[-.16,-.08,0,.08,.16])tube(body,[[x,1.065,-.43],[x,1.07,-.26],[x,1.066,-.075]],.0014,materials.dark,8);
 const buckle=box(body,.045,.057,.065,.272,1.072,-.37,materials.black,.009);buckle.rotation.z=-.22;box(body,.027,.013,.036,.282,1.108,-.37,materials.red,.004);
 // Right armrest and moulded hydraulic console (operator right = local -X).
 box(body,.16,.24,.38,-.32,.92,-.27,materials.dark,.029);box(body,.155,.076,.32,-.324,1.21,-.27,materials.leather,.025);
 const console=new T.Group();console.position.set(-.325,1.115,.025);console.rotation.x=-.13;body.add(console);box(console,.24,.11,.21,0,0,0,materials.dark,.035);
 const joysticks=[];for(let i=0;i<3;i++){const j=new T.Group();j.position.set(-.074+i*.073,.069,.028);console.add(j);for(let k=0;k<4;k++)cyl(j,.027-k*.004,.03-k*.004,.009,0,k*.01,0,materials.black,16);cyl(j,.008,.011,.062,0,.065,0,materials.steel,12);let knob=box(j,.032,.036,.047,0,.105,0,materials.black,.013);box(j,.015,.006,.02,0,.124,.004,materials.steel,.003);joysticks.push(j);}
 cyl(console,.021,.021,.031,-.08,.071,-.062,materials.black);cyl(console,.030,.027,.017,-.08,.095,-.062,materials.red);const emerg=textTexture([{text:'STOP',size:45,y:51,align:'center',x:128}],{w:256,h:64});label(console,emerg,.07,.018,-.08,.105,-.062,0,-Math.PI/2);
 for(let i=0;i<3;i++)label(console,textTexture([{text:['↑↓','↶','↔'][i],size:62,y:68}],{w:128,h:100}),.036,.026,-.074+i*.073,.06,.083,0,-Math.PI/2);
 // Steering column, hub, spokes, spinner knob and direction stalk.
 beam(body,[.196,.57,.50],[.196,1.105,.324],.105,.12,materials.dark);
 const wheelMount=new T.Group();wheelMount.position.set(.196,1.19,.315);wheelMount.rotation.x=-.54;body.add(wheelMount);
 cyl(wheelMount,.055,.068,.15,0,-.063,0,materials.dark);
 const steeringWheel=new T.Group();wheelMount.add(steeringWheel);
 let rim=mesh(steeringWheel,new T.TorusGeometry(.164,.016,10,56),materials.black);rim.rotation.x=Math.PI/2;cyl(steeringWheel,.054,.05,.037,0,0,0,materials.dark);
 for(let j=0;j<3;j++){let a=j*Math.PI*2/3;beam(steeringWheel,[Math.sin(a)*.039,0,Math.cos(a)*.039],[Math.sin(a)*.149,0,Math.cos(a)*.149],.019,.025,materials.dark);}
 cyl(steeringWheel,.013,.014,.035,.112,.029,-.114,materials.chrome);mesh(steeringWheel,new T.SphereGeometry(.022,16,10),materials.black,.112,.055,-.114);
 label(steeringWheel,textTexture([{text:'STILL',size:39,y:53,align:'center',x:128}],{w:256,h:80}),.064,.021,0,.021,0,0,-Math.PI/2);
 beam(body,[.224,1.058,.343],[.309,1.04,.335],.014,.017,materials.dark);box(body,.049,.022,.025,.319,1.04,.335,materials.black,.01);
 // Dashboard with live display, bezel, status lights and key.
 const dash=new T.Group();dash.position.set(-.019,.987,.534);dash.rotation.x=-.44;body.add(dash);box(dash,.30,.145,.061,0,0,0,materials.dark,.023);
 const displayCanvas=document.createElement('canvas');displayCanvas.width=512;displayCanvas.height=256;const displayTex=new T.CanvasTexture(displayCanvas);displayTex.colorSpace=T.SRGBColorSpace;
 label(dash,displayTex,.248,.116,0,0,-.034,Math.PI);const dx=displayCanvas.getContext('2d');
 function updateDisplay(speed,height,loaded){dx.fillStyle='#101a22';dx.fillRect(0,0,512,256);dx.fillStyle='#dcefe9';dx.font='bold 25px Arial';dx.fillText('STILL  RX 20-16',26,38);dx.fillStyle='#7de6b8';dx.fillRect(375,19,102,23);dx.fillStyle='#fff';dx.font='bold 90px Arial';dx.fillText(Math.abs(speed*3.6).toFixed(1),32,150);dx.font='23px Arial';dx.fillText('km/h',234,148);dx.fillStyle='#ff9445';dx.font='31px Arial';dx.fillText(height.toFixed(2)+' m',349,108);dx.fillStyle='#afc5cc';dx.font='23px Arial';dx.fillText(loaded?'PALLET PRESO':'SEM CARGA',27,218);dx.fillText(speed<-.03?'R':speed>.03?'D':'N',442,210);displayTex.needsUpdate=true;}updateDisplay(0,.05,false);
 box(body,.51,.09,.14,-.02,.697,.587,materials.dark,.034);for(let i=0;i<4;i++)box(body,.032,.012,.032,-.18+i*.056,.751,.587,materials.black,.006);
 const pedals=[];for(let i=0;i<2;i++){const p=new T.Group();p.position.set(i===0?.16:-.12,.541,.48);p.rotation.x=-.30;body.add(p);box(p,i===0?.12:.075,.028,.17,0,0,0,materials.dark,.01);for(let j=0;j<5;j++)box(p,i===0?.10:.06,.008,.01,0,.021,-.06+j*.027,materials.black,.003);pedals.push(p);}
 // Mast channels, hydraulic ram, carriage and chains all separated for animation.
 const mast=new T.Group();mast.position.set(0,.09,.909);root.add(mast);mast.name='mast';
 function channel(p,x,y,z,height,width,depth){box(p,.025,height,depth,x-width*.5,y,z,materials.dark,.005);box(p,width,.045,depth,x,y-height*.5,z,materials.dark,.004);for(let zz of[-1,1])box(p,width,height,.025,x,y,z+zz*(depth*.5-.012),materials.dark,.004);}
 for(let side of[-1,1])channel(mast,side*.359,1.0,0,2.02,.092,.16);
 for(let y of[.07,.6,1.92])box(mast,.79,.07,.14,0,y,-.016,materials.dark,.009);
 const inner=new T.Group();mast.add(inner);for(let side of[-1,1])channel(inner,side*.296,1.03,.031,1.96,.065,.1);box(inner,.64,.063,.11,0,2.01,.035,materials.dark,.005);
 const ram=cyl(mast,.044,.044,1.0,0,.58,-.037,materials.dark);const piston=cyl(mast,.023,.023,.98,0,1.36,-.037,materials.chrome);
 const chainMaterial=metal('#626663',.48,.78);const chainLinks=[];
 for(let side of[-1,1]){const chain=new T.Group();chain.position.set(side*.235,0,.084);mast.add(chain);for(let j=0;j<67;j++){const link=mesh(chain,new T.TorusGeometry(.0105,.0026,5,8),chainMaterial,0,.1+j*.027,0);link.scale.y=1.45;link.rotation.y=j%2?Math.PI/2:0;}chainLinks.push(chain);const pulley=cyl(inner,.064,.064,.029,side*.235,1.951,.039,materials.steel,24);pulley.rotation.x=Math.PI/2;tube(mast,[[side*.385,.1,-.068],[side*.40,.52,-.09],[side*.395,1.43,-.1],[side*.35,1.82,-.09]],.008,materials.black);}
 for(let side of[-1,1]){tube(mast,[[side*.43,.03,-.05],[side*.42,.18,-.15],[side*.31,.24,-.2]],.015,materials.black,12);const pin=cyl(mast,.049,.049,.04,side*.407,.48,0,materials.steel);pin.rotation.z=Math.PI/2;}
 const carriage=new T.Group();mast.add(carriage);carriage.name='fork_carriage';carriage.position.set(0,-.04,.145);
 for(let y of[.11,.42])box(carriage,.94,.068,.072,0,y,0,materials.steel,.006);
 for(let side of[-1,1]){box(carriage,.058,.51,.054,side*.434,.263,-.027,materials.dark,.005);const f=mesh(carriage,forkGeometry(),materials.steel,side*.235+.04,0,.035);box(carriage,.11,.075,.1,side*.235,.438,.013,materials.dark,.008);cyl(carriage,.013,.013,.034,side*.235,.49,.028,materials.chrome,12);}
 // Open load backrest, not a solid plate: visibility through the mast.
 for(let side of[-1,1])box(carriage,.025,.75,.025,side*.458,.443,-.057,materials.dark,.004);box(carriage,.943,.025,.025,0,.807,-.057,materials.dark,.004);for(let x=-.35;x<=.35;x+=.1)box(carriage,.012,.65,.016,x,.46,-.057,materials.dark,.003);
 const mastBrand=textTexture([{text:'STILL',size:65,y:77}],{w:300,h:100});const mb=label(mast,mastBrand,.23,.065,-.421,1.60,.02,-Math.PI/2);mb.rotation.z=Math.PI/2;
 const lamps=[];for(let side of[-1,1]){const mount=new T.Group();mount.position.set(side*.47,1.968,.15);body.add(mount);box(mount,.14,.14,.068,0,0,0,materials.dark,.025);const lens=new T.MeshStandardMaterial({color:'#dbe8ea',roughness:.16,metalness:.18,emissive:'#f6f1de',emissiveIntensity:.1});box(mount,.108,.096,.008,0,0,.039,lens,.011);for(let i=-1;i<=1;i++)box(mount,.095,.003,.002,0,i*.023,.045,materials.chrome);lamps.push(lens);}
 const beacon=new T.Group();beacon.position.set(.25,2.095,-.59);body.add(beacon);cyl(beacon,.06,.063,.023,0,0,0,materials.black);const beaconMat=new T.MeshStandardMaterial({color:'#ff9d08',emissive:'#ff7200',emissiveIntensity:.4,roughness:.19,transparent:true,opacity:.88});cyl(beacon,.037,.048,.081,0,.049,0,beaconMat);mesh(beacon,new T.SphereGeometry(.038,20,12,0,Math.PI*2,0,Math.PI/2),beaconMat,0,.089,0);
 // Mirrors and adjustment arms.
 for(let side of[-1,1]){beam(body,[side*.435,1.76,.19],[side*.526,1.80,.195],.013,.014,materials.dark);const mirror=box(body,.091,.071,.019,side*.526,1.80,.195,materials.black,.013);mirror.rotation.y=side*.35;const glass=box(body,.077,.058,.004,side*.524,1.80,.182,metal('#788b94',.12,.95),.008);glass.rotation.y=side*.35;}
 return{root,body,fronts,rear,steeringAxle,steeringWheel,joysticks,pedals,carriage,mast,inner,piston,chainLinks,lamps,beaconMat,updateDisplay};
}

const cargoM={blue:metal('#276186',.37,.58),paper:metal('#d7caaa',.91,0),core:metal('#806546',.94,0),fabric:metal('#d8ceb5',.96,0),bag:metal('#e1e1cb',.91,0),seam:metal('#8e917c',.97,0),band:metal('#385263',.78,.05)};
let cargoTextureReady=false;
export function createPallet(options={}){const {boxes=true,product='cartons'}=options,size=cargoSize({...options,boxes});const p=new T.Group();p.name='pallet_'+product;p.userData.cargoSize=size;
 const base=new T.Group();base.scale.set(size.width/1.2,1,size.depth/.8);p.add(base);
 for(let x of[-.485,0,.485]){box(base,.13,.023,.80,x,.0115,0,materials.wood,.003);for(let z of[-.335,0,.335])box(base,.13,.078,.13,x,.062,z,materials.wood,.003);}
 for(let z of[-.335,0,.335])box(base,1.20,.020,.13,0,.111,z,materials.wood,.002);
 for(let x of[-.525,-.275,0,.275,.525])box(base,x===0?.15:.145,.022,.80,x,.133,0,materials.wood,.003);
 for(let x of[-.50,.50])for(let z of[-.335,.335])for(let dx of[-.02,.02])cyl(base,.003,.003,.001,x+dx,.145,z,materials.steel,5);
 const stamp=textTexture([{text:'EUR',size:53,y:60}],{color:'#57402b',w:160,h:90});label(base,stamp,.095,.049,.484,.063,-.401,Math.PI);
 if(!boxes)return p;
 if(!cargoTextureReady){const t=procedural('rubber',128);t.repeat.set(2,2);cargoM.fabric.bumpMap=t;cargoM.fabric.bumpScale=.0012;cargoM.bag.bumpMap=t;cargoM.bag.bumpScale=.0015;cargoTextureReady=true;}
 if(product==='drums'){
  for(const x of[-.29,.29])for(const z of[-.24,.24]){
   const profile=[[.207,0],[.219,.012],[.223,.045],[.220,.21],[.225,.23],[.220,.25],[.220,.59],[.225,.61],[.220,.63],[.220,.84],[.209,.855]].map(a=>new T.Vector2(...a));mesh(p,new T.LatheGeometry(profile,32),cargoM.blue,x,.145,z);
   for(const y of[.163,.383,.763,.998]){const ring=mesh(p,new T.TorusGeometry(.216,.008,6,32),materials.steel,x,y,z);ring.rotation.x=Math.PI/2;}
   cyl(p,.211,.211,.010,x,1.002,z,cargoM.blue,32);cyl(p,.025,.025,.009,x+.08,1.012,z-.07,materials.silver,12);cyl(p,.011,.011,.011,x-.09,1.013,z+.07,materials.dark,10);
  }
 }else if(product==='sacks'){
  for(let row=0;row<3;row++)for(const x of[-.278,.278]){
   const y=.255+row*.220,g=new T.Group();g.position.set(x,y,0);p.add(g);
   const sack=mesh(g,new T.SphereGeometry(1,24,16),cargoM.fabric);sack.scale.set(.269,.110,.335);
   tube(g,[[-.235,0,-.11],[-.24,.040,0],[-.235,0,.11]],.003,cargoM.seam,14);
   for(let z of[-.24,.24]){const fold=mesh(g,new T.SphereGeometry(1,12,8),cargoM.fabric,0,0,z);fold.scale.set(.22,.064,.10);}
  }
 }else if(product==='crate'){
  for(const z of[-.324,.324])for(let j=0;j<5;j++)box(p,.172,.55,.027,-.36+j*.18,.430,z,materials.wood,.003);
  for(const x of[-.438,.438])for(let j=0;j<4;j++)box(p,.027,.55,.154,x,.430,-.24+j*.16,materials.wood,.003);
  for(const z of[-.324,.324])for(const y of[.185,.668])box(p,.92,.066,.033,0,y,z,materials.wood,.002);
  for(const x of[-.445,.445])for(const z of[-.326,.326])box(p,.050,.580,.050,x,.434,z,materials.wood,.003);
  for(let j=0;j<5;j++)box(p,.93,.025,.13,0,.722,-.27+j*.135,materials.wood,.003);
  for(const z of[-.345,.345])beam(p,[-.42,.21,z],[.42,.64,z],.06,.017,materials.wood);
  for(const x of[-.30,.30]){box(p,.018,.568,.008,x,.439,-.349,materials.steel);box(p,.018,.006,.694,x,.734,0,materials.steel);}
 }else if(product==='rolls'){
  for(const x of[-.29,.29])for(const z of[-.24,.24]){
   mesh(p,new T.CylinderGeometry(.222,.222,1.15,32,1,true),cargoM.paper,x,.720,z);
   const top=mesh(p,new T.RingGeometry(.054,.222,32),cargoM.paper,x,1.295,z);top.rotation.x=-Math.PI/2;
   const core=mesh(p,new T.CylinderGeometry(.052,.052,1.15,24,1,true),cargoM.core,x,.720,z);core.material.side=T.DoubleSide;
   for(let r=.077;r<.22;r+=.025){const ring=mesh(p,new T.TorusGeometry(r,.0013,3,32),cargoM.core,x,1.297,z);ring.rotation.x=Math.PI/2;}
   for(const y of[.39,1.08]){const band=mesh(p,new T.CylinderGeometry(.223,.223,.037,32,1,true),cargoM.band,x,y,z);}
  }
 }else if(product==='bigbag'){
  const levels=[[.145,.37,.34],[.22,.45,.41],[.65,.465,.42],[1.00,.435,.405],[1.125,.34,.31],[1.15,.08,.08]],N=40,positions=[],indices=[];
  for(const[y,w,d]of levels)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,s=Math.sin(a),c=Math.cos(a);positions.push(Math.sign(s)*Math.pow(Math.abs(s),.45)*w,y,Math.sign(c)*Math.pow(Math.abs(c),.45)*d);}
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N;indices.push(a,b,a+N,b,b+N,a+N);}
  const uv=[];for(let j=0;j<levels.length;j++)for(let i=0;i<N;i++)uv.push(i/N,j/(levels.length-1));const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(p,geo,cargoM.bag);
  for(const x of[-.28,.28])for(const z of[-.27,.27])tube(p,[[x-.04,1.10,z],[x-.05,1.19,z],[x,1.23,z],[x+.05,1.19,z],[x+.04,1.10,z]],.012,cargoM.band,18);
  for(const x of[-.32,.32])tube(p,[[x,.23,-.405],[x,.65,-.425],[x,1.00,-.408],[x*.8,1.12,-.32]],.0025,cargoM.seam,24);
  cyl(p,.061,.08,.05,0,1.157,0,cargoM.bag,16);
 }else{
  for(let row=0;row<2;row++)for(let x of[-.286,.286])for(let z of[-.185,.185]){box(p,.547,.275,.35,x,.286+row*.278,z,materials.cardboard,.006);box(p,.054,.003,.35,x,.425+row*.278,z,materials.wood);const bar=textTexture([{text:'↑ ↑',size:44,y:54},{text:'LOGÍSTICA · 016',size:14,y:89}],{color:'#514130',w:220,h:100});if(z<0)label(p,bar,.13,.065,x,.285+row*.278,z-.176,Math.PI);}
  for(let x of[-.38,.38]){box(p,.012,.56,.002,x,.425,-.363,materials.black);box(p,.012,.56,.002,x,.425,.363,materials.black);box(p,.012,.002,.726,x,.706,0,materials.black);}
 }
 if(product!=='cartons'){const tag=textTexture([{text:'↑ ↑',size:44,y:54},{text:'LOGÍSTICA · 016',size:14,y:89}],{color:'#514130',w:220,h:100});label(p,tag,.12,.054,0,.067,-size.depth/2-.002,Math.PI);}
 return p;
}
