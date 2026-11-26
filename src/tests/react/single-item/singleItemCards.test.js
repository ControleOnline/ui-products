import React from 'react';
import renderer,{act} from 'react-test-renderer';
let mockSelected = false;
import Card from '@controleonline/ui-products/src/react/components/products/SingleItemProductCard';
jest.mock('react-native',()=>({View:'View',Text:'Text',useWindowDimensions:()=>({width:360}),StyleSheet:{create:v=>v},Platform:{OS:'web',select:v=>v.web}}));
jest.mock('@appType',()=>({app_type:'POS'}));
jest.mock('@store',()=>({useStore:()=>({getters:{item:{configs:{'pos-operation-mode':'single-item'}}}})}));
jest.mock('@controleonline/ui-common/src/utils/formatter',()=>({__esModule:true,default:{formatMoney:v=>`R$ ${v}`}}));
jest.mock('@controleonline/ui-default/src/react/components/files/DefaultFile',()=> 'DefaultFile');
jest.mock('@controleonline/ui-products/src/react/domain/productMedia',()=>({resolveProductCoverUrl:p=>p.cover||null}));
jest.mock('@controleonline/ui-orders/src/react/components/cart/ProductTotem',()=>({children,...props})=>require('react').createElement('ProductTotem',props,children({isSelected:mockSelected})));
it.each([null,'test-image'])('shows price once and uses compact media only when present: %s',async cover=>{
 let tree;await act(async()=>{tree=renderer.create(<Card product={{id:1,product:'Serviço de teste',price:5,cover}} orderId="123" palette={{cardText:'configured-text',cardBackground:'configured-bg'}}/>);});
 expect(tree.root.findAllByType('Text').filter(n=>n.props.children==='R$ 5')).toHaveLength(1);
 expect(tree.root.findAllByType('DefaultFile')).toHaveLength(cover?1:0);
 if(cover)expect(tree.root.findByType('DefaultFile').props.resizeMode).toBe('contain');
 expect(tree.root.findByType('ProductTotem').props.orderId).toBe('123');
 act(()=>tree.unmount());
});

it('outlines only the selected compact card with the configured selection token',()=>{
 let tree;mockSelected=true;
 act(()=>{tree=renderer.create(<Card product={{id:1,product:'Serviço',price:5}} palette={{cardBorder:'normal',radioSelectedBorder:'brand'}}/>);});
 const card=()=>tree.root.findAllByType('View').find(n=>Array.isArray(n.props.style)&&n.props.style.some(s=>s?.borderRadius===12));
 expect(Object.assign({},...card().props.style.filter(Boolean)).borderColor).toBe('brand');
 mockSelected=false;act(()=>tree.update(<Card product={{id:1,product:'Serviço',price:5}} palette={{cardBorder:'normal',radioSelectedBorder:'brand'}}/>));
 expect(Object.assign({},...card().props.style.filter(Boolean)).borderColor).toBe('normal');act(()=>tree.unmount());
});
