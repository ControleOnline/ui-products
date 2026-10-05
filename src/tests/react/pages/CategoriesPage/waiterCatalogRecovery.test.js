jest.mock('@controleonline/ui-common/src/api', () => ({api: {getToken: async () => null}}));
const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockNavigation = {navigate: jest.fn(), setParams: jest.fn()};
const mockFocusCallbacks = [];
let mockAppType = 'POS';
let mockWidth = 390;
let mockConfig = {'pos-operation-mode': 'waiter'};
const mockStores = {};
const mockGetItems = jest.fn();
const mockSync = {getCategoryStatuses:()=>[],loadCatalogStatus:()=>Promise.resolve(),syncAllEligible:()=>Promise.resolve()};
const mockNode = name => props => React.createElement(name, props, props.children);
jest.mock('@appType', () => ({get app_type() {return mockAppType;}}));
jest.mock('react-native', () => ({SafeAreaView:mockNode('SafeAreaView'), View:mockNode('View'), Text:mockNode('Text'), ScrollView:mockNode('ScrollView'), TouchableOpacity:mockNode('TouchableOpacity'), Platform:{select:v=>v.web || v.default}, StyleSheet:{create:v=>v}, useWindowDimensions:()=>({width:mockWidth, height:844})}));
jest.mock('@react-navigation/native', () => ({useNavigation:()=>mockNavigation, useFocusEffect:callback=>{require("react").useEffect(callback,[callback]); mockFocusCallbacks.push(callback);}}));
jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({useMessage: () => ({showError: jest.fn()})}));
jest.mock('@store', () => ({useStore:name=>mockStores[name]}));
jest.mock('@controleonline/ui-orders/src/react/css/orders', () => () => ({styles:{}}));
jest.mock('@controleonline/ui-common/src/react/components/StateStore', () => mockNode('StateStore'));
jest.mock('@controleonline/ui-default/src/react/components/filters/DefaultSearch', () => mockNode('DefaultSearch'));
jest.mock('@controleonline/ui-default/src/react/components/table/DefaultTable', () => mockNode('DefaultTable'));
jest.mock('@controleonline/ui-products/src/react/hooks/useMarketplaceCatalogSync', () => () => mockSync);
jest.mock('@controleonline/../../src/styles/colors', () => ({colors:{}}));
jest.mock('@controleonline/../../src/styles/branding', () => ({resolveThemePalette:()=>({})}));
jest.mock('../../../../react/pages/CategoriesPage/CategoryCard', () => mockNode('CategoryCard'));
jest.mock('../../../../react/pages/CategoriesPage/CategoryEditorModal', () => mockNode('CategoryEditorModal'));
jest.mock('../../../../react/pages/CategoriesPage/MenuModelPickerModal', () => mockNode('MenuModelPickerModal'));
jest.mock('@controleonline/ui-products/src/react/components/products/ProductItem', () => mockNode('ProductItem'));
jest.mock('@controleonline/ui-products/src/react/utils/categoryCache', () => ({writeCachedCategories:jest.fn()}));
jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({resolveFileImageUrl:()=>null}));
jest.mock('../../../../react/pages/CategoriesPage/categoryCatalogDownloads', () => ({loadMenuModelsForCompany:()=>Promise.resolve([])}));
jest.mock('react-native-vector-icons/Feather', () => mockNode('Icon'));
jest.mock('@controleonline/ui-default/src/react/components/table/useDefaultTableTheme', () => () => ({tableActionColors:{}}));
const Categories = require('../../../../react/pages/Categories').default;
const eventBus = require('@controleonline/ui-common/src/react/components/EventBus').default;
const {ADD_PRODUCT_SELECTION_CHANGE_EVENT,clearPendingAddProducts} = require('@controleonline/ui-orders/src/react/utils/addProductSession');
let tree;
const render = async (params = {orderId:'70', showBottomCart:false}) => {
 await renderer.act(async () => {tree=renderer.create(React.createElement(Categories,{route:{params}}));});
};
beforeEach(() => {
 mockAppType='POS'; mockWidth=390; mockConfig={'pos-operation-mode':'waiter'};
 mockNavigation.navigate.mockClear(); mockFocusCallbacks.length=0; clearPendingAddProducts();
 mockGetItems.mockReset().mockResolvedValue([{id:10,name:'Lanches'}]);
 const actions = {getItems:mockGetItems,setItem:jest.fn(),setFilters:jest.fn(), syncOrder:jest.fn(),addToQueue:jest.fn(),initQueue:jest.fn()};
 Object.assign(mockStores,{order_products:{actions:{}},categories:{getters:{items:[{id:10,name:'Lanches'}],isLoading:false},actions},products:{getters:{},actions},device_config:{getters:{get item(){return {configs:mockConfig};}},actions},models:{getters:{},actions},people:{getters:{currentCompany:{id:3}},actions},theme:{getters:{colors:{}},actions},orders:{getters:{item:{id:70,orderProducts:[]}},actions}});
});
afterEach(async () => {if(tree) await renderer.act(async()=>tree.unmount()); tree=null;});
it.each([['POS','cashier'],['POS','counter'],['POS','single-item'],['POS','totem'],['TOTEM','waiter'],['SHOP','waiter'],['MANAGER','waiter']])('preserves %s/%s category catalog without waiter search or tabs',async(appType,mode)=>{
 mockAppType=appType; mockConfig={'pos-operation-mode':mode}; await render();
 expect(tree.root.findAllByType('DefaultSearch')).toHaveLength(0);
 expect(tree.root.findAllByProps({testID:'pdv-category-tabs'})).toHaveLength(0);
 expect(tree.root.findByType('DefaultTable').props.storeName).toBe('categories');
});
it('keeps waiter search on desktop without changing its category grid',async()=>{
 mockWidth=1280; await render();
 expect(tree.root.findByType('DefaultSearch')).toBeTruthy();
 expect(tree.root.findByType('DefaultTable').props.storeName).toBe('categories');
});
it('keeps search results after simple product inclusion',async()=>{
 await render();
 await renderer.act(async()=>tree.root.findByType('DefaultSearch').props.onSearch(' gyros '));
 let results=tree.root.findByType('DefaultTable');
 expect(results.props.requestParams).toMatchObject({company:3,product:'gyros'});
 const card=results.props.renderCard({item:{id:2,type:'custom',product:'Gyros'}});
 expect(card.props).toMatchObject({orderId:'70',showBottomCart:false,catalogContext:'products'});
 await renderer.act(async()=>eventBus.emit(ADD_PRODUCT_SELECTION_CHANGE_EVENT,{product:{id:2,type:'simple',price:5},quantity:1}));
 expect(tree.root.findByType('DefaultSearch').props.value).toBe('gyros');
 expect(tree.root.findByType('DefaultTable').props.requestParams.product).toBe('gyros');
});
it('preserves the query and category when returning to the catalog',async()=>{
 await render();
 await renderer.act(async()=>tree.root.findByType('DefaultSearch').props.onSearch('gyros'));
 await renderer.act(async()=>{for(const focus of [...mockFocusCallbacks]) focus();});
 expect(tree.root.findByType('DefaultSearch').props.value).toBe('gyros');
 expect(tree.root.findByType('DefaultTable').props.requestParams.product).toBe('gyros');
});
it.each([new Error('offline'),{malformed:true}])('shows failed category fetch and retries without empty fallback',async failure=>{
 if(failure instanceof Error) mockGetItems.mockRejectedValueOnce(failure); else mockGetItems.mockResolvedValueOnce(failure);
 await render();
 expect(mockNavigation.navigate).not.toHaveBeenCalled();
 expect(tree.root.findByProps({testID:'category-fetch-error'})).toBeTruthy();
 mockGetItems.mockResolvedValue([{id:10,name:'Lanches'}]);
 await renderer.act(async()=>tree.root.findByProps({accessibilityLabel:'Tentar novamente'}).props.onPress());
 expect(tree.root.findAllByProps({testID:'category-fetch-error'})).toHaveLength(0);
 expect(tree.root.findByProps({testID:'pdv-category-tabs'})).toBeTruthy();
});
it('redirects only a confirmed empty category response',async()=>{
 mockGetItems.mockResolvedValue([]); await render();
 expect(mockNavigation.navigate).toHaveBeenCalledWith(expect.objectContaining({name:'ProductsPage',params:expect.objectContaining({showBottomCart:false,orderId:'70'})}));
});

it('hides category administration and generic search for desktop waiter', async () => {
 mockWidth=1280; await render();
 const table=tree.root.findByType('DefaultTable');
 expect(table.props).toMatchObject({showSearch:false,showToolbar:false,showToolbarActions:false,showToolbarControls:false,showTotalItemsInCompactToolbar:false,showTotalItemsInFooter:false});
});
it('preserves desktop counter category controls', async () => {
 mockWidth=1280;mockConfig={'pos-operation-mode':'counter'}; await render();
 expect(tree.root.findByType('DefaultTable').props).toMatchObject({showSearch:true,showToolbar:true,showToolbarActions:true,showToolbarControls:true,showTotalItemsInCompactToolbar:true,showTotalItemsInFooter:true});
});

it('keeps the selected category and list for repeated simple inclusions', async () => {
 await render();
 await renderer.act(async () => tree.root.findAllByType('TouchableOpacity').find(node => node.findAllByType('Text').some(text => text.props.children === 'Lanches')).props.onPress());
 const before=tree.root.findByType('DefaultTable').props.requestParams;
 for (const quantity of [1,2]) {
  await renderer.act(async () => eventBus.emit(ADD_PRODUCT_SELECTION_CHANGE_EVENT, {product:{id:2,type:'simple',price:5},quantity}));
  expect(tree.root.findByType('DefaultTable').props.requestParams).toEqual(before);
  expect(tree.root.findByType('DefaultTable').props.storeName).toBe('products');
 }
});

it('clears the selected category on customization completion, without clearing a simple-add category', async () => {
 await render();
 await renderer.act(async()=>tree.root.findByProps({accessibilityLabel:'Categoria Lanches'}).props.onPress());
 expect(tree.root.findByProps({accessibilityLabel:'Categoria Lanches'}).props.accessibilityState.selected).toBe(true);
 await renderer.act(async()=>eventBus.emit(ADD_PRODUCT_SELECTION_CHANGE_EVENT,{product:{id:2,type:'simple',price:5},quantity:1}));
 expect(tree.root.findByProps({accessibilityLabel:'Categoria Lanches'}).props.accessibilityState.selected).toBe(true);
 await renderer.act(async()=>tree.update(React.createElement(Categories,{route:{params:{orderId:'70',showBottomCart:true,catalogResetKey:'70:completed'}}})));
 expect(tree.root.findByProps({accessibilityLabel:'Categoria Lanches'}).props.accessibilityState.selected).toBe(false);
 expect(tree.root.findAllByType('DefaultTable')).toHaveLength(0);
});
