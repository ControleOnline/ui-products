import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ALL_PRODUCTS_SENTINEL } from '@controleonline/ui-products/src/react/constants/categorySentinels';

import {
  Alert, FlatList, ScrollView, View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import { useFocusEffect } from '@react-navigation/native';
import { env } from '@env';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import useMarketplaceCatalogSync from '@controleonline/ui-products/src/react/hooks/useMarketplaceCatalogSync';

import {
  readCachedCategories,
  writeCachedCategories,
} from '@controleonline/ui-products/src/react/utils/categoryCache';

import {
  ADD_PRODUCT_SELECTION_CHANGE_EVENT,
  clearPendingAddProducts,
  listPendingAddProducts,
  resolvePendingAddProductId,
} from '@controleonline/ui-orders/src/react/utils/addProductSession';

import { skeletonStyles, styles } from './Products.styles'

import {
  mergeOrderWithOrderProducts,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState';
import {
  resolveRouteCategoryId,
} from '@controleonline/ui-products/src/react/utils/categorySelection';

import { inlineStyle_413_16 } from './Products.styles';

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
  if (!order || !product) {
    return order;
  }

  const productId = resolvePendingAddProductId(product);
  if (!productId) {
    return order;
  }

  const pendingKey = getPendingOrderProductKey(productId);
  const currentOrderProducts = Array.isArray(order?.orderProducts)
    ? order.orderProducts
    : [];
  const nextOrderProducts = currentOrderProducts.filter(orderProduct => {
    const orderProductKey = String(
      orderProduct?.id || orderProduct?.['@id'] || '',
    );
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

const resolveSelectedCategory = ({
  storedCategory,
  categories,
  routeCategoryId,
}) => {
  const normalizedRouteCategoryId = resolveRouteCategoryId(routeCategoryId);

  if (
    storedCategory &&
    typeof storedCategory === 'object' &&
    (
      storedCategory?._isAllProducts ||
      resolveRouteCategoryId(storedCategory) === normalizedRouteCategoryId
    )
  ) {
    return storedCategory;
  }

  if (normalizedRouteCategoryId === ALL_PRODUCTS_SENTINEL['@id']) {
    return ALL_PRODUCTS_SENTINEL;
  }

  return (Array.isArray(categories) ? categories : []).find(currentCategory => {
    return resolveRouteCategoryId(currentCategory) === normalizedRouteCategoryId;
  }) || null;
};

const normalizeProductTypeFilter = value => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return normalizedValue || null;
};

const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';

const buildCatalogLabels = context => {
  if (context === 'supplies') {
    return {
      singular: 'insumo',
      plural: 'insumos',
      addLabel: 'Adicionar Insumo',
      emptyFound: 'Nenhum insumo encontrado',
      emptyAll: 'Nenhum insumo cadastrado',
      emptyCategory: 'Nenhum insumo',
      emptyFoundSubtitle: query => `Nenhum resultado para "${query}".`,
      emptyAllSubtitle: 'Nenhum insumo foi cadastrado ainda.',
      emptyCategorySubtitle: 'Nenhum insumo disponível nesta categoria',
    };
  }

  return {
    singular: 'produto',
    plural: 'produtos',
    addLabel: 'Adicionar Produto',
    emptyFound: 'Nenhum produto encontrado',
    emptyAll: 'Nenhum produto cadastrado',
    emptyCategory: 'Nenhum produto',
    emptyFoundSubtitle: query => `Nenhum resultado para "${query}".`,
    emptyAllSubtitle: 'Nenhum produto foi cadastrado ainda.',
    emptyCategorySubtitle: 'Nenhum produto disponível nesta categoria',
  };
};

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
  const routeParams = route.params || {};
  const context = normalizeCatalogContext(routeParams.context);
  const interactionMode =
    routeParams.interactionMode ||
    (env.APP_TYPE === 'MANAGER' ? 'manager' : 'pdv');
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
  const { items: categories, item: storedCategory } = categoriesGetters;

  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const themeStore = useStore('theme');
  const { colors: themeColors } = themeStore.getters;

  const contextTypes = useMemo(() => {
    if (context === 'products') {
      return ['product', 'manufactured', 'custom', 'service'];
    }

    if (context === 'supplies') {
      return ['package', 'component', 'feedstock'];
    }

    return [];
  }, [context]);

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const labels = useMemo(() => buildCatalogLabels(context), [context]);

  const [categoryProducts, setCategoryProducts] = useState([]);
  const typeFilter = useMemo(
    () => normalizeProductTypeFilter(routeParams.typeFilter),
    [routeParams.typeFilter],
  );
  const [visibleCount, setVisibleCount] = useState(50);
  const currentOrderRef = useRef(ordersStore.getters?.item || null);

  const isManager =
    env.APP_TYPE === 'MANAGER' && interactionMode !== 'pdv';
  const {
    getProductStatuses,
    loadCatalogStatus,
    syncEntity,
    syncingKey: marketplaceSyncingKey,
  } = useMarketplaceCatalogSync(isManager ? currentCompany?.id : null);
  const categoryRouteValue = routeParams.categoryId || routeParams.category;
  const normalizedSearchQuery = useMemo(
    () => String(routeParams.searchQuery || '').trim(),
    [routeParams.searchQuery],
  );
  const category = useMemo(
    () =>
      resolveSelectedCategory({
        storedCategory,
        categories,
        routeCategoryId: categoryRouteValue,
      }),
    [categories, categoryRouteValue, storedCategory],
  );
  const categoryId = useMemo(
    () => resolveRouteCategoryId(category),
    [category],
  );
  useEffect(() => {
    if (!categoryId) return;
    if (resolveRouteCategoryId(categoryRouteValue) === categoryId) return;
    navigation.setParams({ categoryId });
  }, [categoryId, categoryRouteValue, navigation]);
  const isAllProducts =
    category?._isAllProducts === true ||
    category?.['@id'] === '__all_products__';

  useEffect(() => {
    currentOrderRef.current = ordersStore.getters?.item || null;
  }, [ordersStore.getters?.item]);

  const visibleProducts = useMemo(() => {
    if (!typeFilter) return categoryProducts;
    return categoryProducts.filter(p => p.type === typeFilter);
  }, [categoryProducts, typeFilter]);

  useEffect(() => {
    setVisibleCount(50);
  }, [typeFilter, category, normalizedSearchQuery]);

  const flushPendingAddProducts = useCallback(() => {
    const currentOrderId = String(
      currentOrderRef.current?.id ||
      currentOrderRef.current?.['@id'] ||
      '',
    ).replace(/\D+/g, '');
    const pendingSelections = listPendingAddProducts();

    if (currentOrderId && pendingSelections.length > 0) {
      const payload = pendingSelections.map(selection => ({
        product: selection.productId,
        quantity: selection.quantity,
      }));

      ordersActions.addToQueue(() => ordersActions.addProducts(currentOrderId, payload));
    }

    clearPendingAddProducts();
    ordersActions.initQueue();
  }, [ordersActions]);

  const handlePendingSelectionChange = useCallback(
    payload => {
      const currentOrder = currentOrderRef.current;
      if (!currentOrder) return;

      const nextOrder = applyPendingSelectionToOrder({
        order: currentOrder,
        product: payload?.product,
        quantity: payload?.quantity,
      });

      currentOrderRef.current = nextOrder;
      ordersActions.syncOrder?.(nextOrder);
    },
    [ordersActions],
  );

  useEffect(() => {
    eventBus.on(ADD_PRODUCT_SELECTION_CHANGE_EVENT, handlePendingSelectionChange);
    return () => eventBus.off(ADD_PRODUCT_SELECTION_CHANGE_EVENT, handlePendingSelectionChange);
  }, [handlePendingSelectionChange]);

  const productsData = useMemo(
    () => visibleProducts.slice(0, visibleCount),
    [visibleProducts, visibleCount],
  );

  const changeCategoryProduct = (p, changeStorage = false) => {
    if (isAllProducts) {
      setCategoryProducts(p);
      return;
    }

    const index = categories.findIndex(c => resolveRouteCategoryId(c) === categoryId);
    if (index < 0) {
      setCategoryProducts(p);
      return;
    }

    let c = [...categories];
    c[index]['products'] = p;
    setCategoryProducts(p);
    categoryActions.setItems(c);

    if (changeStorage)
      writeCachedCategories(currentCompany?.id, c, context);
  };

  useEffect(() => {
    if (!category) {
      setCategoryProducts([]);
      return;
    }

    const baseParams = {
      active: 1,
      'order[product]': 'ASC',
      'order[description]': 'ASC',
      company: currentCompany?.id,
      type: typeFilter ? [typeFilter] : contextTypes,
    };

    if (normalizedSearchQuery) {
      actions
        .getItems({
          ...baseParams,
          itemsPerPage: 100,
          product: normalizedSearchQuery,
        })
        .then(data => {
          setCategoryProducts(data || []);
        })
        .catch(() => {});
      return;
    }

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
      categoryId
    ) {
      const index = categories.findIndex(c => resolveRouteCategoryId(c) === categoryId);

      if (index >= 0 && categories[index]?.products?.length > 0) {
        setCategoryProducts(categories[index]['products']);
      } else {
        actions
          .getItems({
            ...baseParams,
            itemsPerPage: 50,
            'productCategory.category':
              category?.['@id'] || `/categories/${categoryId}`,
          })
          .then(data => {
            if (data && Object.keys(data).length > 0)
              changeCategoryProduct(data, true);
          })
          .catch(() => { });
      }
    }
  }, [
    actions,
    category,
    categoryId,
    categories,
    contextTypes,
    currentCompany?.id,
    isAllProducts,
    normalizedSearchQuery,
  ]);

  useFocusEffect(
    useCallback(() => {
      clearPendingAddProducts();
      if (isManager) {
        loadCatalogStatus().catch(() => {});
      }

      return () => {
        flushPendingAddProducts();
        const cats = readCachedCategories(currentCompany?.id, context);
        if (cats.length > 0) categoryActions.setItems(cats);
      };
    }, [categoryActions, context, currentCompany?.id, flushPendingAddProducts, isManager, loadCatalogStatus]),
  );

  const buildCategoryRouteParams = useCallback(() => {
    const params = {
      context,
      interactionMode,
      showBottomCart: interactionMode === 'pdv',
      showBottomToolBar: false,
    };

    if (categoryId) {
      params.categoryId = categoryId;
    }

    if (typeFilter) {
      params.typeFilter = typeFilter;
    }

    return params;
  }, [categoryId, context, interactionMode, typeFilter]);

  const handleProductPress = product => {
    if (!isManager) return;
    navigation.navigate({
      name: 'ProductDetails',
      params: {
        ProductId: product.id,
        ...buildCategoryRouteParams(),
      },
      merge: false,
    });
  };

  const handleAddProduct = () => {
    if (!isManager) return;
    navigation.navigate({
      name: 'ProductDetails',
      params: buildCategoryRouteParams(),
      merge: false,
    });
  };

  const handleMarketplaceSync = useCallback(
    async (platformKey, status, syncKey) => {
      try {
        await syncEntity(platformKey, status, { syncKey });
      } catch (error) {
        Alert.alert(
          'Sincronizacao nao concluida',
          error?.message || 'Nao foi possivel sincronizar este item.',
        );
        throw error;
      }
    },
    [syncEntity],
  );

  const maxContentWidth = 860;
  const containerWidth = Math.min(width, maxContentWidth);
  const isCompactMobile = width < 360;
  const listContentStyle = {
    paddingTop: isCompactMobile ? 12 : 16,
    paddingHorizontal: isCompactMobile ? 12 : 16,
    paddingBottom: interactionMode === 'pdv'
      ? (isCompactMobile ? 136 : 152)
      : isManager
        ? (isCompactMobile ? 96 : 104)
      : (isCompactMobile ? 12 : 16),
  };

  return (
    <SafeAreaView style={styles.container}>
      {!storeLoading && <StateStore store="products" />}
      {storeLoading && (
        <ScrollView style={styles.scroll}>
          <View style={inlineStyle_413_16({
            containerWidth: containerWidth,
          })}>
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
            {normalizedSearchQuery
              ? labels.emptyFound
              : isAllProducts
                ? labels.emptyAll
                : labels.emptyCategory}
          </Text>
          <Text style={styles.emptySubtitle}>
            {normalizedSearchQuery
              ? labels.emptyFoundSubtitle(normalizedSearchQuery)
              : isAllProducts
                ? labels.emptyAllSubtitle
                : labels.emptyCategorySubtitle}
          </Text>
        </View>
      )}
      {!storeLoading && categoryProducts.length > 0 && (
        <FlatList
          data={productsData}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={listContentStyle}
          onEndReached={() => {
            if (visibleCount < visibleProducts.length)
              setVisibleCount(v => v + 50);
          }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleProductPress(item)}>
              <ProductItem
                product={item}
                category={category}
                interactionMode={interactionMode}
                marketplaceStatuses={isManager ? getProductStatuses(item) : []}
                onMarketplaceSync={handleMarketplaceSync}
                marketplaceSyncingKey={marketplaceSyncingKey}
              />
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
            <Text style={styles.bottomBarButtonText}>{labels.addLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProductsPage;
