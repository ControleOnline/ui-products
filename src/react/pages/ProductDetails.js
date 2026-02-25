import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ProductForm from '@controleonline/ui-products/src/react/components/ProductForm';
import ProductGroups from '@controleonline/ui-products/src/react/components/ProductGroups';

const Tab = createMaterialTopTabNavigator();

const ProductDetails = ({ route }) => {
  const { ProductId } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarScrollEnabled: false,
        tabBarIndicatorStyle: { height: 3 },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dados"
        component={ProductForm}
        initialParams={{ ProductId }}
      />

      <Tab.Screen
        name="Grupos"
        component={ProductGroups}
        initialParams={{ ProductId }}
      />
    </Tab.Navigator>
  );
};

export default ProductDetails;