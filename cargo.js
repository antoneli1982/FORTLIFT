// Shared visual and physical dimensions, in metres, including the wooden pallet.
export const PRODUCTS={
 cartons:{name:'Caixas de papelão',width:1.20,depth:.80,height:.710},
 drums:{name:'Tambores metálicos',width:1.20,depth:1.00,height:1.025},
 sacks:{name:'Sacaria empilhada',width:1.20,depth:.80,height:.815},
 crate:{name:'Caixote de madeira',width:1.00,depth:.80,height:.735},
 rolls:{name:'Bobinas de papel',width:1.20,depth:1.00,height:1.315},
 bigbag:{name:'Big bag',width:1.20,depth:1.00,height:1.245}
};
export function cargoSize(p={}){const type=PRODUCTS[p.product]||PRODUCTS.cartons;return{width:p.width??type.width,depth:p.depth??type.depth,height:p.boxes===false?.144:(p.height??type.height)};}
export const cargoName=p=>p?.boxes===false?'Pallet vazio':(PRODUCTS[p?.product]||PRODUCTS.cartons).name;
