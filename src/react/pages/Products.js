import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import { useFocusEffect } from '@react-navigation/native';
import { env } from '@env';

const ProductsPage = ({ navigation, route }) => {
  const { category } = route.params;
  const productsStore = useStore('products');
  const actions = productsStore.actions;
  const isLoading = productsStore.isLoading;
  const error = productsStore.error;

  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;

  const categoriesStore = useStore('categories');
  const categoriesGetters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;
  const { items: categories } = categoriesGetters;

  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const { currentCompany } = peopleGetters;

  const { styles } = css();

  const [categoryProducts, setCategoryProducts] = useState([]);

  const isManager = env.APP_TYPE === 'MANAGER';

  const changeCategoryProduct = (p, changeStorage = false) => {
    const index = categories.findIndex(c => c['@id'] === category['@id']);
    let c = [...categories];
    c[index]['products'] = p;
    setCategoryProducts(p);
    categoryActions.setItems(c);

    if (changeStorage)
      localStorage.setItem('categories', JSON.stringify(categories));
  };

  useEffect(() => {
    if (
      categories &&
      categories.length > 0 &&
      category &&
      category['@id'] &&
      (!categoryProducts || categoryProducts.length === 0)
    ) {
      const index = categories.findIndex(c => c['@id'] === category['@id']);

      if (
        index >= 0 &&
        categories[index] &&
        categories[index]['products'] &&
        categories[index]['products'].length > 0
      ) {
        setCategoryProducts(categories[index]['products']);
      } else {
        actions
          .getItems({
            'productCategory.category': category['@id'],
            active: 1,
            'order[product]': 'ASC',
            'order[description]': 'ASC',
            company: currentCompany?.id,
            type: ['custom', 'product', 'manufactured', 'service'],
          })
          .then(data => {
            if (data && Object.keys(data).length > 0)
              changeCategoryProduct(data, true);
          });
      }
    }
  }, [category, categories, categoryProducts]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
        const categories = JSON.parse(
          localStorage.getItem('categories') || '[]',
        );
        setCategoryProducts([]);
        if (categories.length > 0) categoryActions.setItems(categories);
      };
    }, []),
  );

  const handleProductPress = product => {
    if (!isManager) return;

    navigation.navigate('ProductDetails', {
      ProductId: product.id,
    });
  };

  const handleAddProduct = () => {
    if (!isManager) return;
    navigation.navigate('ProductDetails');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="products" />

      {categoryProducts &&
        categoryProducts.length > 0 &&
        !error &&
        !isLoading && (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 220 },
            ]}
          >
            <View style={styles.gridContainer}>
              {categoryProducts.map(product => (
                <View key={product.id} style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={isManager ? 0.7 : 1}
                    onPress={() => handleProductPress(product)}
                    disabled={!isManager}
                  >
                    <ProductItem
                      key={product.id}
                      product={product}
                      category={category}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      {isManager && (
        <TouchableOpacity
          onPress={handleAddProduct}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 40,
            backgroundColor: '#000',
            padding: 12,
            borderRadius: 30,
            zIndex: 999,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default ProductsPage;