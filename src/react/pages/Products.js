import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ALL_PRODUCTS_SENTINEL } from './Categories';
import {
  FlatList,
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';

const TYPE_FILTER_OPTIONS = [
  { key: null, label: 'Todos' },
  { key: 'product', label: 'Produto' },
  { key: 'service', label: 'Serviço' },
  { key: 'manufactured', label: 'Fabricado' },
  { key: 'component', label: 'Componente' },
  { key: 'feedstock', label: 'Matéria Prima' },
  { key: 'package', label: 'Embalagem' },
  { key: 'custom', label: 'Custom' },
];

import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import { useFocusEffect } from '@react-navigation/native';
import { env } from '@env';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';

const SkeletonProductCard = () => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.imageBlock} />
    <View style={skeletonStyles.body}>
      <View style={[skeletonStyles.line, { width: '60%', height: 14, marginBottom: 8 }]} />
      <View style={[skeletonStyles.line, { width: '85%', height: 11, marginBottom: 6 }]} />
      <View style={[skeletonStyles.line, { width: '40%', height: 11 }]} />
      <View style={skeletonStyles.priceRow}>
        <View style={[skeletonStyles.line, { width: 72, height: 20 }]} />
        <View style={[skeletonStyles.line, { width: 48, height: 32, borderRadius: 8 }]} />
      </View>
    </View>
  </View>
);

const ProductsPage = ({ navigation, route }) => {
  const { category, context } = route.params;
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const actions = productsStore.actions;
  const { isLoading: storeLoading } = productsStore.getters;
  const error = productsStore.error;

  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;

  const categoriesStore = useStore('categories');
  const categoriesGetters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;
  const { items: categories } = categoriesGetters;

  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const themeStore = useStore('theme');
  const { colors: themeColors } = themeStore.getters;

  const contextTypes = [];

  useFocusEffect(
    useCallback(() => {
      if (context === 'products') {
        contextTypes.push('product', 'manufactured', 'custom', 'service');
      }
      if (context === 'supplies') {
        contextTypes.push('package', 'component', 'feedstock');
      }
    }, [])
  );

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [categoryProducts, setCategoryProducts] = useState([]);
  const [typeFilter, setTypeFilter] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);

  const isManager = env.APP_TYPE === 'MANAGER';

  const isAllProducts =
    category?._isAllProducts === true ||
    category?.['@id'] === '__all_products__';

  const visibleProducts = useMemo(() => {
    if (!typeFilter) return categoryProducts;
    return categoryProducts.filter(p => p.type === typeFilter);
  }, [categoryProducts, typeFilter]);

  useEffect(() => {
    setVisibleCount(50);
  }, [typeFilter, category]);

  const productsData = useMemo(
    () => visibleProducts.slice(0, visibleCount),
    [visibleProducts, visibleCount],
  );

  const availableTypes = useMemo(() => {
    const set = new Set(categoryProducts.map(p => p.type).filter(Boolean));
    return TYPE_FILTER_OPTIONS.filter(opt => opt.key === null || set.has(opt.key));
  }, [categoryProducts]);

  const changeCategoryProduct = (p, changeStorage = false) => {
    if (isAllProducts) {
      setCategoryProducts(p);
      return;
    }

    const index = categories.findIndex(c => c['@id'] === category['@id']);
    if (index < 0) {
      setCategoryProducts(p);
      return;
    }

    let c = [...categories];
    c[index]['products'] = p;
    setCategoryProducts(p);
    categoryActions.setItems(c);

    if (changeStorage)
      localStorage.setItem('categories', JSON.stringify(c));
  };

  useEffect(() => {
    if (!category) return;

    const baseParams = {
      active: 1,
      'order[product]': 'ASC',
      'order[description]': 'ASC',
      company: currentCompany?.id,
      type: contextTypes,
    };

    if (isAllProducts) {
      actions
        .getItems({
          ...baseParams,
        })
        .then(data => {
          setCategoryProducts(data || []);
        })
        .catch(() => { });
      return;
    }

    if (
      categories &&
      categories.length > 0 &&
      category['@id']
    ) {
      const index = categories.findIndex(c => c['@id'] === category['@id']);

      if (index >= 0 && categories[index]?.products?.length > 0) {
        setCategoryProducts(categories[index]['products']);
      } else {
        actions
          .getItems({
            ...baseParams,
            itemsPerPage: 50,
            'productCategory.category': category['@id'],
          })
          .then(data => {
            if (data && Object.keys(data).length > 0)
              changeCategoryProduct(data, true);
          })
          .catch(() => { });
      }
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
        const cats = JSON.parse(localStorage.getItem('categories') || '[]');
        setCategoryProducts([]);
        if (cats.length > 0) categoryActions.setItems(cats);
      };
    }, []),
  );

  const handleProductPress = product => {
    if (!isManager) return;
    navigation.navigate('ProductDetails', { ProductId: product.id, category, context });
  };

  const handleAddProduct = () => {
    if (!isManager) return;
    navigation.navigate('ProductDetails', { category });
  };

  const maxContentWidth = 860;
  const containerWidth = Math.min(width, maxContentWidth);

  return (
    <SafeAreaView style={styles.container}>
      {!storeLoading && <StateStore store="products" />}

      {storeLoading && (
        <ScrollView style={styles.scroll}>
          <View style={{ width: containerWidth, paddingHorizontal: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonProductCard key={i} />
            ))}
          </View>
        </ScrollView>
      )}

      {!storeLoading && categoryProducts.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name={isAllProducts ? 'view-grid-outline' : 'package-variant-closed'}
            size={48}
            color="#CBD5E1"
          />
          <Text style={styles.emptyTitle}>
            {isAllProducts ? 'Nenhum produto cadastrado' : 'Nenhum produto'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isAllProducts
              ? 'Nenhum produto foi cadastrado ainda.'
              : 'Nenhum produto disponível nesta categoria'}
          </Text>
        </View>
      )}

      {!storeLoading && categoryProducts.length > 0 && (
        <FlatList
          data={productsData}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={() => {
            if (visibleCount < visibleProducts.length)
              setVisibleCount(v => v + 50);
          }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleProductPress(item)}>
              <ProductItem product={item} category={category} />
            </TouchableOpacity>
          )}
        />
      )}

      {isManager && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBarButton, { backgroundColor: brandColors.primary }]}
            onPress={handleAddProduct}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.bottomBarButtonText}>Adicionar Produto</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
  },
  imageBlock: {
    width: 100,
    height: 100,
    backgroundColor: '#E2E8F0',
  },
  body: {
    flex: 1,
    padding: 12,
  },
  line: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    backgroundColor: '#fff',
  },
  bottomBarButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  bottomBarButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default ProductsPage;