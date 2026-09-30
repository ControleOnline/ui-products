const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockNavigation = {navigate:jest.fn()};
let mockAppType = 'POS';
const mockNode = name => props => React.createElement(name,props,props.children);
jest.mock('react-native',()=>({View:mockNode('View'),Text:mockNode('Text'),TouchableOpacity:mockNode('TouchableOpacity'),Image:mockNode('Image'),Platform:{select: v=>v.web||v.default},StyleSheet:{create:v=>v}}));
jest.mock('@react-navigation/native',()=>({useNavigation:()=>mockNavigation}));
jest.mock('@appType',()=>({get app_type(){return mockAppType;}}));
jest.mock('@expo/vector-icons',()=>({MaterialCommunityIcons:mockNode('Icon')}));
jest.mock('@controleonline/ui-products/src/react/domain/productMedia',()=>({resolveProductCoverUrl:()=>null}));
jest.mock('@controleonline/ui-products/src/react/components/products/SingleItemProductCard',()=>mockNode('SingleItemProductCard'));
jest.mock('@controleonline/ui-products/src/react/components/ProductReferenceLink',()=>mockNode('ProductReferenceLink'));
jest.mock('@controleonline/ui-products/src/react/components/MarketplaceSyncIndicators',()=>mockNode('MarketplaceSyncIndicators'));
jest.mock('@controleonline/ui-orders/src/react/components/cart/ProductTotem',()=>mockNode('ProductTotem'));
jest.mock('@controleonline/ui-orders/src/react/components/cart/ProductQuantity',()=>mockNode('ProductQuantity'));
const ProductItem = require('../../../react/components/products/ProductItem').default;
let tree;
afterEach(()=>{renderer.act(()=>tree?.unmount());tree=null;mockNavigation.navigate.mockClear();});
it.each(['card','search','table'])('carries false override, catalog, order and single item through %s custom action',displayMode=>{
 renderer.act(()=>{tree=renderer.create(React.createElement(ProductItem,{product:{id:134,type:'custom',product:'Gyros',price:5},orderId:'70',catalogContext:'supplies',showBottomCart:false,interactionMode:'pdv',singleItemMode:true,displayMode}));});
 renderer.act(()=>tree.root.findAllByType('TouchableOpacity')[0].props.onPress());
 expect(mockNavigation.navigate).toHaveBeenCalledWith('CustomizeScreen',{productId:134,orderId:'70',interactionMode:'pdv',singleItemMode:true,showBottomCart:false,context:'supplies'});
});
it('keeps a standard single item in its dedicated card',()=>{
 renderer.act(()=>{tree=renderer.create(React.createElement(ProductItem,{product:{id:2,type:'product'},singleItemMode:true,orderId:'70'}));});
 expect(tree.root.findByType('SingleItemProductCard').props.orderId).toBe('70');
});
