import {
  buildManagerPdvRouteParams,
  buildCheckoutRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
const {resolveShowBottomCart} = require('../utils/resolveShowBottomCart');

export const finishCustomization = ({
  navigation, nextOrderId, redirectToCart, singleItemMode,
  interactionMode, isWaiterPosMode, routeParams = {}, returnDepth = 3,
}) => {
  if (redirectToCart) { navigation.navigate('ShopCartPage'); return; }
  if (singleItemMode && nextOrderId) {
    navigation.replace('Checkout', buildCheckoutRouteParams(
      nextOrderId, buildManagerPdvRouteParams({showBottomCart: false}),
    ));
    return;
  }
  if (interactionMode === 'pdv' && nextOrderId) {
    if (isWaiterPosMode) {
      if (navigation.canGoBack?.()) { navigation.goBack(); return; }
      navigation.navigate('AddProductScreen', {
        ...buildManagerPdvRouteParams(),
        id: nextOrderId,
        orderId: nextOrderId,
        context: routeParams.context || 'products',
        resumeExistingOrder: true,
        showBottomCart: resolveShowBottomCart('pdv', routeParams.showBottomCart),
      });
    } else {
      navigation.replace('OrderDetails', buildOrderDetailsRouteParams(
        nextOrderId, buildManagerPdvRouteParams({showBottomCart: false}),
      ));
    }
    return;
  }
  navigation.pop(Math.max(1, Number(returnDepth || 1)));
};
