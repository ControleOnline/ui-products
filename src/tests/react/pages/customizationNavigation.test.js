const {finishCustomization} = require('../../../react/pages/customizationNavigation');
const navigationFor = (canGoBack = true) => ({canGoBack: () => canGoBack, goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), pop: jest.fn()});

describe('finishCustomization', () => {
  it.each(['cashier', 'counter', 'totem'])('preserves OrderDetails for %s PDV operation', operationMode => {
    const navigation = navigationFor();
    finishCustomization({navigation, nextOrderId: '70', interactionMode: 'pdv', isWaiterPosMode: false, operationMode});
    expect(navigation.replace).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({id: '70',showBottomCart:false}));
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
  it('returns waiter to categories and preserves explicit cart override', () => {
    const navigation = navigationFor();
    finishCustomization({navigation, nextOrderId: '70', interactionMode: 'pdv', isWaiterPosMode: true, routeParams: {showBottomCart: false}});
    expect(navigation.goBack).toHaveBeenCalled();
  });
  it('restores waiter categories after a deep link with no history', () => {
    const navigation = navigationFor(false);
    finishCustomization({navigation, nextOrderId: '70', interactionMode: 'pdv', isWaiterPosMode: true, routeParams: {showBottomCart: false}});
    expect(navigation.navigate).toHaveBeenCalledWith('AddProductScreen', expect.objectContaining({id:'70', orderId:'70', showBottomCart:false}));
  });
  it('keeps single item checkout ahead of waiter return', () => {
    const navigation = navigationFor();
    finishCustomization({navigation, nextOrderId:'70', interactionMode:'pdv', isWaiterPosMode:true, singleItemMode:true});
    expect(navigation.replace).toHaveBeenCalledWith('Checkout', expect.objectContaining({id:'70', showBottomCart:false}));
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
  it('preserves shop depth and explicit cart redirect', () => {
    const navigation = navigationFor();
    finishCustomization({navigation, nextOrderId:'70', interactionMode:'shop', returnDepth:3});
    expect(navigation.pop).toHaveBeenCalledWith(3);
    finishCustomization({navigation, redirectToCart:true});
    expect(navigation.navigate).toHaveBeenCalledWith('ShopCartPage');
  });
});

it('marks the previous catalog route for reset only after waiter customization succeeds', () => {
 const navigation = navigationFor();
 navigation.getState = () => ({index: 1, routes: [{key: 'pdv-70', name: 'PdvPage'}, {key: 'custom'}]});
 navigation.dispatch = jest.fn();
 finishCustomization({navigation, nextOrderId: '70', interactionMode: 'pdv', isWaiterPosMode: true});
 expect(navigation.dispatch).toHaveBeenCalledWith({type: 'SET_PARAMS', source: 'pdv-70',
   payload: {params: {catalogResetKey: expect.stringMatching(/^70:/)}}});
 expect(navigation.dispatch.mock.invocationCallOrder[0]).toBeLessThan(navigation.goBack.mock.invocationCallOrder[0]);
});
it('restores the catalog bar on a waiter deep-link return and requests a clean category selection', () => {
 const navigation = navigationFor(false);
 finishCustomization({navigation, nextOrderId: '70', interactionMode: 'pdv', isWaiterPosMode: true,
   routeParams: {showBottomCart: false, catalogShowBottomCart: true}});
 expect(navigation.navigate).toHaveBeenCalledWith('AddProductScreen', expect.objectContaining({
   showBottomCart: true, catalogResetKey: expect.stringMatching(/^70:/), resumeExistingOrder: true,
 }));
});
