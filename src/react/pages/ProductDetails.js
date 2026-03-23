import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import ProductForm from '@controleonline/ui-products/src/react/components/ProductForm';
import ProductGroups from '@controleonline/ui-products/src/react/components/ProductGroups';
import ProductFiscalForm from '@controleonline/ui-products/src/react/components/ProductFiscalForm';
import ProductPricingForm from '@controleonline/ui-products/src/react/components/ProductPricingForm';
import ProductStockForm from '@controleonline/ui-products/src/react/components/ProductStockForm';

const Tab = createMaterialTopTabNavigator();

const ProductDetails = ({ route }) => {
  const { ProductId } = route.params || {};
  const { width } = useWindowDimensions();

  const themeStore = useStore('theme');
  const brandColors = useMemo(
    () => resolveThemePalette(themeStore?.getters?.theme),
    [themeStore?.getters?.theme],
  );

  return (
    <Tab.Navigator
      initialLayout={{ width }}
      screenOptions={{
        tabBarScrollEnabled: false,
        tabBarActiveTintColor: brandColors.primary,
        tabBarIndicatorStyle: { backgroundColor: brandColors.primary, height: 3 },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 12, textTransform: 'none' },
        tabBarStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
        },
      }}
    >
      <Tab.Screen name="Dados">
        {props => <ProductForm {...props} ProductId={ProductId} />}
      </Tab.Screen>

      <Tab.Screen name="Grupos">
        {props => <ProductGroups {...props} ProductId={ProductId} />}
      </Tab.Screen>

      <Tab.Screen name="Fiscal">
        {props => <ProductFiscalForm {...props} ProductId={ProductId} />}
      </Tab.Screen>

      <Tab.Screen name="Preço/Custo">
        {props => <ProductPricingForm {...props} ProductId={ProductId} />}
      </Tab.Screen>

      <Tab.Screen name="Estoque">
        {props => <ProductStockForm {...props} ProductId={ProductId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default ProductDetails;
