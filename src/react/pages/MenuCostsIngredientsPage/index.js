/* eslint-disable no-unused-vars */
import React, { useMemo } from 'react';
import ProductsPage from '@controleonline/ui-products/src/react/pages/Products';

const DEFAULT_PARAMS = {
  context: 'supplies',
  typeFilter: 'feedstock',
  initialProductType: 'feedstock',
  interactionMode: 'manager',
  showBottomCart: false,
};

export const buildMenuCostsIngredientsRouteParams = routeParams => ({
  ...(routeParams || {}),
  ...DEFAULT_PARAMS,
});

export default function MenuCostsIngredientsPage({ navigation, route }) {
  const params = useMemo(
    () => buildMenuCostsIngredientsRouteParams(route?.params),
    [route?.params],
  );

  return (
    <ProductsPage
      navigation={navigation}
      route={{
        ...route,
        params,
      }}
    />
  );
}
