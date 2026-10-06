// useCustomizeScreenIds — extracted from CustomizeScreen.js for QA line-limit compliance.
// Resolves all active IDs (product, order, orderProduct) from route params and store state.

import {useMemo} from 'react';
import {normalizeEntityId, resolvePositiveQuantity} from './customizeScreenHelpers';

const useCustomizeScreenIds = ({
  routeProduct,
  routeProductId,
  routeOrderProduct,
  routeOrderProductId,
  routeParamsId,
  storedOrderProductItem,
  storedOrderProducts,
  productsGettersItem,
  order,
  cart,
}) => {
  const activeOrderProductId = useMemo(
    () => normalizeEntityId(routeOrderProductId || routeOrderProduct?.id || routeOrderProduct?.['@id']),
    [routeOrderProductId, routeOrderProduct],
  );

  const activeOrderProduct = useMemo(() => {
    if (routeOrderProduct && typeof routeOrderProduct === 'object' &&
        normalizeEntityId(routeOrderProduct?.id || routeOrderProduct?.['@id']) === activeOrderProductId) {
      return routeOrderProduct;
    }
    if (storedOrderProductItem && typeof storedOrderProductItem === 'object' &&
        normalizeEntityId(storedOrderProductItem?.id || storedOrderProductItem?.['@id']) === activeOrderProductId) {
      return storedOrderProductItem;
    }
    return storedOrderProducts.find(
      item => normalizeEntityId(item?.id || item?.['@id']) === activeOrderProductId,
    ) || null;
  }, [activeOrderProductId, routeOrderProduct, storedOrderProductItem, storedOrderProducts]);

  const activeProductId = useMemo(
    () => normalizeEntityId(
      routeProductId || routeProduct?.id || routeProduct?.['@id'] ||
      activeOrderProduct?.product?.id || activeOrderProduct?.product?.['@id'] || routeParamsId,
    ),
    [activeOrderProduct?.product?.['@id'], activeOrderProduct?.product?.id,
      routeParamsId, routeProduct?.['@id'], routeProduct?.id, routeProductId],
  );

  const activeProduct = useMemo(() => {
    if (routeProduct && typeof routeProduct === 'object' &&
        normalizeEntityId(routeProduct?.id || routeProduct?.['@id']) === activeProductId) {
      return routeProduct;
    }
    if (activeOrderProduct?.product &&
        normalizeEntityId(activeOrderProduct.product?.id || activeOrderProduct.product?.['@id']) === activeProductId) {
      return activeOrderProduct.product;
    }
    if (productsGettersItem && typeof productsGettersItem === 'object' &&
        normalizeEntityId(productsGettersItem?.id || productsGettersItem?.['@id']) === activeProductId) {
      return productsGettersItem;
    }
    return null;
  }, [activeOrderProduct?.product, activeProductId, productsGettersItem, routeProduct]);

  const activeResolvedProductId = useMemo(
    () => normalizeEntityId(activeProduct?.id || activeProduct?.['@id']),
    [activeProduct],
  );

  const activeOrderProductQuantity = useMemo(
    () => resolvePositiveQuantity(activeOrderProduct?.quantity || 1),
    [activeOrderProduct?.quantity],
  );

  const activeProductIri = useMemo(() => {
    if (activeProduct?.['@id']) return activeProduct['@id'];
    return activeProductId ? `/products/${activeProductId}` : null;
  }, [activeProduct, activeProductId]);

  const activeOrderId = useMemo(
    () => normalizeEntityId(
      activeOrderProduct?.order?.id || activeOrderProduct?.order?.['@id'] ||
      order?.id || order?.['@id'] || cart?.id || cart?.['@id'],
    ),
    [activeOrderProduct, cart, order],
  );

  const activeOrderIri = useMemo(() => {
    if (activeOrderProduct?.order?.['@id']) return activeOrderProduct.order['@id'];
    if (activeOrderProduct?.order?.id) return `/orders/${activeOrderProduct.order.id}`;
    if (order?.['@id']) return order['@id'];
    if (cart?.['@id']) return cart['@id'];
    return cart?.id ? `/orders/${cart.id}` : null;
  }, [activeOrderProduct, cart, order]);

  return {
    activeOrderProductId,
    activeOrderProduct,
    activeProductId,
    activeProduct,
    activeResolvedProductId,
    activeOrderProductQuantity,
    activeProductIri,
    activeOrderId,
    activeOrderIri,
  };
};

export default useCustomizeScreenIds;
