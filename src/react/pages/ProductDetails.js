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
      <Tab.Screen name="Dados">
        {props => <ProductForm {...props} ProductId={ProductId} />}
      </Tab.Screen>

      {ProductId && (
        <Tab.Screen name="Grupos">
          {props => <ProductGroups {...props} ProductId={ProductId} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
  );
};

export default ProductDetails;