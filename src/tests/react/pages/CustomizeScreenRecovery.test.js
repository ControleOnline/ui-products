const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockNode = name => props => React.createElement(name,props,props.children);
let mockAppType = 'POS';
let mockRoute;
const mockNavigation = {canGoBack:()=>false,goBack:jest.fn(),navigate:jest.fn(),replace:jest.fn(),pop:jest.fn()};
const mockStores = {};
const mockProduct = {id:134,'@id':'/products/134',product:'Gyros',type:'custom',price:5};
const mockAddProducts = jest.fn();
const mockReplaceProducts = jest.fn();
const mockAlert = jest.fn();
const mockCatalogFetch = jest.fn();
jest.mock('@controleonline/ui-common/src/api',()=>({api:{fetch:(...args)=>mockCatalogFetch(...args)}}));
jest.mock('react-native',()=>({View:mockNode('View'),Text:mockNode('Text'),TouchableOpacity:mockNode('TouchableOpacity'),Image:mockNode('Image'),ScrollView:mockNode('ScrollView'),Modal:mockNode('Modal'),ActivityIndicator:mockNode('ActivityIndicator'),Alert:{alert:mockAlert},Platform:{OS:'web',select:v=>v.web||v.default},StyleSheet:{create:v=>v},useWindowDimensions:()=>({width:390,height:844})}));
jest.mock('@react-navigation/native',()=>({useNavigation:()=>mockNavigation,useRoute:()=>mockRoute,useFocusEffect:callback=>require('react').useEffect(callback,[callback])}));
jest.mock('@appType',()=>({get app_type(){return mockAppType;}}));
jest.mock('@store',()=>({useStore:name=>mockStores[name]}));
jest.mock('@expo/vector-icons',()=>({MaterialCommunityIcons:mockNode('Icon')}));
jest.mock('@controleonline/ui-common/src/react/utils/fileUrl',()=>({resolveFileImageUrl:()=>null}));
jest.mock('@controleonline/ui-orders/src/react/hooks/usePosCartSession',()=>()=>({ensureActiveOrder:()=>Promise.resolve({id:70,'@id':'/orders/70'})}));
jest.mock('@controleonline/ui-orders/src/react/hooks/posCartSession/activePosOrderContext',()=>({getActivePosOrderContext:()=>null}));
const Screen = require('../../../react/pages/CustomizeScreen').default;
let tree;
beforeEach(()=>{
 mockCatalogFetch.mockReset().mockResolvedValue({member:[{...mockProduct,productGroups:[],customizationGroupsLoaded:true}]});
 mockAppType='POS'; mockRoute={params:{product:mockProduct,orderId:'70',interactionMode:'pdv',showBottomCart:false,context:'supplies'}};
 Object.values(mockNavigation).forEach(v=>v.mockClear?.()); mockAlert.mockClear();mockAddProducts.mockReset().mockResolvedValue({});mockReplaceProducts.mockReset().mockResolvedValue({});
 const actions={getItems:()=>Promise.resolve([]),get:()=>Promise.resolve(mockProduct),syncOrderProducts:jest.fn(),setItem:jest.fn(),addProducts:mockAddProducts,replaceProducts:mockReplaceProducts};
 ['orders','order_products','cart','product_group','product_group_product','products','people','device','device_config','theme'].forEach(name=>mockStores[name]={actions,getters:{}});
 mockStores.orders.getters={item:{id:70,'@id':'/orders/70',orderProducts:[]}};
 mockStores.products.getters={item:mockProduct};
 mockStores.people.getters={currentCompany:{id:3},mainCompany:{id:3}};
 mockStores.device.getters={item:{id:12,configs:{'pos-operation-mode':'counter'}}};
 mockStores.device_config.getters={item:{configs:{'pos-operation-mode':'waiter'}}};
});
afterEach(async()=>{if(tree)await renderer.act(async()=>tree.unmount());tree=null;});
const save = async()=>{
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Screen));});
 const button=tree.root.findByProps({accessibilityLabel:'ADICIONAR Gyros'});
 expect(button.props.disabled).toBe(false);
 await renderer.act(async()=>button.props.onPress());
};
it.each(['cashier','counter','totem'])('preserves %s OrderDetails after persisting the same active order',async mode=>{
 mockStores.device_config.getters.item.configs['pos-operation-mode']=mode;
 await save();
 expect(mockAddProducts).toHaveBeenCalledWith('70',[{product:'/products/134',order:'/orders/70',quantity:1,sub_products:[]}]);
 expect(mockNavigation.replace).toHaveBeenCalledWith('OrderDetails',expect.objectContaining({id:'70',showBottomCart:false}));
});
it('uses the runtime waiter Device and preserves false override/context on return',async()=>{
 await save();
 expect(mockNavigation.navigate).toHaveBeenCalledWith('AddProductScreen',expect.objectContaining({id:'70',orderId:'70',showBottomCart:false,context:'supplies'}));
 expect(mockNavigation.replace).not.toHaveBeenCalled();
});
it('preserves single item checkout even when the runtime Device is waiter',async()=>{
 mockRoute.params.singleItemMode=true;await save();
 expect(mockReplaceProducts).toHaveBeenCalledWith('70',expect.objectContaining({product:'/products/134',quantity:1}));
 expect(mockNavigation.replace).toHaveBeenCalledWith('Checkout',expect.objectContaining({id:'70',showBottomCart:false}));
});
it('does not leave the customization screen on a persistence failure',async()=>{
 mockAddProducts.mockRejectedValue(new Error('offline'));await save();
 expect(mockNavigation.navigate).not.toHaveBeenCalled();expect(mockNavigation.replace).not.toHaveBeenCalled();
 expect(mockAlert).toHaveBeenCalledWith('Atencao','offline');
});
it('preserves SHOP cart redirect with the same order context',async()=>{
 mockAppType='SHOP';mockRoute.params.interactionMode='shop';mockRoute.params.redirectToCart=true;await save();
 expect(mockNavigation.navigate).toHaveBeenCalledWith('ShopCartPage');
});

it('uses only public projection reads for a SHOP deep link with nested customization',async()=>{
 mockAppType='SHOP';mockRoute.params={productId:134,interactionMode:'shop'};
 const child={id:200,'@id':'/products/200',product:'Molho',productGroups:[{id:21,'@id':'/product_groups/21',minimum:1,products:[]}],customizationGroupsLoaded:true};
 mockCatalogFetch.mockResolvedValue({member:[{...mockProduct,customizationGroupsLoaded:true,productGroups:[{
  id:20,'@id':'/product_groups/20',productGroup:'Molhos',minimum:1,required:true,products:[{id:300,'@id':'/product_group_products/300',productType:'component',product:child,price:2,quantity:1}],
 }]}]});
 const privateRead=jest.fn().mockRejectedValue(new Error('private endpoint'));
 ['product_group','product_group_product','products'].forEach(name=>mockStores[name].actions={get:privateRead,getItems:privateRead});
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Screen));});
 expect(privateRead).not.toHaveBeenCalled();
 expect(mockCatalogFetch).toHaveBeenCalledTimes(1);
 const button=tree.root.findByProps({accessibilityLabel:'ADICIONAR Gyros'});
 expect(button.props.disabled).toBe(true);
});
it('keeps SHOP submission disabled when the projection denies the product',async()=>{
 mockAppType='SHOP';mockCatalogFetch.mockResolvedValue({member:[]});
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Screen));});
 const buttons=tree.root.findAllByType('TouchableOpacity');
 expect(buttons.some(button=>button.props.disabled===true)).toBe(true);
 expect(mockAddProducts).not.toHaveBeenCalled();
});
