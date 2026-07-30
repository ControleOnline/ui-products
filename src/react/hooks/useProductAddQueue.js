import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {
  ADD_PRODUCT_SELECTION_CHANGE_EVENT,
  clearPendingAddProducts,
  listPendingAddProducts,
  resolvePendingAddProductId,
} from '@controleonline/ui-orders/src/react/utils/addProductSession';
import {
  mergeOrderWithOrderProducts,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState';

const getPendingOrderProductKey = productId => `pending-add-product-${productId}`;

const buildPendingOrderProduct = ({ product, quantity, order }) => {
  const productId = resolvePendingAddProductId(product);
  const unitPrice = Number(product?.price || 0);

  return withOrderProductQuantity(
    {
      id: getPendingOrderProductKey(productId),
      '@id': `/pending_order_products/${productId}`,
      __localPendingSelection: true,
      product,
      price: unitPrice,
      value: unitPrice,
      total: unitPrice * Math.max(0, Number(quantity || 0)),
      order:
        order?.['@id'] ||
        (order?.id ? `/orders/${order.id}` : null),
    },
    quantity,
  );
};

const applyPendingSelectionToOrder = ({ order, product, quantity }) => {
  if (!order || !product) return order;

  const productId = resolvePendingAddProductId(product);
  if (!productId) return order;

  const pendingKey = getPendingOrderProductKey(productId);
  const currentOrderProducts = Array.isArray(order?.orderProducts)
    ? order.orderProducts
    : [];
  const nextOrderProducts = currentOrderProducts.filter(orderProduct => {
    const orderProductKey = String(orderProduct?.id || orderProduct?.['@id'] || '');
    return orderProductKey !== pendingKey;
  });

  if (Number(quantity || 0) > 0) {
    nextOrderProducts.push(
      buildPendingOrderProduct({
        product,
        quantity,
        order,
      }),
    );
  }

  return mergeOrderWithOrderProducts(order, nextOrderProducts);
};

const resolveOrderId = (orderId, order) =>
  String(orderId || order?.id || order?.['@id'] || '').replace(/\D+/g, '');

const useProductAddQueue = ({ isSingleItemMode = false, orderId = '' } = {}) => {
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const currentOrderRef = useRef(ordersStore.getters?.item || null);
  const ordersActionsRef = useRef(ordersActions);

  useEffect(() => {
    currentOrderRef.current = ordersStore.getters?.item || null;
  }, [ordersStore.getters?.item]);

  useEffect(() => {
    ordersActionsRef.current = ordersActions;
  }, [ordersActions]);

  const flushPendingAddProducts = useCallback(() => {
    const currentOrder = currentOrderRef.current;
    const currentOrderId = resolveOrderId(orderId, currentOrder);
    const pendingSelections = listPendingAddProducts();

    if (currentOrderId && pendingSelections.length > 0) {
      const lastSelection = pendingSelections[pendingSelections.length - 1];
      if (isSingleItemMode && !lastSelection?.productId) {
        return;
      }

      const payload = isSingleItemMode
        ? [{
            product: lastSelection?.productId,
            quantity: 1,
          }]
        : pendingSelections.map(selection => ({
            product: selection.productId,
            quantity: selection.quantity,
          }));

      const currentOrdersActions = ordersActionsRef.current;
      currentOrdersActions.addToQueue(() =>
        isSingleItemMode
          ? currentOrdersActions.replaceProducts(currentOrderId, payload)
          : currentOrdersActions.addProducts(currentOrderId, payload),
      );
    }

    clearPendingAddProducts();
    ordersActionsRef.current.initQueue();
  }, [isSingleItemMode, orderId]);

  const handlePendingSelectionChange = useCallback(
    payload => {
      const currentOrder = currentOrderRef.current;
      if (!currentOrder) return;

      const nextOrder = isSingleItemMode
        ? mergeOrderWithOrderProducts(
            currentOrder,
            payload?.product
              ? [
                  buildPendingOrderProduct({
                    order: currentOrder,
                    product: payload.product,
                    quantity: 1,
                  }),
                ]
              : [],
          )
        : applyPendingSelectionToOrder({
            order: currentOrder,
            product: payload?.product,
            quantity: payload?.quantity,
          });

      currentOrderRef.current = nextOrder;
      ordersActionsRef.current.syncOrder?.(nextOrder);
    },
    [isSingleItemMode],
  );

  useEffect(() => {
    eventBus.on(ADD_PRODUCT_SELECTION_CHANGE_EVENT, handlePendingSelectionChange);
    return () => eventBus.off(ADD_PRODUCT_SELECTION_CHANGE_EVENT, handlePendingSelectionChange);
  }, [handlePendingSelectionChange]);

  useFocusEffect(
    useCallback(() => {
      clearPendingAddProducts();
      return () => flushPendingAddProducts();
    }, [flushPendingAddProducts]),
  );

  return {
    currentOrderId: resolveOrderId(orderId, currentOrderRef.current),
  };
};

export default useProductAddQueue;
