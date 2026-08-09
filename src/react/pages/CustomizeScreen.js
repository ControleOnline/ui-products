import React, {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';

import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useStore} from '@store';
import {app_type} from '@appType';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {isPosSingleItemMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

import {
  customizeChipRowStyle,
  customizeChipStyle,
  customizeChipTextStyle,
  customizeBackdropPressableStyle,
  customizeCloseButtonStyle,
  customizeDescriptionStyle,
  customizeEyebrowStyle,
  customizeFooterFloatingStyle,
  customizeFooterStyle,
  customizeGroupCardStyle,
  customizeGroupErrorStyle,
  customizeGroupHeaderStyle,
  customizeGroupMetaStyle,
  customizeGroupRuleStyle,
  customizeGroupsStackStyle,
  customizeGroupTitleRowStyle,
  customizeGroupTitleStyle,
  customizeHeaderContentStyle,
  customizeHeaderStyle,
  customizeHeroImageStyle,
  customizeHeroImageWrapStyle,
  customizeHeroPlaceholderStyle,
  customizeHeroPlaceholderTextStyle,
  customizeMainColumnStyle,
  customizeModalStyle,
  customizeMobileSummaryWrapStyle,
  customizeOptionBodyStyle,
  customizeOptionControlInnerStyle,
  customizeOptionControlStyle,
  customizeOptionImageStyle,
  customizeOptionImageWrapStyle,
  customizeOptionMetaStyle,
  customizeOptionNameStyle,
  customizeOptionPlaceholderTextStyle,
  customizeOptionPriceStyle,
  customizeOptionsStackStyle,
  customizeOptionTouchableStyle,
  customizeQuantityPillStyle,
  customizeQuantityPillTextStyle,
  customizeQuantityRowStyle,
  customizeQuantityStepperButtonStyle,
  customizeQuantityStepperStyle,
  customizeScreenBackdropStyle,
  customizeScreenRootStyle,
  customizeScrollContentStyle,
  customizeScrollStyle,
  customizeSubmitButtonStyle,
  customizeSubmitButtonTextStyle,
  customizeSummaryCardStyle,
  customizeSummaryColumnStyle,
  customizeSummaryGroupItemStyle,
  customizeSummaryGroupListStyle,
  customizeSummaryGroupNameStyle,
  customizeSummaryGroupStateStyle,
  customizeSummaryHeaderStyle,
  customizeSummaryKickerStyle,
  customizeSummaryLabelStyle,
  customizeSummaryLineStyle,
  customizeSummaryTitleStyle,
  customizeSummaryTotalStyle,
  customizeSummaryValueStyle,
  customizeTitleRowStyle,
  customizeTitleStyle,
  resolveCustomizePalette,
} from './CustomizeScreen.styles';
import {mergeOrderWithOrderProducts} from '@controleonline/ui-orders/src/utils/orderState';
import {
  buildManagerPdvRouteParams,
  buildCheckoutRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {resolveFileImageUrl} from '@controleonline/ui-common/src/react/utils/fileUrl';
import {
  buildCustomizationNodeKey,
  buildCustomizationSelectionKey,
  buildExistingCustomizationTree,
  buildRecursiveSubProducts,
  normalizeCustomizeTreeId as normalizeEntityId,
  parseCustomizeTreeNumber as parseNumericValue,
  resolveCustomizeTreeQuantity as resolvePositiveQuantity,
} from '../domain/customizeTree';

const parseNullableInteger = value => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const parsedValue = parseInt(String(value), 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatOptionQuantity = value => {
  const quantity = parseNumericValue(value);

  if (Number.isInteger(quantity)) {
    return String(quantity);
  }

  return quantity.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const resolveEffectiveGroupMinimum = group => {
  const minimum = parseNullableInteger(group?.minimum);

  if (minimum !== null && minimum > 0) {
    return minimum;
  }

  return group?.required ? 1 : 0;
};

const resolveEffectiveGroupMaximum = group => {
  const maximum = parseNullableInteger(group?.maximum);

  if (maximum !== null && maximum > 0) {
    return maximum;
  }

  return null;
};

const resolvePriceCalculationLabel = value => {
  switch (String(value || '').trim().toLowerCase()) {
    case 'biggest':
      return 'maior valor';
    case 'average':
      return 'media';
    case 'free':
      return 'gratis';
    case 'sum':
    default:
      return 'soma';
  }
};

const resolveCompactSelectionRuleLabel = (minimum, maximum) => {
  if (minimum > 0 && maximum !== null) {
    if (minimum === maximum) {
      return minimum === 1 ? '1 selecao' : `${minimum} selecoes`;
    }

    return `${minimum} a ${maximum} selecoes`;
  }

  if (minimum > 0) {
    return `min. ${minimum}`;
  }

  if (maximum !== null) {
    return `max. ${maximum}`;
  }

  return 'sem limite';
};

const resolveCompactGroupStateLabel = summary => {
  const selectedCount = summary?.selectedCount || 0;
  const selectedLabel = `${selectedCount} selecionado${selectedCount === 1 ? '' : 's'}`;
  const extraPrice = parseNumericValue(summary?.extraPrice);

  if (extraPrice <= 0) {
    return selectedLabel;
  }

  return `${selectedLabel} • +${Formatter.formatMoney(extraPrice, 'R$', 'pt-br')}`;
};

const calculateGroupExtraPrice = (group, groupItems) => {
  const selectedItems = (Array.isArray(groupItems) ? groupItems : []).filter(
    item => item?.selected,
  );
  const prices = selectedItems.map(item => parseNumericValue(item?.price));
  const priceCalculation = String(group?.priceCalculation || 'sum')
    .trim()
    .toLowerCase();

  if (prices.length === 0) {
    return 0;
  }

  switch (priceCalculation) {
    case 'biggest':
      return Math.max(...prices);
    case 'average':
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    case 'free':
      return 0;
    case 'sum':
    default:
      return prices.reduce((sum, price) => sum + price, 0);
  }
};

const buildCoverUrl = product => {
  const files = Array.isArray(product?.productFiles) ? product.productFiles : [];
  const coverRelationId = normalizeEntityId(product?.extraData?.imageCoverRelationId);
  const filesByNewestRelation = [...files].sort(
    (left, right) =>
      parseNumericValue(normalizeEntityId(right?.id)) -
      parseNumericValue(normalizeEntityId(left?.id)),
  );
  const coverRelation =
    files.find(item => normalizeEntityId(item?.id) === coverRelationId && item?.file) ||
    filesByNewestRelation.find(item => item?.file);

  return coverRelation?.file ? resolveFileImageUrl(coverRelation.file) : null;
};

const resolveProductInitial = product =>
  String(product?.product || product?.name || '?').trim().charAt(0).toUpperCase() ||
  '?';

const normalizeOptionDedupKey = option => {
  const product = option?.value?.productChild || {};
  const name = String(product?.product || product?.name || option?.label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const price = parseNumericValue(option?.value?.price).toFixed(2);

  return `${name}:${price}`;
};

const CustomizeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {width, height} = useWindowDimensions();
  const viewportWidth =
    Number.isFinite(width) && width > 0
      ? width
      : typeof window !== 'undefined'
        ? window.innerWidth
        : 1024;
  const viewportHeight =
    Number.isFinite(height) && height > 0
      ? height
      : typeof window !== 'undefined'
        ? window.innerHeight
        : 768;
  const isLargeScreen = viewportWidth >= 960;
  const requestedPresentation = route.params?.presentation || null;
  const isBottomSheet =
    requestedPresentation === 'bottomSheet' && !isLargeScreen;
  const bottomSheetHeight = Math.min(
    Math.max(360, viewportHeight - 20),
    Math.max(420, Math.round(viewportHeight * 0.9)),
  );
  const modalHeight = isLargeScreen
    ? Math.max(640, Math.min(viewportHeight - 64, 900))
    : isBottomSheet
      ? bottomSheetHeight
    : viewportHeight;
  const modalWidth = isLargeScreen
    ? Math.max(840, Math.min(viewportWidth - 56, 1180))
    : viewportWidth;
  const {
    product: routeProduct = null,
    productId: routeProductId = null,
    orderProduct: routeOrderProduct = null,
    orderProductId: routeOrderProductId = null,
    interactionMode = null,
    singleItemMode = false,
    redirectToCart = false,
    returnDepth = 3,
  } = route.params || {};
  const isPdvCustomizationFlow =
    String(interactionMode || '').trim().toLowerCase() === 'pdv';
  const [productGroupsByProductId, setProductGroupsByProductId] = useState({});
  const [loadingProductGroupsByProductId, setLoadingProductGroupsByProductId] = useState({});
  const [groupProductsByGroup, setGroupProductsByGroup] = useState({});
  const [selectedItemsByNode, setSelectedItemsByNode] = useState({});
  const [customizationNodesByKey, setCustomizationNodesByKey] = useState({});
  const [childNodeBySelectionKey, setChildNodeBySelectionKey] = useState({});
  const [nodeStack, setNodeStack] = useState([]);
  const [optionProductsById, setOptionProductsById] = useState({});

  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const peopleStore = useStore('people');
  const {currentCompany, defaultCompany} = peopleStore.getters;
  const deviceStore = useStore('device');
  const {item: storagedDevice} = deviceStore.getters;
  const isSingleItemCustomizationFlow =
    singleItemMode === true || isPosSingleItemMode(storagedDevice?.configs);
  const product_groupStore = useStore('product_group');
  const productGroupActions = product_groupStore.actions;
  const productsStore = useStore('products');
  const productsActions = productsStore.actions;
  const productsGetters = productsStore.getters;
  const themeStore = useStore('theme');
  const palette = resolveCustomizePalette(themeStore.getters?.colors || {});
  const productGroupProductStore = useStore('product_group_product');
  const productGroupProductActions = productGroupProductStore.actions;
  const cartStore = useStore('cart');
  const cartActions = cartStore.actions;
  const cartGetters = cartStore.getters;

  const order_productsStore = useStore('order_products');
  const orderProductsActions = order_productsStore.actions;
  const orderProductsGetters = order_productsStore.getters;
  const storedOrderProducts = Array.isArray(orderProductsGetters?.items)
    ? orderProductsGetters.items
    : [];
  const storedOrderProductItem = orderProductsGetters?.item;
  const isSavingCustomization = Boolean(orderProductsGetters?.isSaving);
  const {item: order} = ordersGetters;
  const {item: cart} = cartGetters;
  const {ensureActiveOrder} = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
    companyConfigs: currentCompany?.configs,
  });
  const activeChannel = String(order?.app || app_type || 'default').toLowerCase();
  const productGroupActionsRef = useRef(productGroupActions);
  const productsActionsRef = useRef(productsActions);
  const orderProductsActionsRef = useRef(orderProductsActions);
  const productGroupProductActionsRef = useRef(productGroupProductActions);
  const loadedProductGroupsRef = useRef({});
  const loadedGroupProductsRef = useRef({});
  const loadedOptionProductsRef = useRef({});
  const quantityTouchedRef = useRef(false);

  const activeOrderProductId = useMemo(
    () =>
      normalizeEntityId(
        routeOrderProductId ||
        routeOrderProduct?.id ||
        routeOrderProduct?.['@id'],
      ),
    [routeOrderProductId, routeOrderProduct],
  );

  const activeOrderProduct = useMemo(() => {
    if (
      routeOrderProduct &&
      typeof routeOrderProduct === 'object' &&
      normalizeEntityId(routeOrderProduct?.id || routeOrderProduct?.['@id']) ===
        activeOrderProductId
    ) {
      return routeOrderProduct;
    }

    if (
      storedOrderProductItem &&
      typeof storedOrderProductItem === 'object' &&
      normalizeEntityId(
        storedOrderProductItem?.id || storedOrderProductItem?.['@id'],
      ) === activeOrderProductId
    ) {
      return storedOrderProductItem;
    }

    return (
      storedOrderProducts.find(
        item =>
          normalizeEntityId(item?.id || item?.['@id']) === activeOrderProductId,
      ) || null
    );
  }, [
    activeOrderProductId,
    routeOrderProduct,
    storedOrderProductItem,
    storedOrderProducts,
  ]);

  const activeProductId = useMemo(
    () =>
      normalizeEntityId(
        routeProductId ||
          routeProduct?.id ||
          routeProduct?.['@id'] ||
          activeOrderProduct?.product?.id ||
          activeOrderProduct?.product?.['@id'] ||
          route.params?.id,
      ),
    [
      activeOrderProduct?.product?.['@id'],
      activeOrderProduct?.product?.id,
      route.params?.id,
      routeProduct?.['@id'],
      routeProduct?.id,
      routeProductId,
    ],
  );

  const activeProduct = useMemo(() => {
    if (
      routeProduct &&
      typeof routeProduct === 'object' &&
      normalizeEntityId(routeProduct?.id || routeProduct?.['@id']) ===
        activeProductId
    ) {
      return routeProduct;
    }

    if (
      activeOrderProduct?.product &&
      normalizeEntityId(
        activeOrderProduct.product?.id || activeOrderProduct.product?.['@id'],
      ) === activeProductId
    ) {
      return activeOrderProduct.product;
    }

    if (
      productsGetters?.item &&
      typeof productsGetters.item === 'object' &&
      normalizeEntityId(
        productsGetters.item?.id || productsGetters.item?.['@id'],
      ) === activeProductId
    ) {
      return productsGetters.item;
    }

    return null;
  }, [
    activeOrderProduct?.product,
    activeProductId,
    productsGetters?.item,
    routeProduct,
  ]);
  const activeResolvedProductId = useMemo(
    () => normalizeEntityId(activeProduct?.id || activeProduct?.['@id']),
    [activeProduct],
  );
  const activeOrderProductQuantity = useMemo(
    () => resolvePositiveQuantity(activeOrderProduct?.quantity || 1),
    [activeOrderProduct?.quantity],
  );
  const [itemQuantity, setItemQuantity] = useState(
    () => activeOrderProductQuantity,
  );

  const activeProductIri = useMemo(() => {
    if (activeProduct?.['@id']) {
      return activeProduct['@id'];
    }
    return activeProductId ? `/products/${activeProductId}` : null;
  }, [activeProduct, activeProductId]);
  const isEditingExistingOrderProduct = !!activeOrderProductId;

  const activeOrderId = useMemo(
    () =>
      normalizeEntityId(
        activeOrderProduct?.order?.id ||
          activeOrderProduct?.order?.['@id'] ||
          order?.id ||
          order?.['@id'] ||
          cart?.id ||
          cart?.['@id'],
      ),
    [activeOrderProduct, cart, order],
  );

  const activeOrderIri = useMemo(() => {
    if (activeOrderProduct?.order?.['@id']) {
      return activeOrderProduct.order['@id'];
    }

    if (activeOrderProduct?.order?.id) {
      return `/orders/${activeOrderProduct.order.id}`;
    }

    if (order?.['@id']) {
      return order['@id'];
    }
    if (cart?.['@id']) {
      return cart['@id'];
    }
    return cart?.id ? `/orders/${cart.id}` : null;
  }, [activeOrderProduct, cart, order]);

  const rootNodeKey = useMemo(
    () => `root:${activeOrderProductId || activeProductId || 'product'}`,
    [activeOrderProductId, activeProductId],
  );

  const existingCustomizationTree = useMemo(
    () =>
      buildExistingCustomizationTree({
        orderProduct: activeOrderProduct,
        rootNodeKey,
        rootQuantity: activeOrderProductQuantity,
      }),
    [activeOrderProduct, activeOrderProductQuantity, rootNodeKey],
  );

  const activeNodeKey = nodeStack[nodeStack.length - 1] || rootNodeKey;
  const activeNode =
    activeNodeKey === rootNodeKey
      ? {
          nodeKey: rootNodeKey,
          product: activeProduct,
          productId: activeProductId,
          parentNodeKey: null,
        }
      : customizationNodesByKey[activeNodeKey] ||
        existingCustomizationTree.nodeProductsByKey[activeNodeKey] ||
        null;
  const activeDisplayedProduct =
    activeNodeKey === rootNodeKey ? activeProduct : activeNode?.product || null;
  const activeDisplayedProductId = useMemo(
    () =>
      normalizeEntityId(
        activeDisplayedProduct?.id || activeDisplayedProduct?.['@id'],
      ) || activeNode?.productId || null,
    [activeDisplayedProduct, activeNode?.productId],
  );

  const resolvedProductGroups = useMemo(() => {
    const groups = Array.isArray(productGroupsByProductId[activeDisplayedProductId])
      ? productGroupsByProductId[activeDisplayedProductId]
      : [];

    return [...groups].sort((leftGroup, rightGroup) => {
      const leftOrder = parseNumericValue(leftGroup?.groupOrder);
      const rightOrder = parseNumericValue(rightGroup?.groupOrder);

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return (
        parseNumericValue(normalizeEntityId(leftGroup?.id)) -
        parseNumericValue(normalizeEntityId(rightGroup?.id))
      );
    });
  }, [activeDisplayedProductId, productGroupsByProductId]);

  const resolvedProductGroupsById = useMemo(
    () =>
      Object.fromEntries(
        resolvedProductGroups
          .map(group => [String(normalizeEntityId(group?.id || group?.['@id'])), group])
          .filter(([groupId]) => !!groupId),
      ),
    [resolvedProductGroups],
  );

  const resolvedProductGroupIdsKey = useMemo(
    () =>
      resolvedProductGroups
        .map(group => normalizeEntityId(group?.id || group?.['@id']))
        .filter(Boolean)
        .join(','),
    [resolvedProductGroups],
  );

  const parseCsv = value =>
    String(value || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

  const timeNow = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const isBetweenTime = (current, from, to) => {
    if (!from && !to) return true;
    if (!from || !to) return true;
    return current >= from && current <= to;
  };

  useEffect(() => {
    productGroupActionsRef.current = productGroupActions;
  }, [productGroupActions]);

  useEffect(() => {
    productsActionsRef.current = productsActions;
  }, [productsActions]);

  useEffect(() => {
    orderProductsActionsRef.current = orderProductsActions;
  }, [orderProductsActions]);

  useEffect(() => {
    productGroupProductActionsRef.current = productGroupProductActions;
  }, [productGroupProductActions]);

  const ensureProductGroupsLoaded = useCallback(
    async productId => {
      const normalizedProductId = normalizeEntityId(productId);

      if (!normalizedProductId) {
        return [];
      }

      if (loadedProductGroupsRef.current[normalizedProductId] === 'loaded') {
        return Array.isArray(productGroupsByProductId[normalizedProductId])
          ? productGroupsByProductId[normalizedProductId]
          : [];
      }

      if (loadedProductGroupsRef.current[normalizedProductId] === 'loading') {
        return [];
      }

      loadedProductGroupsRef.current[normalizedProductId] = 'loading';
      setLoadingProductGroupsByProductId(prev => ({
        ...prev,
        [normalizedProductId]: true,
      }));

      try {
        const items = await productGroupActionsRef.current.getItems({
          product: normalizedProductId,
          'product.productType': 'component',
        });
        const nextItems = Array.isArray(items) ? items : [];

        loadedProductGroupsRef.current[normalizedProductId] = 'loaded';
        setProductGroupsByProductId(prev => ({
          ...prev,
          [normalizedProductId]: nextItems,
        }));
        setLoadingProductGroupsByProductId(prev => ({
          ...prev,
          [normalizedProductId]: false,
        }));

        return nextItems;
      } catch {
        delete loadedProductGroupsRef.current[normalizedProductId];
        setLoadingProductGroupsByProductId(prev => ({
          ...prev,
          [normalizedProductId]: false,
        }));
        return [];
      }
    },
    [productGroupsByProductId],
  );

  useFocusEffect(
    useCallback(() => {
      if (activeProductId) {
        ensureProductGroupsLoaded(activeProductId).catch(() => null);
      }
    }, [activeProductId, ensureProductGroupsLoaded]),
  );

  useEffect(() => {
    quantityTouchedRef.current = false;
    setItemQuantity(activeOrderProductQuantity);
  }, [activeOrderProductId, activeProductId]);

  useEffect(() => {
    if (!quantityTouchedRef.current) {
      setItemQuantity(activeOrderProductQuantity);
    }
  }, [activeOrderProductQuantity]);

  useEffect(() => {
    setSelectedItemsByNode({});
    setCustomizationNodesByKey(
      Object.fromEntries(
        Object.entries(existingCustomizationTree.nodeProductsByKey).map(
          ([nodeKey, node]) => [
            nodeKey,
            {
              ...node,
              ...(nodeKey === rootNodeKey
                ? {
                    nodeKey: rootNodeKey,
                    product:
                      activeProduct ||
                      existingCustomizationTree.nodeProductsByKey[rootNodeKey]
                        ?.product ||
                      null,
                    productId: activeProductId,
                    parentNodeKey: null,
                  }
                : {}),
            },
          ],
        ),
      ),
    );
    setChildNodeBySelectionKey(existingCustomizationTree.childNodeBySelectionKey);
    setNodeStack([rootNodeKey]);
  }, [
    activeOrderProductId,
    activeProductId,
    existingCustomizationTree.childNodeBySelectionKey,
    existingCustomizationTree.nodeProductsByKey,
    rootNodeKey,
  ]);

  useEffect(() => {
    if (!activeProduct) {
      return;
    }

    setCustomizationNodesByKey(prev => ({
      ...prev,
      [rootNodeKey]: {
        ...(prev[rootNodeKey] || {}),
        nodeKey: rootNodeKey,
        product: activeProduct,
        productId: activeProductId,
        parentNodeKey: null,
      },
    }));
  }, [activeProduct, activeProductId, rootNodeKey]);

  useEffect(() => {
    Object.values(customizationNodesByKey).forEach(node => {
      if (node?.nodeKey !== rootNodeKey && node?.productId) {
        ensureProductGroupsLoaded(node.productId).catch(() => null);
      }
    });
  }, [customizationNodesByKey, ensureProductGroupsLoaded, rootNodeKey]);

  useEffect(() => {
    setGroupProductsByGroup({});
    loadedGroupProductsRef.current = {};
    setOptionProductsById({});
    loadedOptionProductsRef.current = {};
  }, [activeProductId]);

  const optionProductIdsNeedingImagesKey = useMemo(() => {
    const ids = new Set();

    Object.values(groupProductsByGroup).forEach(groupProducts => {
      if (!Array.isArray(groupProducts)) {
        return;
      }

      groupProducts.forEach(item => {
        const product = item?.productChild;
        const productId = normalizeEntityId(product?.id || product?.['@id']);
        const productFiles = Array.isArray(product?.productFiles)
          ? product.productFiles
          : [];

        if (productId && productFiles.length === 0) {
          ids.add(productId);
        }
      });
    });

    return Array.from(ids).sort((left, right) => Number(left) - Number(right)).join(',');
  }, [groupProductsByGroup]);

  useEffect(() => {
    const productIds = optionProductIdsNeedingImagesKey
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .filter(
        productId =>
          !optionProductsById[productId] &&
          loadedOptionProductsRef.current[productId] !== 'loading' &&
          loadedOptionProductsRef.current[productId] !== 'loaded',
      );

    if (productIds.length === 0) {
      return;
    }

    let isActive = true;
    productIds.forEach(productId => {
      loadedOptionProductsRef.current[productId] = 'loading';
    });

    productsActionsRef.current
      .getItems({
        id: productIds,
      })
      .then(items => {
        if (!isActive) {
          return;
        }

        const nextProducts = {};
        (Array.isArray(items) ? items : []).forEach(product => {
          const productId = normalizeEntityId(product?.id || product?.['@id']);
          if (productId) {
            nextProducts[productId] = product;
          }
        });

        productIds.forEach(productId => {
          loadedOptionProductsRef.current[productId] = 'loaded';
        });

        setOptionProductsById(prev => ({
          ...prev,
          ...nextProducts,
        }));
      })
      .catch(() => {
        productIds.forEach(productId => {
          delete loadedOptionProductsRef.current[productId];
        });
      });

    return () => {
      isActive = false;
    };
  }, [optionProductIdsNeedingImagesKey, optionProductsById]);

  useFocusEffect(
    useCallback(() => {
      if (activeOrderProductId) {
        orderProductsActionsRef.current.get(activeOrderProductId).catch(() => null);
      }

      if (
        activeProductId &&
        activeResolvedProductId !== activeProductId
      ) {
        productsActionsRef.current.get(activeProductId).catch(() => null);
      }
    }, [
      activeOrderProductId,
      activeProductId,
      activeResolvedProductId,
    ]),
  );
  const closeCustomizeScreen = useCallback(() => {
    if (
      typeof navigation.canGoBack === 'function' &&
      navigation.canGoBack()
    ) {
      navigation.goBack();
      return;
    }

    navigation.navigate('ShopIndex', {store: 'categories'});
  }, [navigation]);

  const finishCustomizeScreen = useCallback((nextOrderId = activeOrderId) => {
    if (redirectToCart) {
      navigation.navigate('ShopCartPage');
      return;
    }

    if (isSingleItemCustomizationFlow && nextOrderId) {
      // No single-item, o customizado vai direto para o pagamento;
      // a tela de order details nao deve virar destino desse fluxo.
      navigation.replace(
        'Checkout',
        buildCheckoutRouteParams(
          nextOrderId,
          buildManagerPdvRouteParams({showBottomCart: false}),
        ),
      );
      return;
    }

    if (
      isPdvCustomizationFlow &&
      nextOrderId
    ) {
      navigation.replace(
        'OrderDetails',
        buildOrderDetailsRouteParams(
          nextOrderId,
          buildManagerPdvRouteParams({showBottomCart: false}),
        ),
      );
      return;
    }

    navigation.pop(Math.max(1, Number(returnDepth || 1)));
  }, [
    activeOrderId,
    isPdvCustomizationFlow,
    isSingleItemCustomizationFlow,
    navigation,
    redirectToCart,
    returnDepth,
  ]);

  const refreshSavedOrderProducts = useCallback(async () => {
    if (!activeOrderId) {
      return [];
    }

    const refreshedOrderProducts = await orderProductsActions.getItems({
      'order.id': Number(activeOrderId),
    });

    if (typeof ordersActions.syncOrderProducts === 'function') {
      ordersActions.syncOrderProducts({
        orderId: Number(activeOrderId),
        orderProducts: refreshedOrderProducts,
      });
    } else if (
      order &&
      normalizeEntityId(order?.id || order?.['@id']) === activeOrderId
    ) {
      ordersActions.setItem(
        mergeOrderWithOrderProducts(order, refreshedOrderProducts),
      );
    }

    if (
      cart &&
      typeof cartActions?.setItem === 'function' &&
      normalizeEntityId(cart?.id || cart?.['@id']) === activeOrderId
    ) {
      cartActions.setItem(
        mergeOrderWithOrderProducts(cart, refreshedOrderProducts),
      );
    }

    return refreshedOrderProducts;
  }, [
    activeOrderId,
    cart,
    cartActions,
    order,
    orderProductsActions,
    ordersActions,
  ]);

  useEffect(() => {
    let isActive = true;

    if (!Array.isArray(resolvedProductGroups) || resolvedProductGroups.length === 0) {
      setGroupProductsByGroup({});
      return () => {
        isActive = false;
      };
    }

    const currentGroups = resolvedProductGroups
      .map(group => ({
        id: String(normalizeEntityId(group?.id || group?.['@id'])),
        group,
      }))
      .filter(({id}) => !!id);

    const pendingGroups = currentGroups.filter(({id}) => {
      const cacheKey = `${activeDisplayedProductId || 'none'}:${id}`;
      return !loadedGroupProductsRef.current[cacheKey];
    });

    if (pendingGroups.length === 0) {
      setGroupProductsByGroup(prev =>
        Object.fromEntries(
          currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []]),
        ),
      );

      return () => {
        isActive = false;
      };
    }

    pendingGroups.forEach(({id}) => {
      loadedGroupProductsRef.current[`${activeDisplayedProductId || 'none'}:${id}`] =
        'loading';
    });

    Promise.all(
      pendingGroups.map(async ({id, group}) => {
        const groupProducts = await productGroupProductActionsRef.current.getItems({
          productGroup: `/product_groups/${group.id}`,
          productType: 'component',
        });

        return [id, Array.isArray(groupProducts) ? groupProducts : []];
      }),
    )
      .then(entries => {
        if (!isActive) {
          return;
        }

        entries.forEach(([id]) => {
          loadedGroupProductsRef.current[`${activeDisplayedProductId || 'none'}:${id}`] =
            'loaded';
        });

        setGroupProductsByGroup(prev => {
          const nextGroups = Object.fromEntries(
            currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []]),
          );

          entries.forEach(([id, items]) => {
            nextGroups[id] = items;
          });

          return nextGroups;
        });
      })
      .catch(() => {
        pendingGroups.forEach(({id}) => {
          delete loadedGroupProductsRef.current[
            `${activeDisplayedProductId || 'none'}:${id}`
          ];
        });

        if (!isActive) {
          return;
        }

        setGroupProductsByGroup(prev =>
          Object.fromEntries(
            currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []]),
          ),
        );
      });

    return () => {
      isActive = false;
      pendingGroups.forEach(({id}) => {
        const cacheKey = `${activeDisplayedProductId || 'none'}:${id}`;
        if (loadedGroupProductsRef.current[cacheKey] === 'loading') {
          delete loadedGroupProductsRef.current[cacheKey];
        }
      });
    };
  }, [activeDisplayedProductId, resolvedProductGroupIdsKey, resolvedProductGroups]);

  const getNodeProductGroups = useCallback(
    nodeKey => {
      const nodeProductId =
        nodeKey === rootNodeKey
          ? activeProductId
          : customizationNodesByKey[nodeKey]?.productId ||
            existingCustomizationTree.nodeProductsByKey[nodeKey]?.productId;

      return Array.isArray(productGroupsByProductId[nodeProductId])
        ? productGroupsByProductId[nodeProductId]
        : [];
    },
    [
      activeProductId,
      customizationNodesByKey,
      existingCustomizationTree.nodeProductsByKey,
      productGroupsByProductId,
      rootNodeKey,
    ],
  );

  const resolveNodeGroupItemsFromSource = useCallback(
    (nodeKey, group, sourceSelectedItemsByNode) => {
      const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
      const storedGroupItems = sourceSelectedItemsByNode?.[nodeKey]?.[groupId];

      if (Array.isArray(storedGroupItems)) {
        return storedGroupItems;
      }

      const existingSelections =
        existingCustomizationTree.existingSelectionsByNode?.[nodeKey]?.[groupId] ||
        {};
      const groupProducts = Array.isArray(groupProductsByGroup[groupId])
        ? groupProductsByGroup[groupId]
        : [];

      return groupProducts.map(item => {
        const productId = normalizeEntityId(
          item?.productChild?.id || item?.productChild?.['@id'],
        );

        return {
          ...item,
          selected: !!existingSelections[productId]?.selected,
          quantity:
            existingSelections[productId]?.quantity ||
            parseNumericValue(item?.quantity || 1) ||
            1,
        };
      });
    },
    [existingCustomizationTree.existingSelectionsByNode, groupProductsByGroup],
  );

  const getNodeGroupItems = useCallback(
    (nodeKey, group) =>
      resolveNodeGroupItemsFromSource(nodeKey, group, selectedItemsByNode),
    [resolveNodeGroupItemsFromSource, selectedItemsByNode],
  );

  const buildGroupSummary = useCallback(
    (nodeKey, group) => {
      const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
      const groupItems = getNodeGroupItems(nodeKey, group);
      const selectedCount = groupItems.filter(item => item?.selected).length;
      const minimum = resolveEffectiveGroupMinimum(group);
      const maximum = resolveEffectiveGroupMaximum(group);
      const extraPrice = calculateGroupExtraPrice(group, groupItems);
      let validationMessage = '';

      if (selectedCount < minimum) {
        validationMessage =
          minimum === 1
            ? 'Selecione 1 opcao.'
            : `Selecione pelo menos ${minimum} opcoes.`;
      } else if (maximum !== null && selectedCount > maximum) {
        validationMessage =
          maximum === 1
            ? 'Selecione no maximo 1 opcao.'
            : `Selecione no maximo ${maximum} opcoes.`;
      }

      let selectionRuleLabel = 'Sem limite de selecao.';
      if (minimum > 0 && maximum !== null) {
        selectionRuleLabel = `Escolha de ${minimum} ate ${maximum} opcoes.`;
      } else if (minimum > 0) {
        selectionRuleLabel = `Escolha no minimo ${minimum} opcoes.`;
      } else if (maximum !== null) {
        selectionRuleLabel = `Escolha ate ${maximum} opcoes.`;
      }

      return {
        nodeKey,
        groupId,
        groupName: group?.productGroup || `Grupo ${groupId}`,
        selectedCount,
        minimum,
        maximum,
        extraPrice,
        isValid: validationMessage === '',
        validationMessage,
        selectionRuleLabel,
        priceCalculationLabel: resolvePriceCalculationLabel(
          group?.priceCalculation,
        ),
        isRequired: minimum > 0 || !!group?.required,
      };
    },
    [getNodeGroupItems],
  );

  const groupSummaries = useMemo(
    () => resolvedProductGroups.map(group => buildGroupSummary(activeNodeKey, group)),
    [activeNodeKey, buildGroupSummary, resolvedProductGroups],
  );

  const groupSummariesById = useMemo(
    () => Object.fromEntries(groupSummaries.map(summary => [summary.groupId, summary])),
    [groupSummaries],
  );

  const allGroupSummaries = useMemo(() => {
    const visitNode = nodeKey => {
      const currentGroups = getNodeProductGroups(nodeKey);
      const currentSummaries = currentGroups.map(group =>
        buildGroupSummary(nodeKey, group),
      );
      const descendantSummaries = currentGroups.flatMap(group => {
        const groupId = String(normalizeEntityId(group?.id || group?.['@id']));

        return getNodeGroupItems(nodeKey, group)
          .filter(item => item?.selected)
          .flatMap(item => {
            const productId = normalizeEntityId(
              item?.productChild?.id || item?.productChild?.['@id'],
            );
            const childNodeKey =
              childNodeBySelectionKey[
                buildCustomizationSelectionKey(nodeKey, groupId, productId)
              ];

            return childNodeKey ? visitNode(childNodeKey) : [];
          });
      });

      return [...currentSummaries, ...descendantSummaries];
    };

    return visitNode(rootNodeKey);
  }, [
    buildGroupSummary,
    childNodeBySelectionKey,
    getNodeGroupItems,
    getNodeProductGroups,
    rootNodeKey,
  ]);

  const invalidGroupSummaries = useMemo(
    () => allGroupSummaries.filter(summary => !summary.isValid),
    [allGroupSummaries],
  );

  const allSelectedNodeItems = useMemo(() => {
    const collectedItems = [];
    const visitedNodeKeys = new Set([
      rootNodeKey,
      ...Object.keys(customizationNodesByKey),
      ...Object.values(childNodeBySelectionKey),
    ]);

    visitedNodeKeys.forEach(nodeKey => {
      getNodeProductGroups(nodeKey).forEach(group => {
        getNodeGroupItems(nodeKey, group)
          .filter(item => item?.selected)
          .forEach(item => collectedItems.push(item));
      });
    });

    return collectedItems;
  }, [
    childNodeBySelectionKey,
    customizationNodesByKey,
    getNodeGroupItems,
    getNodeProductGroups,
    rootNodeKey,
  ]);

  const isLoadingProductGroups = useMemo(
    () => Object.values(loadingProductGroupsByProductId).some(Boolean),
    [loadingProductGroupsByProductId],
  );

  /*
   * @agents Shop customization can enter through a refreshed/deep-linked page.
   * Keep the action enabled after option validation; addHandle owns cart
   * rehydration before persisting the customized order product.
   */
  const canSubmitCustomization =
    !!activeProductIri &&
    (isPdvCustomizationFlow || !!activeOrderIri || !isEditingExistingOrderProduct) &&
    !isLoadingProductGroups &&
    invalidGroupSummaries.length === 0;
  const productCoverUrl = useMemo(
    () => buildCoverUrl(activeDisplayedProduct),
    [activeDisplayedProduct],
  );
  const selectedGroupsCount = allGroupSummaries.filter(
    summary => summary.selectedCount > 0,
  ).length;
  const selectedOptionsCount = allGroupSummaries.reduce(
    (sum, summary) => sum + (summary.selectedCount || 0),
    0,
  );
  const complementsTotal = allGroupSummaries.reduce(
    (sum, summary) => sum + parseNumericValue(summary.extraPrice),
    0,
  );
  const basePrice = parseNumericValue(activeProduct?.price || activeOrderProduct?.price);
  // No single-item, a quantidade eh implicita e a tela nao mostra o stepper.
  const resolvedItemQuantity = isSingleItemCustomizationFlow
    ? 1
    : resolvePositiveQuantity(itemQuantity);
  const itemTotal = (basePrice + complementsTotal) * resolvedItemQuantity;
  const submitLabel = isSavingCustomization
    ? 'SALVANDO...'
    : isEditingExistingOrderProduct
      ? 'MODIFICAR'
      : 'ADICIONAR';
  const selectedOptionsLabel =
    selectedOptionsCount === 1
      ? '1 selecao feita'
      : `${selectedOptionsCount} selecoes feitas`;

  const getNodeProduct = useCallback(
    nodeKey => {
      if (nodeKey === rootNodeKey) {
        return activeProduct;
      }

      return (
        customizationNodesByKey[nodeKey]?.product ||
        existingCustomizationTree.nodeProductsByKey[nodeKey]?.product ||
        null
      );
    },
    [
      activeProduct,
      customizationNodesByKey,
      existingCustomizationTree.nodeProductsByKey,
      rootNodeKey,
    ],
  );
  const isNestedCustomization = activeNodeKey !== rootNodeKey;
  const activeParentNodeKey = isNestedCustomization
    ? nodeStack[nodeStack.length - 2] || rootNodeKey
    : null;
  const activeParentProduct = activeParentNodeKey
    ? getNodeProduct(activeParentNodeKey)
    : null;
  const returnToParentCustomization = useCallback(() => {
    setNodeStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const getProcessedOptions = group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    let options = getProductOptions(group, activeNodeKey);
    const dedupedOptions = [];
    const dedupedOptionIndexByKey = {};

    options.forEach(option => {
      const key = normalizeOptionDedupKey(option);
      const existingIndex = dedupedOptionIndexByKey[key];

      if (existingIndex === undefined) {
        dedupedOptionIndexByKey[key] = dedupedOptions.length;
        dedupedOptions.push(option);
        return;
      }

      if (isSelected(groupId, option.value, activeNodeKey)) {
        dedupedOptions[existingIndex] = option;
      }
    });

    options = dedupedOptions;
    const selectedCount = groupSummariesById[groupId]?.selectedCount || 0;
    const maximum = resolveEffectiveGroupMaximum(group);
    const isMaxReached = maximum !== null && selectedCount >= maximum;

    if (isMaxReached) {
      options = options.filter(option =>
        isSelected(groupId, option.value, activeNodeKey),
      );
    }

    const now = timeNow();
    return options.map(option => ({
      ...option,
      disable:
        isMaxSelected(group, option.value, activeNodeKey) ||
        isOptionDisabledByRules(groupId, option.value, now),
    }));
  };

  const isOptionDisabledByRules = (groupId, optionValue, now) => {
    const extra = optionValue?.extraData || {};

    // Channel rule
    const channels = parseCsv(extra.channels || '');
    if (channels.length > 0) {
      const normalized = channels.map(c => c.toLowerCase());
      if (!normalized.includes(activeChannel)) return true;
    }

    // Availability time window rule (HH:mm)
    const from = extra.availableFrom || '';
    const to = extra.availableTo || '';
    if (!isBetweenTime(now, from, to)) return true;

    // Incompatibility rule with selected options by id
    const incompatibleIds = parseCsv(extra.incompatibleWith || '').map(v =>
      String(v).replace(/\D/g, ''),
    );
    if (incompatibleIds.length > 0) {
      const selectedIds = allSelectedNodeItems
        .map(item =>
          String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(
            /\D/g,
            '',
          ),
        )
        .filter(Boolean);
      if (incompatibleIds.some(id => selectedIds.includes(id))) return true;
    }

    // Substitution rule: if substituteFor is set and target is already selected, block this option
    const substituteFor = String(extra.substituteFor || '').replace(/\D/g, '');
    if (substituteFor) {
      const targetSelected = allSelectedNodeItems.some(item => {
          const id = String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(/\D/g, '');
          return id === substituteFor;
        });
      if (targetSelected) return true;
    }

    return false;
  };

  const getProductOptions = (group, nodeKey = activeNodeKey) => {
    const groupItems = getNodeGroupItems(nodeKey, group);
    if (!Array.isArray(groupItems)) {
      return [];
    }
    return groupItems.map(product => ({
      label: product.productChild?.product,
      value: product,
    }));
  };

  const isSelected = (groupId, value, nodeKey = activeNodeKey) => {
    const normalizedGroupId = String(groupId || '');
    return (
      getNodeGroupItems(nodeKey, resolvedProductGroupsById[normalizedGroupId]).some(
        item => item['@id'] === value['@id'] && item.selected,
      ) || false
    );
  };

  const isMaxSelected = (group, product, nodeKey = activeNodeKey) => {
    const maximum = resolveEffectiveGroupMaximum(group);
    if (maximum === null) {
      return false;
    }
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const selectedGroup = getNodeGroupItems(nodeKey, group);
    return (
      selectedGroup.filter(item => item.selected).length >= maximum &&
      !selectedGroup.some(p => p['@id'] === product['@id'] && p.selected)
    );
  };

  const openChildCustomization = async (groupId, option) => {
    const optionProductId = normalizeEntityId(
      option?.value?.productChild?.id || option?.value?.productChild?.['@id'],
    );

    if (!optionProductId) {
      return;
    }

    const nestedGroups = await ensureProductGroupsLoaded(optionProductId);

    if (nestedGroups.length === 0) {
      return;
    }

    const selectionKey = buildCustomizationSelectionKey(
      activeNodeKey,
      String(groupId || ''),
      optionProductId,
    );
    const childNodeKey =
      childNodeBySelectionKey[selectionKey] ||
      buildCustomizationNodeKey(activeNodeKey, groupId, optionProductId);

    setCustomizationNodesByKey(prev => ({
      ...prev,
      [childNodeKey]: {
        ...(prev[childNodeKey] || {}),
        ...(existingCustomizationTree.nodeProductsByKey[childNodeKey] || {}),
        nodeKey: childNodeKey,
        product: optionProductsById[optionProductId] || option?.value?.productChild || null,
        productId: optionProductId,
        parentNodeKey: activeNodeKey,
      },
    }));
    setChildNodeBySelectionKey(prev => ({
      ...prev,
      [selectionKey]: childNodeKey,
    }));
    setNodeStack(prev =>
      prev[prev.length - 1] === childNodeKey ? prev : [...prev, childNodeKey],
    );
  };

  const handleToggleOption = async (groupId, option) => {
    const normalizedGroupId = String(groupId || '');
    const currentGroup = resolvedProductGroupsById[normalizedGroupId];
    const selectedGroup = resolveNodeGroupItemsFromSource(
      activeNodeKey,
      currentGroup,
      selectedItemsByNode,
    );
    const optionId = option?.value?.['@id'];
    const maximum = resolveEffectiveGroupMaximum(currentGroup);
    const selectedCount = selectedGroup.filter(item => item?.selected).length;
    const targetOption = selectedGroup.find(item => item['@id'] === optionId);
    const willSelectOption = !targetOption?.selected;

    if (willSelectOption && maximum !== null && selectedCount >= maximum) {
      return;
    }

    setSelectedItemsByNode(prev => {
      const currentSelectedGroup = resolveNodeGroupItemsFromSource(
        activeNodeKey,
        currentGroup,
        prev,
      );
      const updatedGroup = currentSelectedGroup.map(item =>
        item['@id'] === optionId
          ? {...item, selected: !item.selected}
          : item,
      );

      return {
        ...prev,
        [activeNodeKey]: {
          ...(prev[activeNodeKey] || {}),
          [normalizedGroupId]: updatedGroup,
        },
      };
    });

    if (willSelectOption) {
      await openChildCustomization(normalizedGroupId, option);
    }
  };

  const getSubproducts = () => {
    const groupsByNode = {};
    const visitedNodeKeys = new Set([
      rootNodeKey,
      ...Object.keys(customizationNodesByKey),
      ...Object.values(childNodeBySelectionKey),
    ]);

    visitedNodeKeys.forEach(nodeKey => {
      const nodeGroups = getNodeProductGroups(nodeKey);

      if (nodeGroups.length === 0) {
        return;
      }

      groupsByNode[nodeKey] = Object.fromEntries(
        nodeGroups.map(group => [
          String(normalizeEntityId(group?.id || group?.['@id'])),
          getNodeGroupItems(nodeKey, group),
        ]),
      );
    });

    return buildRecursiveSubProducts({
      rootNodeKey,
      rootQuantity: resolvedItemQuantity,
      childNodeBySelectionKey,
      groupsByNode,
    });
  };

  const addHandle = async () => {
    if (!activeProductIri) {
      const message =
        'Nao foi possivel identificar produto ou carrinho para adicionar.';
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        Alert.alert('Atencao', message);
      }
      return;
    }

    if (invalidGroupSummaries.length > 0) {
      const message = invalidGroupSummaries
        .map(summary => `${summary.groupName}: ${summary.validationMessage}`)
        .join('\n');

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        Alert.alert('Atencao', message);
      }

      return;
    }

    let targetOrderIri = activeOrderIri;
    let targetOrderId = activeOrderId;

    if (!targetOrderIri && isPdvCustomizationFlow) {
      try {
        const ensuredOrder = await ensureActiveOrder();
        const ensuredOrderId = normalizeEntityId(
          ensuredOrder?.id || ensuredOrder?.['@id'],
        );
        targetOrderId = ensuredOrderId || targetOrderId;
        targetOrderIri =
          ensuredOrder?.['@id'] ||
          (ensuredOrderId ? `/orders/${ensuredOrderId}` : null);
      } catch (error) {
        const message =
          error?.message ||
          'Nao foi possivel salvar a customizacao do item.';

        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(message);
        } else {
          Alert.alert('Atencao', message);
        }

        return;
      }
    }

    if (!targetOrderIri && !isPdvCustomizationFlow) {
      try {
        /*
         * @agents Shop customization can be opened after a browser refresh or
         * direct URL. Rehydrate the active cart through the store before
         * rejecting the save, so custom products keep the same cart contract as
         * simple quantity controls.
         */
        const ensuredCart = await cartActions.discoveryCart({
          provider: defaultCompany?.id,
          client: currentCompany?.id || defaultCompany?.id,
        });
        const ensuredCartId = normalizeEntityId(
          ensuredCart?.id || ensuredCart?.['@id'],
        );
        targetOrderId = ensuredCartId || targetOrderId;
        targetOrderIri =
          ensuredCart?.['@id'] ||
          (ensuredCartId ? `/orders/${ensuredCartId}` : null);
      } catch {
        targetOrderIri = null;
      }
    }

    if (!targetOrderIri) {
      const message =
        'Nao foi possivel identificar produto ou carrinho para adicionar.';
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        Alert.alert('Atencao', message);
      }
      return;
    }

    const orderProductData = {
      ...(activeOrderProductId ? {id: activeOrderProductId} : {}),
      product: activeProductIri,
      sub_products: getSubproducts(),
      order: targetOrderIri,
      quantity: resolvedItemQuantity,
    };

    try {
      if (isSingleItemCustomizationFlow) {
        // No single-item, a troca precisa substituir o pai e manter os filhos
        // do customizado no mesmo envio para nao reaparecerem itens extras.
        await ordersActions.replaceProducts(targetOrderId, orderProductData);
      } else if (activeOrderProductId) {
        await orderProductsActions.save(orderProductData);
      } else {
        /*
         * @agents New customized lines use the order aggregate endpoint so the
         * backend can consolidate an equivalent product and component tree.
         */
        await ordersActions.addProducts(targetOrderId, [orderProductData]);
      }

      try {
        await refreshSavedOrderProducts();
      } catch {
        // The parent screen will still refetch on focus; avoid leaving local
        // order state in a shallow-merged, inconsistent hierarchy.
      }

      finishCustomizeScreen(targetOrderId);
    } catch (error) {
      const message =
        error?.message ||
        'Nao foi possivel salvar a customizacao do item.';

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        Alert.alert('Atencao', message);
      }
    }
  };

  const renderProductImage = ({product, imageUrl, wrapperStyle, imageStyle}) => {
    if (imageUrl) {
      return (
        <View style={wrapperStyle}>
          <Image source={{uri: imageUrl}} style={imageStyle} resizeMode="cover" />
        </View>
      );
    }

    return (
      <View style={wrapperStyle}>
        <View style={customizeHeroPlaceholderStyle({palette})}>
          <Text style={customizeHeroPlaceholderTextStyle({palette})}>
            {resolveProductInitial(product)}
          </Text>
        </View>
      </View>
    );
  };

  const renderOption = (group, option, index) => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const isOptionSelected = isSelected(groupId, option.value);
    const optionQuantityLabel = formatOptionQuantity(option.value?.quantity || 1);
    const baseOptionProduct = option.value?.productChild;
    const optionProductId = normalizeEntityId(
      baseOptionProduct?.id || baseOptionProduct?.['@id'],
    );
    const hydratedOptionProduct = optionProductId
      ? optionProductsById[optionProductId]
      : null;
    const optionProduct = hydratedOptionProduct
      ? {
          ...baseOptionProduct,
          ...hydratedOptionProduct,
        }
      : baseOptionProduct;
    const optionImageUrl = buildCoverUrl(optionProduct);
    const optionPrice = parseNumericValue(option.value?.price);
    const optionUnitLabel =
      optionProduct?.productUnit?.productUnit ||
      optionProduct?.productUnity?.productUnit ||
      optionProduct?.productUnit?.unit ||
      optionProduct?.productUnity?.unit ||
      '';
    const optionSelectionKey = buildCustomizationSelectionKey(
      activeNodeKey,
      groupId,
      optionProductId,
    );
    const childNodeKey = childNodeBySelectionKey[optionSelectionKey] || null;
    const childNodeSummaries = childNodeKey
      ? allGroupSummaries.filter(summary => summary.nodeKey === childNodeKey)
      : [];
    const invalidChildGroupCount = childNodeSummaries.filter(
      summary => !summary.isValid,
    ).length;
    const isLoadingChildGroups = !!loadingProductGroupsByProductId[optionProductId];

    return (
      <TouchableOpacity
        key={`${group.id}-${index}`}
        accessibilityLabel={`Selecionar ${option.label}`}
        onPress={() => handleToggleOption(groupId, option)}
        style={customizeOptionTouchableStyle({
          palette,
          selected: isOptionSelected,
          disabled: option.disable,
        })}
        disabled={option.disable}
        activeOpacity={0.78}>
        <View
          style={customizeOptionControlStyle({
            palette,
            selected: isOptionSelected,
          })}>
          {isOptionSelected ? (
            <View style={customizeOptionControlInnerStyle({palette})} />
          ) : null}
        </View>
        <View style={customizeOptionImageWrapStyle({palette})}>
          {optionImageUrl ? (
            <Image
              source={{uri: optionImageUrl}}
              style={customizeOptionImageStyle}
              resizeMode="cover"
            />
          ) : (
            <Text style={customizeOptionPlaceholderTextStyle({palette})}>
              {resolveProductInitial(optionProduct)}
            </Text>
          )}
        </View>
        <View style={customizeOptionBodyStyle}>
          <Text style={customizeOptionNameStyle({palette})} numberOfLines={1}>
            {option.label}
          </Text>
          <Text style={customizeOptionMetaStyle({palette})} numberOfLines={1}>
            Adiciona {optionQuantityLabel}
            {optionUnitLabel ? ` ${optionUnitLabel}` : ''}
          </Text>
          {isOptionSelected && (childNodeKey || isLoadingChildGroups) ? (
            <TouchableOpacity
              accessibilityLabel={`Configurar subitem ${option.label}`}
              onPress={event => {
                event?.stopPropagation?.();
                openChildCustomization(groupId, option).catch(() => null);
              }}
              style={[
                customizeChipStyle({palette}),
                {
                  marginTop: 8,
                  alignSelf: 'flex-start',
                  backgroundColor:
                    invalidChildGroupCount > 0 ? palette.primarySoft : palette.panel,
                },
              ]}
              activeOpacity={0.78}>
              <Text
                style={[
                  customizeChipTextStyle({palette}),
                  invalidChildGroupCount > 0 ? {color: palette.primary} : null,
                ]}>
                {isLoadingChildGroups
                  ? 'Carregando grupos...'
                  : invalidChildGroupCount > 0
                    ? `Revisar ${invalidChildGroupCount} pendencia${invalidChildGroupCount === 1 ? '' : 's'}`
                    : 'Configurar subitem'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text
          style={customizeOptionPriceStyle({
            palette,
            selected: isOptionSelected,
          })}>
          {optionPrice > 0 ? '+' : ''}
          {Formatter.formatMoney(optionPrice, 'R$', 'pt-br')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGroup = group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const summary = groupSummariesById[groupId];
    const compactSummaryParts = [
      summary?.isRequired ? 'Obrigatorio' : 'Opcional',
      resolveCompactSelectionRuleLabel(
        summary?.minimum || 0,
        summary?.maximum ?? null,
      ),
      `preco: ${summary?.priceCalculationLabel || 'soma'}`,
    ];

    return (
      <View
        key={group.id}
        style={customizeGroupCardStyle({
          palette,
          isInvalid: !summary?.isValid,
        })}>
        <View style={customizeGroupHeaderStyle({palette})}>
          <View style={customizeGroupTitleRowStyle}>
            <Text style={customizeGroupTitleStyle({palette})} numberOfLines={2}>
              {group.productGroup}
            </Text>
            <Text style={customizeGroupRuleStyle({palette})}>
              {compactSummaryParts.join(' • ')}
            </Text>
          </View>
          <Text style={customizeGroupMetaStyle({palette})}>
            {resolveCompactGroupStateLabel(summary)}
          </Text>
          {!summary?.isValid ? (
            <Text style={customizeGroupErrorStyle({palette})}>
              {summary.validationMessage}
            </Text>
          ) : null}
        </View>
        <View style={customizeOptionsStackStyle}>
          {getProcessedOptions(group).map((item, index) =>
            renderOption(group, item, index),
          )}
        </View>
      </View>
    );
  };

  const renderSummary = ({compact = false} = {}) => (
    <View style={customizeSummaryCardStyle({palette})}>
      <View style={customizeSummaryHeaderStyle}>
        <View>
          <Text style={customizeSummaryTitleStyle({palette})}>
            {isNestedCustomization ? 'Resumo do subitem' : 'Resumo do item'}
          </Text>
          <Text style={customizeSummaryKickerStyle({palette})}>
            {selectedOptionsLabel}
          </Text>
        </View>
        <Text style={customizeSummaryKickerStyle({palette})}>total</Text>
      </View>
      <Text style={customizeSummaryTotalStyle({palette})}>
        {Formatter.formatMoney(
          isNestedCustomization
            ? groupSummaries.reduce(
                (sum, summary) => sum + parseNumericValue(summary.extraPrice),
                0,
              )
            : itemTotal,
          'R$',
          'pt-br',
        )}
      </Text>
      <View style={customizeSummaryLineStyle({palette})}>
        <Text style={customizeSummaryLabelStyle({palette})}>
          {isNestedCustomization ? 'Item base' : 'Preco base'}
        </Text>
        <Text style={customizeSummaryValueStyle({palette})}>
          {Formatter.formatMoney(
            parseNumericValue(activeDisplayedProduct?.price),
            'R$',
            'pt-br',
          )}
        </Text>
      </View>
      <View style={customizeSummaryLineStyle({palette})}>
        <Text style={customizeSummaryLabelStyle({palette})}>Complementos</Text>
        <Text style={customizeSummaryValueStyle({palette})}>
          {Formatter.formatMoney(
            groupSummaries.reduce(
              (sum, summary) => sum + parseNumericValue(summary.extraPrice),
              0,
            ),
            'R$',
            'pt-br',
          )}
        </Text>
      </View>
      {!compact ? (
        <View style={customizeSummaryGroupListStyle}>
          {groupSummaries.map(summary => (
            <View
              key={summary.groupId}
              style={customizeSummaryGroupItemStyle({palette})}>
              <Text
                style={customizeSummaryGroupNameStyle({palette})}
                numberOfLines={1}>
                {summary.groupName}
              </Text>
              <Text
                style={customizeSummaryGroupStateStyle({
                  palette,
                  valid: summary.isValid,
                })}>
                {summary.isValid
                  ? `${summary.selectedCount}/${summary.maximum || summary.minimum || '-'}`
                  : 'pendente'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {!isNestedCustomization && !isSingleItemCustomizationFlow ? (
        <View style={customizeQuantityRowStyle}>
          <Text style={customizeSummaryLabelStyle({palette})}>Quantidade</Text>
          <View style={customizeQuantityStepperStyle}>
            <TouchableOpacity
              accessibilityLabel={`Diminuir quantidade de ${activeProduct?.product || 'produto personalizado'}`}
              onPress={() => {
                quantityTouchedRef.current = true;
                setItemQuantity(current =>
                  Math.max(1, resolvePositiveQuantity(current) - 1),
                );
              }}
              disabled={resolvedItemQuantity <= 1}
              style={customizeQuantityStepperButtonStyle({
                palette,
                disabled: resolvedItemQuantity <= 1,
              })}
              activeOpacity={0.82}>
              <MaterialCommunityIcons
                name="minus"
                size={16}
                color={resolvedItemQuantity <= 1 ? palette.faint : palette.primary}
              />
            </TouchableOpacity>
            <View style={customizeQuantityPillStyle({palette})}>
              <Text style={customizeQuantityPillTextStyle({palette})}>
                {formatOptionQuantity(resolvedItemQuantity)} un
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel={`Aumentar quantidade de ${activeProduct?.product || 'produto personalizado'}`}
              onPress={() => {
                quantityTouchedRef.current = true;
                setItemQuantity(current => resolvePositiveQuantity(current) + 1);
              }}
              style={customizeQuantityStepperButtonStyle({palette})}
              activeOpacity={0.82}>
              <MaterialCommunityIcons
                name="plus"
                size={16}
                color={palette.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderPrimaryButton = () => {
    const disabled = isNestedCustomization
      ? false
      : isSavingCustomization || !canSubmitCustomization;
    const label = isNestedCustomization ? 'VOLTAR AO ITEM' : submitLabel;

    return (
      <TouchableOpacity
        accessibilityLabel={`${label} ${activeDisplayedProduct?.product || 'produto personalizado'}`}
        accessibilityRole="button"
        onPress={isNestedCustomization ? returnToParentCustomization : addHandle}
        disabled={disabled}
        style={customizeSubmitButtonStyle({
          palette,
          disabled,
        })}
        activeOpacity={0.82}>
        <Text
          style={customizeSubmitButtonTextStyle({
            palette,
            disabled,
          })}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        customizeScreenRootStyle({palette, isLargeScreen, isBottomSheet}),
        Platform.OS === 'web' && (isLargeScreen || isBottomSheet)
          ? {backdropFilter: 'blur(7px)'}
          : null,
      ]}>
      {isLargeScreen || isBottomSheet ? (
        <TouchableOpacity
          onPress={closeCustomizeScreen}
          style={customizeBackdropPressableStyle}
          activeOpacity={1}
        />
      ) : null}
      <View
          style={customizeScreenBackdropStyle({
            isLargeScreen,
            isBottomSheet,
            modalHeight,
            modalWidth,
          })}>
        <View
          style={customizeModalStyle({
            palette,
            isLargeScreen,
            isBottomSheet,
            modalHeight,
            modalWidth,
          })}>
          <View style={customizeMainColumnStyle({palette, isLargeScreen})}>
            <ScrollView
              style={customizeScrollStyle}
              contentContainerStyle={customizeScrollContentStyle({
                isLargeScreen,
              })}>
              <View style={customizeHeaderStyle({isLargeScreen})}>
                <View style={customizeHeaderContentStyle}>
                  <Text style={customizeEyebrowStyle({palette})}>
                    {isNestedCustomization ? 'Subitem personalizavel' : 'Personalizacao'}
                  </Text>
                  <View style={customizeTitleRowStyle}>
                    <Text
                      style={customizeTitleStyle({palette, isLargeScreen})}
                      numberOfLines={3}>
                      {activeDisplayedProduct?.product || 'Produto'}
                    </Text>
                    <TouchableOpacity
                      onPress={closeCustomizeScreen}
                      style={customizeCloseButtonStyle({palette})}
                      activeOpacity={0.78}>
                      <MaterialCommunityIcons
                        name="close"
                        size={20}
                        color={palette.muted}
                      />
                    </TouchableOpacity>
                  </View>
                  {activeDisplayedProduct?.description ? (
                    <Text
                      style={customizeDescriptionStyle({
                        palette,
                        isLargeScreen,
                      })}
                      numberOfLines={3}>
                      {activeDisplayedProduct.description}
                    </Text>
                  ) : null}
                  <View style={customizeChipRowStyle}>
                    {isNestedCustomization ? (
                      <TouchableOpacity
                        accessibilityLabel={`Voltar para ${activeParentProduct?.product || 'item anterior'}`}
                        onPress={returnToParentCustomization}
                        style={customizeChipStyle({palette})}
                        activeOpacity={0.78}>
                        <Text style={customizeChipTextStyle({palette})}>
                          {`← ${activeParentProduct?.product || 'Voltar'}`}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={customizeChipStyle({palette})}>
                      <Text style={customizeChipTextStyle({palette})}>
                        {resolvedProductGroups.length} grupo
                        {resolvedProductGroups.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={customizeChipStyle({palette})}>
                      <Text style={customizeChipTextStyle({palette})}>
                        {selectedGroupsCount} grupo
                        {selectedGroupsCount === 1 ? '' : 's'} com selecao
                      </Text>
                    </View>
                  </View>
                </View>
                {renderProductImage({
                  product: activeDisplayedProduct,
                  imageUrl: productCoverUrl,
                  wrapperStyle: customizeHeroImageWrapStyle({
                    palette,
                    isLargeScreen,
                  }),
                  imageStyle: customizeHeroImageStyle,
                })}
              </View>
              {!isLargeScreen ? (
                <View style={customizeMobileSummaryWrapStyle}>
                  {renderSummary({compact: true})}
                </View>
              ) : null}
              <View style={customizeGroupsStackStyle}>
                {resolvedProductGroups.map(group => renderGroup(group))}
              </View>
            </ScrollView>
          </View>
          {isLargeScreen ? (
            <View style={customizeSummaryColumnStyle({palette, isLargeScreen})}>
              {renderSummary()}
              <View style={customizeFooterStyle({palette, isLargeScreen})}>
                {renderPrimaryButton()}
              </View>
            </View>
          ) : (
            <View style={customizeFooterFloatingStyle({palette})}>
              {renderPrimaryButton()}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default CustomizeScreen;
