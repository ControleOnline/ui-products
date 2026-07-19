/*
 * Contract imported from AGENTS.md
 * ## Escopo
 * - `ui-products` e o modulo React de catalogo, selecao e manutencao de produtos.
 * - Esta pagina centraliza a experiencia de produtos e a sincronizacao do catalogo.
 *
 * ## Estado
 *
 * ## Limites
 * - Nao duplicar a regra do catalogo em outros modulos.
 * - Manter aqui a coordenacao da tela React e dos filtros do catalogo.
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ALL_PRODUCTS_SENTINEL } from '@controleonline/ui-products/src/react/constants/categorySentinels';

import {
  Alert, FlatList, ScrollView, View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import ProductItem, {
  getProductTypeLabel,
  resolveProductTypeTheme,
} from '@controleonline/ui-products/src/react/components/products/ProductItem';
import { useFocusEffect } from '@react-navigation/native';
import {app_type} from '@appType';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import useMarketplaceCatalogSync from '@controleonline/ui-products/src/react/hooks/useMarketplaceCatalogSync';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import {
  isPosTotemMode,
  isPosSingleItemMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  shouldShowOperationalBottomNavigation,
} from '@controleonline/ui-layout/src/react/utils/posBottomNavigation';

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

const SUPPLY_TYPE_OPTIONS = [
  {
    value: 'feedstock',
    label: 'Matérias-primas',
    description: 'Fontes canônicas de custo, estoque e consumo.',
    icon: 'flask-outline',
  },
  {
    value: 'component',
    label: 'Componentes operacionais',
    description: 'Opções comerciais ou operacionais que podem receber insumos.',
    icon: 'shape-outline',
  },
  {
    value: 'package',
    label: 'Embalagens',
    description: 'Itens de embalagem separados da matéria-prima.',
    icon: 'package-variant-closed',
  },
];

const getSupplyTypeOption = value =>
  SUPPLY_TYPE_OPTIONS.find(option => option.value === value) || SUPPLY_TYPE_OPTIONS[0];

const getSupplyActionLabel = value => {
  const option = getSupplyTypeOption(value);
  if (option.value === 'feedstock') return 'Adicionar matéria-prima';
  if (option.value === 'component') return 'Adicionar componente operacional';
  if (option.value === 'package') return 'Adicionar embalagem';
  return 'Adicionar insumo';
};

const SUPPLY_EMPTY_LABELS = {
  feedstock: {
    emptyFound: 'Nenhuma matéria-prima encontrada',
    emptyAll: 'Nenhuma matéria-prima cadastrada',
    emptyCategory: 'Nenhuma matéria-prima',
    emptyAllSubtitle: 'Nenhuma matéria-prima foi cadastrada ainda.',
    emptyCategorySubtitle: 'Nenhuma matéria-prima disponível nesta visualização',
  },
  component: {
    emptyFound: 'Nenhum componente operacional encontrado',
    emptyAll: 'Nenhum componente operacional cadastrado',
    emptyCategory: 'Nenhum componente operacional',
    emptyAllSubtitle: 'Nenhum componente operacional foi cadastrado ainda.',
    emptyCategorySubtitle: 'Nenhum componente operacional disponível nesta visualização',
  },
  package: {
    emptyFound: 'Nenhuma embalagem encontrada',
    emptyAll: 'Nenhuma embalagem cadastrada',
    emptyCategory: 'Nenhuma embalagem',
    emptyAllSubtitle: 'Nenhuma embalagem foi cadastrada ainda.',
    emptyCategorySubtitle: 'Nenhuma embalagem disponível nesta visualização',
  },
};

const ALL_PRODUCTS_PAGE_SIZE = 50;
const DESKTOP_LIST_MIN_WIDTH = 900;
const MOBILE_TYPE_HEADER_PREFIX = 'type-header';
const MOBILE_PRODUCT_ROW_PREFIX = 'product-row';
const SYNC_STATUS_LEGEND = [
  { key: 'not-synced', label: 'Nao sinc.', color: '#94A3B8' },
  { key: 'pending', label: 'Pendente', color: '#e67e22' },
  { key: 'synced', label: 'Sinc.', color: '#16A34A' },
];

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

const normalizeProductId = value => {
  if (!value && value !== 0) return '';

  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};

const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';

const buildCatalogLabels = (context, supplyType = 'feedstock') => {
  if (context === 'supplies') {
    const supplyLabels = SUPPLY_EMPTY_LABELS[supplyType] || SUPPLY_EMPTY_LABELS.feedstock;
    return {
      singular: 'insumo',
      plural: 'insumos',
      addLabel: 'Adicionar Insumo',
      emptyFound: supplyLabels.emptyFound,
      emptyAll: supplyLabels.emptyAll,
      emptyCategory: supplyLabels.emptyCategory,
      emptyFoundSubtitle: query => `Nenhum resultado para "${query}".`,
      emptyAllSubtitle: supplyLabels.emptyAllSubtitle,
      emptyCategorySubtitle: supplyLabels.emptyCategorySubtitle,
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
    (app_type === 'MANAGER' ? 'manager' : 'pdv');
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const actions = productsStore.actions;
  const { isLoading: storeLoading } = productsStore.getters;
  const error = productsStore.error;
  const productCategoryStore = useStore('product_category');
  const productCategoryActions = productCategoryStore.actions;

  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;

  const categoriesStore = useStore('categories');
  const categoriesGetters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;
  const { items: categories, item: storedCategory } = categoriesGetters;

  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;
  const deviceConfigStore = useStore('device_config');
  const runtimeDeviceConfig = deviceConfigStore.getters?.item;

  const themeStore = useStore('theme');
  const { colors: themeColors } = themeStore.getters;

  const contextTypes = useMemo(() => {
    if (context === 'products') {
      return ['product', 'manufactured', 'custom', 'service', 'recipe'];
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
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [productCategoriesByProductId, setProductCategoriesByProductId] = useState({});
  const [groupedProductsReady, setGroupedProductsReady] = useState(true);
  const categoryProductsRef = useRef([]);
  const productsRequestKeyRef = useRef('');
  const productCategoryRequestKeyRef = useRef('');
  const allProductsPaginationRef = useRef({
    baseParams: null,
    hasMore: false,
    isLoading: false,
    page: 0,
    requestKey: '',
  });
  const typeFilter = useMemo(
    () => normalizeProductTypeFilter(routeParams.typeFilter),
    [routeParams.typeFilter],
  );
  const labels = useMemo(
    () => buildCatalogLabels(context, typeFilter || 'feedstock'),
    [context, typeFilter],
  );
  const [visibleCount, setVisibleCount] = useState(50);
  const [supplyTypeModalVisible, setSupplyTypeModalVisible] = useState(false);
  const currentOrderRef = useRef(ordersStore.getters?.item || null);
  const productListRef = useRef(null);
  const actionsRef = useRef(actions);
  const categoryActionsRef = useRef(categoryActions);
  const ordersActionsRef = useRef(ordersActions);
  const productCategoryActionsRef = useRef(productCategoryActions);
  const currentOrderId = String(
    routeParams.id ||
      routeParams.order ||
      currentOrderRef.current?.id ||
      currentOrderRef.current?.['@id'] ||
      '',
  ).replace(/\D+/g, '');

  const isManager =
    app_type === 'MANAGER' && interactionMode !== 'pdv';
  const shouldShowBottomNavigation = useMemo(
    () =>
      shouldShowOperationalBottomNavigation({
        appType: app_type,
        interactionMode,
        isTotemMode: isPosTotemMode(runtimeDeviceConfig?.configs),
      }),
    [interactionMode, runtimeDeviceConfig?.configs],
  );
  const isSingleItemMode =
    routeParams.singleItemMode === true ||
    isPosSingleItemMode(runtimeDeviceConfig?.configs);
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

  useEffect(() => {
    if (!shouldShowBottomNavigation) {
      if (routeParams.showBottomToolBar !== true) {
        return;
      }

      navigation.setParams({showBottomToolBar: false});
      return;
    }

    if (routeParams.showBottomToolBar === true) {
      return;
    }

    navigation.setParams({showBottomToolBar: true});
  }, [navigation, routeParams.showBottomToolBar, shouldShowBottomNavigation]);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    productCategoryActionsRef.current = productCategoryActions;
  }, [productCategoryActions]);

  useEffect(() => {
    categoryActionsRef.current = categoryActions;
  }, [categoryActions]);

  useEffect(() => {
    ordersActionsRef.current = ordersActions;
  }, [ordersActions]);

  const updateCategoryProducts = useCallback(products => {
    const nextProducts = Array.isArray(products) ? products : [];
    if (categoryProductsRef.current === nextProducts) return;
    categoryProductsRef.current = nextProducts;
    setCategoryProducts(nextProducts);
  }, []);

  const visibleTypeFilter = useMemo(
    () => (context === 'supplies' ? typeFilter || 'feedstock' : typeFilter),
    [context, typeFilter],
  );

  const visibleProducts = useMemo(() => {
    if (!visibleTypeFilter) return categoryProducts;
    return categoryProducts.filter(p => p.type === visibleTypeFilter);
  }, [categoryProducts, visibleTypeFilter]);

  const categoryProductIdsKey = useMemo(() => {
    const ids = Array.from(
      new Set(
        categoryProducts
          .map(product => normalizeProductId(product))
          .filter(Boolean),
      ),
    );

    return ids.join('|');
  }, [categoryProducts]);

  useEffect(() => {
    setVisibleCount(50);
  }, [categoryId, normalizedSearchQuery, typeFilter]);

  useEffect(() => {
    const productIds = categoryProductIdsKey
      ? categoryProductIdsKey.split('|').filter(Boolean)
      : [];

    if (productIds.length === 0) {
      productCategoryRequestKeyRef.current = '';
      setProductCategoriesByProductId({});
      return;
    }

    const requestKey = JSON.stringify([context, currentCompany?.id, productIds]);
    if (productCategoryRequestKeyRef.current === requestKey) {
      return;
    }

    productCategoryRequestKeyRef.current = requestKey;

    productCategoryActionsRef.current
      .getItems({
        product: productIds.map(productId => `/products/${productId}`),
      })
      .then(data => {
        if (productCategoryRequestKeyRef.current !== requestKey) {
          return;
        }

        const nextCategoriesByProductId = {};
        (Array.isArray(data) ? data : []).forEach(relation => {
          const productId = normalizeProductId(relation?.product);
          if (!productId) {
            return;
          }

          if (!nextCategoriesByProductId[productId]) {
            nextCategoriesByProductId[productId] = [];
          }

          nextCategoriesByProductId[productId].push(relation);
        });

        setProductCategoriesByProductId(nextCategoriesByProductId);
      })
      .catch(() => {
        if (productCategoryRequestKeyRef.current === requestKey) {
          setProductCategoriesByProductId({});
        }
      });
  }, [categoryProductIdsKey, context, currentCompany?.id]);

  const flushPendingAddProducts = useCallback(() => {
    const currentOrderId = String(
      currentOrderRef.current?.id ||
      currentOrderRef.current?.['@id'] ||
      '',
    ).replace(/\D+/g, '');
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
  }, [isSingleItemMode]);

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

  const isDesktopList = width >= DESKTOP_LIST_MIN_WIDTH;
  const shouldGroupByType =
    isAllProducts &&
    context === 'products' &&
    !normalizedSearchQuery;
  const productsData = useMemo(
    () => (shouldGroupByType ? visibleProducts : visibleProducts.slice(0, visibleCount)),
    [shouldGroupByType, visibleProducts, visibleCount],
  );
  const shouldShowTypeJumpBar = !isDesktopList && shouldGroupByType;
  const typeGroups = useMemo(() => {
    if (!shouldGroupByType) {
      return [];
    }

    const groupsByType = {};
    productsData.forEach(product => {
      const type = String(product?.type || '').trim() || 'product';
      if (!groupsByType[type]) {
        groupsByType[type] = {
          key: type,
          label: getProductTypeLabel(type),
          products: [],
        };
      }
      groupsByType[type].products.push(product);
    });

    return Object.values(groupsByType).sort((first, second) =>
      first.label.localeCompare(second.label, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [context, isAllProducts, normalizedSearchQuery, productsData, shouldGroupByType]);
  const groupedProductsData = useMemo(() => {
    if (!shouldGroupByType) {
      return productsData.map(product => ({
        key: `${MOBILE_PRODUCT_ROW_PREFIX}-${product.id}`,
        product,
        type: 'product',
      }));
    }

    return typeGroups.flatMap(group => [
      {
        count: group.products.length,
        key: `${MOBILE_TYPE_HEADER_PREFIX}-${group.key}`,
        label: group.label,
        type: 'header',
      },
      ...group.products.map(product => ({
        key: `${MOBILE_PRODUCT_ROW_PREFIX}-${product.id}`,
        product,
        type: 'product',
      })),
    ]);
  }, [productsData, shouldGroupByType, typeGroups]);
  const typeJumpTargets = useMemo(() => {
    const targets = {};
    groupedProductsData.forEach((item, index) => {
      if (item.type === 'header') {
        targets[item.key.replace(`${MOBILE_TYPE_HEADER_PREFIX}-`, '')] = index;
      }
    });
    return targets;
  }, [groupedProductsData]);
  const listData = useMemo(
    () => (shouldGroupByType ? groupedProductsData : productsData),
    [groupedProductsData, productsData, shouldGroupByType],
  );

  const changeCategoryProduct = (p, changeStorage = false) => {
    if (isAllProducts) {
      updateCategoryProducts(p);
      return;
    }

    const index = categories.findIndex(c => resolveRouteCategoryId(c) === categoryId);
    if (index < 0) {
      updateCategoryProducts(p);
      return;
    }

    let c = [...categories];
    c[index]['products'] = p;
    updateCategoryProducts(p);
    categoryActionsRef.current.setItems(c);

    if (changeStorage)
      writeCachedCategories(currentCompany?.id, c, context);
  };

  const resetAllProductsPagination = useCallback(() => {
    allProductsPaginationRef.current = {
      baseParams: null,
      hasMore: false,
      isLoading: false,
      page: 0,
      requestKey: '',
    };
    setGroupedProductsReady(true);
  }, []);

  const loadAllProductsPage = useCallback(async page => {
    const pagination = allProductsPaginationRef.current;
    const requestKey = pagination.requestKey;

    if (!pagination.baseParams || !requestKey || pagination.isLoading) {
      return false;
    }

    if (page > 1 && !pagination.hasMore) {
      return false;
    }

    pagination.isLoading = true;

    try {
      const data = await actionsRef.current.getItems({
        ...pagination.baseParams,
        page,
      });

      if (productsRequestKeyRef.current !== requestKey) {
        return false;
      }

      const nextPageProducts = Array.isArray(data) ? data : [];
      const currentProducts = page === 1 ? [] : categoryProductsRef.current;
      const currentProductIds = new Set(
        currentProducts.map(product => String(product?.id || product?.['@id'] || '')),
      );
      const mergedProducts = [
        ...currentProducts,
        ...nextPageProducts.filter(product => {
          const productId = String(product?.id || product?.['@id'] || '');
          return productId && !currentProductIds.has(productId);
        }),
      ];

      updateCategoryProducts(mergedProducts);
      setVisibleCount(count => Math.max(count, mergedProducts.length));

      const totalItems = Number(productsStore.getters?.totalItems || 0);
      const hasMore = totalItems > 0
        ? mergedProducts.length < totalItems
        : nextPageProducts.length >= ALL_PRODUCTS_PAGE_SIZE;
      pagination.page = page;
      pagination.hasMore = hasMore;

      return hasMore;
    } catch {
      // The central store error flow handles request failures.
      return false;
    } finally {
      pagination.isLoading = false;
    }
  }, [updateCategoryProducts]);

  const loadAllProductsUntilComplete = useCallback(async requestKey => {
    let page = 1;
    let hasMore = await loadAllProductsPage(page);

    while (
      hasMore &&
      productsRequestKeyRef.current === requestKey &&
      allProductsPaginationRef.current.requestKey === requestKey
    ) {
      page += 1;
      hasMore = await loadAllProductsPage(page);
    }

    if (
      productsRequestKeyRef.current === requestKey &&
      allProductsPaginationRef.current.requestKey === requestKey
    ) {
      setGroupedProductsReady(true);
    }
  }, [loadAllProductsPage]);

  useEffect(() => {
    if (!category) {
      productsRequestKeyRef.current = '';
      resetAllProductsPagination();
      setGroupedProductsReady(true);
      updateCategoryProducts([]);
      return;
    }

    const effectiveTypeFilter = context === 'supplies'
      ? (typeFilter || 'feedstock')
      : typeFilter;
    const baseParams = {
      active: 1,
      'order[product]': 'ASC',
      'order[description]': 'ASC',
      company: currentCompany?.id,
      type: effectiveTypeFilter ? [effectiveTypeFilter] : contextTypes,
    };

    if (normalizedSearchQuery) {
      resetAllProductsPagination();
      setGroupedProductsReady(true);
      const requestKey = JSON.stringify(['search', baseParams, normalizedSearchQuery]);
      if (productsRequestKeyRef.current === requestKey) return;
      productsRequestKeyRef.current = requestKey;
      actionsRef.current
        .getItems({
          ...baseParams,
          product: normalizedSearchQuery,
        })
        .then(data => {
          if (productsRequestKeyRef.current !== requestKey) return;
          updateCategoryProducts(data || []);
        })
        .catch(() => {});
      return;
    }

    if (isAllProducts) {
      const requestKey = JSON.stringify([
        'all',
        shouldGroupByType ? 'grouped' : 'paged',
        baseParams,
      ]);
      if (productsRequestKeyRef.current === requestKey) return;
      productsRequestKeyRef.current = requestKey;
      allProductsPaginationRef.current = {
        baseParams,
        hasMore: true,
        isLoading: false,
        page: 0,
        requestKey,
      };
      updateCategoryProducts([]);
      if (shouldGroupByType) {
        setGroupedProductsReady(false);
        loadAllProductsUntilComplete(requestKey);
      } else {
        setGroupedProductsReady(true);
        loadAllProductsPage(1);
      }
      return;
    }

    resetAllProductsPagination();
    setGroupedProductsReady(true);

    if (
      categories &&
      categories.length > 0 &&
      categoryId
    ) {
      const index = categories.findIndex(c => resolveRouteCategoryId(c) === categoryId);

      if (index >= 0 && categories[index]?.products?.length > 0) {
        updateCategoryProducts(categories[index]['products']);
      } else {
        const requestKey = JSON.stringify(['category', baseParams, categoryId]);
        if (productsRequestKeyRef.current === requestKey) return;
        productsRequestKeyRef.current = requestKey;
        actionsRef.current
          .getItems({
            ...baseParams,
            'productCategory.category':
              category?.['@id'] || `/categories/${categoryId}`,
          })
          .then(data => {
            if (productsRequestKeyRef.current !== requestKey) return;
            if (data && Object.keys(data).length > 0)
              changeCategoryProduct(data, true);
          })
          .catch(() => { });
      }
    }
  }, [
    category,
    categoryId,
    categories,
    contextTypes,
    currentCompany?.id,
    isAllProducts,
    loadAllProductsUntilComplete,
    loadAllProductsPage,
    normalizedSearchQuery,
    resetAllProductsPagination,
    shouldGroupByType,
    typeFilter,
    updateCategoryProducts,
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
        if (cats.length > 0) categoryActionsRef.current.setItems(cats);
      };
    }, [context, currentCompany?.id, flushPendingAddProducts, isManager, loadCatalogStatus]),
  );

  const buildCategoryRouteParams = useCallback((overrides = {}) => {
    const params = {
      context,
      interactionMode,
      showBottomCart: interactionMode === 'pdv',
      showBottomToolBar: interactionMode === 'pdv',
    };

    if (categoryId) {
      params.categoryId = categoryId;
    }

    if (context === 'supplies') {
      params.typeFilter = overrides.typeFilter || typeFilter || 'feedstock';
      params.initialProductType = overrides.initialProductType || params.typeFilter;
    } else if (typeFilter) {
      params.typeFilter = typeFilter;
    }

    return params;
  }, [categoryId, context, interactionMode, typeFilter]);

  const selectedSupplyType = useMemo(
    () => getSupplyTypeOption(typeFilter || 'feedstock'),
    [typeFilter],
  );

  const handleSelectSupplyType = useCallback(value => {
    setSupplyTypeModalVisible(false);
    navigation.setParams({ typeFilter: value });
  }, [navigation]);

  const handleProductPress = product => {
    if (!isManager) return;
    navigation.navigate({
      name: 'ProductDetails',
      params: {
        ProductId: product.id,
        ...buildCategoryRouteParams({
          typeFilter: context === 'supplies' ? product.type : undefined,
          initialProductType: context === 'supplies' ? product.type : undefined,
        }),
      },
      merge: false,
    });
  };

  const handleAddProduct = () => {
    if (!isManager) return;
    navigation.navigate({
      name: 'ProductDetails',
      params: buildCategoryRouteParams({
        typeFilter: visibleTypeFilter,
        initialProductType: visibleTypeFilter,
      }),
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

  const maxContentWidth = isDesktopList ? 1600 : 860;
  const containerWidth = Math.min(width, maxContentWidth);
  const isCompactMobile = width < 360;
  const shouldWaitForGroupedProducts = shouldGroupByType && !groupedProductsReady;
  const shouldShowInitialSkeleton =
    (storeLoading && categoryProducts.length === 0) ||
    shouldWaitForGroupedProducts;
  const shouldShowEmptyState =
    !shouldWaitForGroupedProducts &&
    !storeLoading &&
    visibleProducts.length === 0 &&
    !error;
  const shouldShowProductList =
    !shouldWaitForGroupedProducts &&
    visibleProducts.length > 0;
  const listContentStyle = {
    ...(isDesktopList
      ? {
          alignSelf: 'center',
          width: containerWidth,
        }
      : {}),
    paddingTop: isCompactMobile ? 12 : 16,
    paddingHorizontal: isCompactMobile ? 12 : 16,
    paddingBottom: interactionMode === 'pdv'
      ? (isCompactMobile ? 136 : 152)
      : isManager
        ? (isCompactMobile ? 96 : 104)
      : (isCompactMobile ? 12 : 16),
  };
  const renderSupplyHeader = () => {
    if (context !== 'supplies') return null;

    return (
      <View style={styles.supplyHeader}>
        <View style={styles.supplyHeaderText}>
          <Text style={styles.supplyHeaderTitle}>Cadastro mestre de insumos</Text>
          <Text style={styles.supplyHeaderDescription}>
            Separe fontes de custo dos componentes operacionais antes de vincular fichas técnicas.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.supplyTypeSelector}
          onPress={() => setSupplyTypeModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.supplyTypeSelectorIcon}>
            <MaterialCommunityIcons name={selectedSupplyType.icon} size={16} color={brandColors.primary} />
          </View>
          <View style={styles.supplyTypeSelectorText}>
            <Text style={styles.supplyTypeSelectorLabel}>Visualização</Text>
            <Text style={styles.supplyTypeSelectorValue} numberOfLines={1}>{selectedSupplyType.label}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    );
  };
  const renderDesktopHeader = () => {
    if (!isDesktopList) {
      return null;
    }

    return (
      <View
        style={[
          styles.tableHeader,
          {
            backgroundColor: brandColors['bg-headers-light'] || brandColors.background,
            borderColor: brandColors.border,
          },
        ]}
      >
        <Text style={[styles.tableHeaderImage, { color: brandColors.textSecondary }]}>Imagem</Text>
        <Text style={[styles.tableHeaderId, { color: brandColors.textSecondary }]}>ID</Text>
        <Text style={[styles.tableHeaderProduct, { color: brandColors.textSecondary }]}>Produto</Text>
        <View style={styles.tableHeaderSync}>
          <Text style={[styles.tableHeaderSyncTitle, { color: brandColors.textSecondary }]}>
            Canais sincronizados
          </Text>
          <View style={styles.tableHeaderSyncLegend}>
            {SYNC_STATUS_LEGEND.map(item => (
              <View key={item.key} style={styles.tableHeaderSyncLegendItem}>
                <View
                  style={[
                    styles.tableHeaderSyncLegendDot,
                    {
                      backgroundColor: item.color,
                      borderColor: `${item.color}55`,
                    },
                  ]}
                />
                <Text style={[styles.tableHeaderSyncLegendText, { color: brandColors.textSecondary }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={[styles.tableHeaderCategory, { color: brandColors.textSecondary }]}>Categoria</Text>
        <Text style={[styles.tableHeaderType, { color: brandColors.textSecondary }]}>Tipo</Text>
        <Text style={[styles.tableHeaderQueue, { color: brandColors.textSecondary }]}>Fila</Text>
        <Text style={[styles.tableHeaderPrice, { color: brandColors.textSecondary }]}>Preço</Text>
        <Text style={[styles.tableHeaderAction, { color: brandColors.textSecondary }]}>Ação</Text>
      </View>
    );
  };
  const scrollToTypeGroup = typeKey => {
    const index = typeJumpTargets[typeKey];
    if (typeof index !== 'number') {
      return;
    }

    const lastTypeGroupKey = typeGroups[typeGroups.length - 1]?.key;
    if (typeKey === lastTypeGroupKey) {
      productListRef.current?.scrollToEnd?.({ animated: true });
      return;
    }

    productListRef.current?.scrollToIndex?.({
      animated: true,
      index,
      viewOffset: 8,
    });
  };
  const renderTypeJumpButton = group => {
    const typeConf = resolveProductTypeTheme(group.key, brandColors) || {};

    return (
      <TouchableOpacity
        key={group.key}
        style={[
          styles.typeJumpButton,
          {
            backgroundColor: typeConf.backgroundColor,
            borderColor: typeConf.textColor,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => scrollToTypeGroup(group.key)}
      >
        <Text style={[styles.typeJumpText, { color: typeConf.textColor }]}>
          {group.label}
        </Text>
        <Text style={[styles.typeJumpCount, { color: typeConf.textColor }]}>
          {group.products.length}
        </Text>
      </TouchableOpacity>
    );
  };
  const renderTypeJumpBar = () => {
    if (!shouldShowTypeJumpBar || typeGroups.length <= 1) {
      return null;
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeJumpContent}
        style={styles.typeJumpScroll}
      >
        {typeGroups.map(renderTypeJumpButton)}
      </ScrollView>
    );
  };
  const renderListHeader = () => (
    <View>
      {renderSupplyHeader()}
      {renderDesktopHeader()}
    </View>
  );
  const renderStickyTypeJumpBar = () => {
    if (!shouldShowProductList) {
      return null;
    }

    const typeJumpBar = renderTypeJumpBar();
    if (!typeJumpBar) {
      return null;
    }

    return (
      <View
        style={[
          styles.stickyTypeJumpBar,
          {
            backgroundColor: brandColors.background,
            borderColor: brandColors.border,
          },
        ]}
      >
        <View
          style={[
            styles.stickyTypeJumpInner,
            {
              width: containerWidth,
              paddingHorizontal: isCompactMobile ? 12 : 16,
            },
          ]}
        >
          {typeJumpBar}
        </View>
      </View>
    );
  };
  const renderTypeHeader = item => {
    const typeKey = String(item.key || '').replace(`${MOBILE_TYPE_HEADER_PREFIX}-`, '');
    const typeConf = resolveProductTypeTheme(typeKey, brandColors) || {};
    const desktopTypeColor = typeConf.textColor;
    const desktopTypeBackground = typeConf.backgroundColor;

    return (
      <View
        style={[
          isDesktopList ? styles.tableTypeSectionHeader : styles.typeSectionHeader,
          {
            backgroundColor: isDesktopList
              ? desktopTypeBackground
              : brandColors.background,
            borderColor: isDesktopList
              ? desktopTypeColor
              : brandColors.border,
          },
        ]}
      >
        <Text
          style={[
            isDesktopList ? styles.tableTypeSectionTitle : styles.typeSectionTitle,
            { color: isDesktopList ? desktopTypeColor : brandColors.text },
          ]}
        >
          {isDesktopList
            ? `${item.label} · ${item.count} ${item.count === 1 ? 'item' : 'itens'}`
            : item.label}
        </Text>
        {!isDesktopList && (
          <Text style={[styles.typeSectionCount, { color: brandColors.textSecondary }]}>
            {item.count}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!storeLoading && <StateStore store="products" />}
      {shouldShowInitialSkeleton && (
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
      {shouldShowEmptyState && (
        <View style={context === 'supplies' ? styles.emptyWithHeader : styles.emptyContainer}>
          {context === 'supplies' && (
            <View style={styles.emptyHeaderWrap}>
              {renderSupplyHeader()}
            </View>
          )}
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
        </View>
      )}
      {renderStickyTypeJumpBar()}
      {shouldShowProductList && (
        <FlatList
          ref={productListRef}
          data={listData}
          keyExtractor={item => String(shouldGroupByType ? item.key : item.id)}
          contentContainerStyle={listContentStyle}
          ListHeaderComponent={renderListHeader}
          stickyHeaderIndices={isDesktopList ? [0] : undefined}
          onScrollToIndexFailed={info => {
            setTimeout(() => {
              productListRef.current?.scrollToIndex?.({
                animated: true,
                index: info.index,
                viewOffset: 8,
              });
            }, 120);
          }}
          onEndReached={() => {
            if (isAllProducts) {
              const pagination = allProductsPaginationRef.current;
              loadAllProductsPage(pagination.page + 1);
              return;
            }

            if (visibleCount < visibleProducts.length)
              setVisibleCount(v => v + 50);
          }}
          renderItem={({ item }) => {
            if (shouldGroupByType && item.type === 'header') {
              return renderTypeHeader(item);
            }

            const product = shouldGroupByType ? item.product : item;
            // No PDV/single-item, o card nao pode roubar o toque do botao interno.
            const CardWrapper = isManager ? TouchableOpacity : View;
            const wrapperProps = isManager
              ? { onPress: () => handleProductPress(product) }
              : {};

            return (
              <CardWrapper {...wrapperProps}>
                <ProductItem
                  product={product}
                  category={category}
                  productCategories={productCategoriesByProductId[normalizeProductId(product)] || []}
                  catalogContext={context}
                  displayMode={isDesktopList ? 'table' : 'card'}
                  interactionMode={interactionMode}
                  palette={brandColors}
                  singleItemMode={isSingleItemMode}
                  orderId={currentOrderId}
                  marketplaceStatuses={isManager ? getProductStatuses(product) : []}
                  onMarketplaceSync={handleMarketplaceSync}
                  marketplaceSyncingKey={marketplaceSyncingKey}
                />
              </CardWrapper>
            );
          }}
        />
      )}
      {context === 'supplies' && (
        <AnimatedModal
          visible={supplyTypeModalVisible}
          onRequestClose={() => setSupplyTypeModalVisible(false)}
          style={styles.supplyTypeModalWrap}
        >
          <View style={styles.supplyTypeModal}>
            <View style={styles.supplyTypeModalHeader}>
              <Text style={styles.supplyTypeModalTitle}>Visualização de insumos</Text>
              <TouchableOpacity
                style={styles.supplyTypeModalClose}
                onPress={() => setSupplyTypeModalVisible(false)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            {SUPPLY_TYPE_OPTIONS.map(option => {
              const active = option.value === selectedSupplyType.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.supplyTypeOption, active && styles.supplyTypeOptionActive]}
                  onPress={() => handleSelectSupplyType(option.value)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.supplyTypeOptionIcon, active && { backgroundColor: `${brandColors.primary}18` }]}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={18}
                      color={active ? brandColors.primary : '#64748B'}
                    />
                  </View>
                  <View style={styles.supplyTypeOptionText}>
                    <Text style={[styles.supplyTypeOptionTitle, active && { color: brandColors.primary }]}>
                      {option.label}
                    </Text>
                    <Text style={styles.supplyTypeOptionDescription}>{option.description}</Text>
                  </View>
                  {active && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={brandColors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimatedModal>
      )}
      {isManager && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBarButton, { backgroundColor: brandColors.primary }]}
            onPress={handleAddProduct}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.bottomBarButtonText}>
              {context === 'supplies'
                ? getSupplyActionLabel(visibleTypeFilter)
                : labels.addLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProductsPage;
