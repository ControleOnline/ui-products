
import Products from '@controleonline/ui-products/src/react/pages/Products';
import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import CustomizeScreen from '@controleonline/ui-products/src/react/pages/CustomizeScreen';
import { useStore } from '@store';

import React from 'react';



const ordersRoutes = [
  {
    name: 'ProductsPage',
    component: Products,
    options: {
      headerShown: true,
      title: 'Escolher Produtos',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: { store: 'products' },
  },
  {
    name: 'CategoriesPage',
    component: Categories,
    options: {
      headerShown: true,
      title: 'Categorias',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: { store: 'category' },
  },
  {
    name: 'CustomizeScreen',
    component: CustomizeScreen,
    options: {
      headerShown: true,
      title: 'Customizar',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: { store: 'products' },
  },
];

export default ordersRoutes;
