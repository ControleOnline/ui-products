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
import {env} from '@env';
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

const normalizeEntityId = value => {
  const clean = String(value || '').replace(/\D/g, '');
  return clean || null;
};

const parseNumericValue = value => {
  const parsedValue = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const resolvePositiveQuantity = value => {
  const quantity = parseNumericValue(value);
  return quantity > 0 ? quantity : 1;
};

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
  const [fetchedProductGroups, setFetchedProductGroups] = useState([]);
  const [isLoadingProductGroups, setIsLoadingProductGroups] = useState(false);
  const [groupProductsByGroup, setGroupProductsByGroup] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
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
  });
  const activeChannel = String(order?.app || env.APP_TYPE || 'default').toLowerCase();
  const productGroupActionsRef = useRef(productGroupActions);
  const productsActionsRef = useRef(productsActions);
  const orderProductsActionsRef = useRef(orderProductsActions);
  const productGroupProductActionsRef = useRef(productGroupProductActions);
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

  const existingSelectionsByGroup = useMemo(() => {
    const mappedSelections = {};
    const components = Array.isArray(activeOrderProduct?.orderProductComponents)
      ? activeOrderProduct.orderProductComponents
      : [];

    components.forEach(component => {
      const groupId = normalizeEntityId(
        component?.productGroup?.id ||
        component?.productGroup?.['@id'] ||
        component?.productGroup,
      );
      const productId = normalizeEntityId(
        component?.product?.id ||
        component?.product?.['@id'] ||
        component?.product,
      );

      if (!groupId || !productId) {
        return;
      }

      if (!mappedSelections[groupId]) {
        mappedSelections[groupId] = {};
      }

      mappedSelections[groupId][productId] = {
        selected: true,
        quantity: (() => {
          const componentQuantity = resolvePositiveQuantity(
            component?.quantity || 1,
          );

          if (activeOrderProductQuantity > 1) {
            const normalizedQuantity =
              componentQuantity / activeOrderProductQuantity;
            return normalizedQuantity > 0 ? normalizedQuantity : 1;
          }

          return componentQuantity;
        })(),
      };
    });

    return mappedSelections;
  }, [activeOrderProduct, activeOrderProductQuantity]);

  const orderProductGroupsById = useMemo(() => {
    const mappedGroups = {};
    const components = Array.isArray(activeOrderProduct?.orderProductComponents)
      ? activeOrderProduct.orderProductComponents
      : [];

    components.forEach(component => {
      const groupId = normalizeEntityId(
        component?.productGroup?.id ||
        component?.productGroup?.['@id'] ||
        component?.productGroup,
      );

      if (!groupId || !component?.productGroup || mappedGroups[groupId]) {
        return;
      }

      mappedGroups[groupId] = component.productGroup;
    });

    return mappedGroups;
  }, [activeOrderProduct]);

  const resolvedProductGroups = useMemo(() => {
    const mappedGroups = {};

    ;(Array.isArray(fetchedProductGroups) ? fetchedProductGroups : []).forEach(group => {
      const groupId = normalizeEntityId(group?.id || group?.['@id']);

      if (!groupId) {
        return;
      }

      mappedGroups[groupId] = {
        ...group,
        ...(orderProductGroupsById[groupId] || {}),
      };
    });

    Object.entries(orderProductGroupsById).forEach(([groupId, group]) => {
      if (!mappedGroups[groupId]) {
        mappedGroups[groupId] = group;
      }
    });

    return Object.values(mappedGroups).sort((leftGroup, rightGroup) => {
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
  }, [fetchedProductGroups, orderProductGroupsById]);

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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!activeProductId) {
        setFetchedProductGroups([]);
        setIsLoadingProductGroups(false);
        return undefined;
      }

      setFetchedProductGroups([]);
      setIsLoadingProductGroups(true);

      productGroupActionsRef.current
        .getItems({
          product: activeProductId,
          'product.productType': 'component',
        })
        .then(items => {
          if (!isActive) {
            return;
          }

          setFetchedProductGroups(Array.isArray(items) ? items : []);
          setIsLoadingProductGroups(false);
        })
        .catch(() => {
          if (isActive) {
            setFetchedProductGroups([]);
            setIsLoadingProductGroups(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [activeProductId]),
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
    setSelectedItems({});
  }, [activeOrderProductId, activeProductId]);

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
      const cacheKey = `${activeProductId || 'none'}:${id}`;
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
      loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`] = 'loading';
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
          loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`] = 'loaded';
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
          delete loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`];
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
        const cacheKey = `${activeProductId || 'none'}:${id}`;
        if (loadedGroupProductsRef.current[cacheKey] === 'loading') {
          delete loadedGroupProductsRef.current[cacheKey];
        }
      });
    };
  }, [activeProductId, resolvedProductGroupIdsKey, resolvedProductGroups]);

  useEffect(() => {
    if (!Array.isArray(resolvedProductGroups) || resolvedProductGroups.length === 0) {
      setSelectedItems({});
      return;
    }

    const nextSelectedItems = Object.fromEntries(
      resolvedProductGroups.map(group => {
        const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
        const existingSelections = existingSelectionsByGroup[groupId] || {};
        const groupProducts = Array.isArray(groupProductsByGroup[groupId])
          ? groupProductsByGroup[groupId]
          : [];

        return [
          groupId,
          groupProducts.map(item => ({
            ...item,
            selected: !!existingSelections[
              normalizeEntityId(
                item?.productChild?.id || item?.productChild?.['@id'],
              )
            ]?.selected,
            quantity:
              existingSelections[
                normalizeEntityId(
                  item?.productChild?.id || item?.productChild?.['@id'],
                )
              ]?.quantity ||
              parseFloat(String(item?.quantity || 1).replace(',', '.')) ||
              1,
          })),
        ];
      }),
    );

    setSelectedItems(nextSelectedItems);
  }, [
    existingSelectionsByGroup,
    groupProductsByGroup,
    resolvedProductGroupIdsKey,
    resolvedProductGroups,
  ]);

  const groupSummaries = useMemo(
    () =>
      resolvedProductGroups.map(group => {
        const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
        const groupItems = Array.isArray(selectedItems[groupId])
          ? selectedItems[groupId]
          : [];
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
      }),
    [resolvedProductGroups, selectedItems],
  );

  const groupSummariesById = useMemo(
    () => Object.fromEntries(groupSummaries.map(summary => [summary.groupId, summary])),
    [groupSummaries],
  );

  const invalidGroupSummaries = useMemo(
    () => groupSummaries.filter(summary => !summary.isValid),
    [groupSummaries],
  );

  const canSubmitCustomization =
    !!activeProductIri &&
    (isPdvCustomizationFlow || !!activeOrderIri) &&
    !isLoadingProductGroups &&
    invalidGroupSummaries.length === 0;
  const productCoverUrl = useMemo(
    () => buildCoverUrl(activeProduct),
    [activeProduct],
  );
  const selectedGroupsCount = groupSummaries.filter(
    summary => summary.selectedCount > 0,
  ).length;
  const selectedOptionsCount = groupSummaries.reduce(
    (sum, summary) => sum + (summary.selectedCount || 0),
    0,
  );
  const complementsTotal = groupSummaries.reduce(
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

  const getProcessedOptions = group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    let options = getProductOptions(group);
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

      if (isSelected(groupId, option.value)) {
        dedupedOptions[existingIndex] = option;
      }
    });

    options = dedupedOptions;
    const selectedCount = groupSummariesById[groupId]?.selectedCount || 0;
    const maximum = resolveEffectiveGroupMaximum(group);
    const isMaxReached = maximum !== null && selectedCount >= maximum;

    if (isMaxReached) {
      options = options.filter(option => isSelected(groupId, option.value));
    }

    const now = timeNow();
    return options.map(option => ({
      ...option,
      disable:
        isMaxSelected(group, option.value) ||
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
      const selectedIds = Object.values(selectedItems)
        .flat()
        .filter(item => item.selected)
        .map(item => String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(/\D/g, ''))
        .filter(Boolean);
      if (incompatibleIds.some(id => selectedIds.includes(id))) return true;
    }

    // Substitution rule: if substituteFor is set and target is already selected, block this option
    const substituteFor = String(extra.substituteFor || '').replace(/\D/g, '');
    if (substituteFor) {
      const targetSelected = Object.values(selectedItems)
        .flat()
        .filter(item => item.selected)
        .some(item => {
          const id = String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(/\D/g, '');
          return id === substituteFor;
        });
      if (targetSelected) return true;
    }

    return false;
  };

  const getProductOptions = group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const groupItems = selectedItems[groupId] || [];
    if (!Array.isArray(groupItems)) {
      return [];
    }
    return groupItems.map(product => ({
      label: product.productChild?.product,
      value: product,
    }));
  };

  const isSelected = (groupId, value) => {
    const normalizedGroupId = String(groupId || '');
    return (
      selectedItems[normalizedGroupId]?.some(
        item => item['@id'] === value['@id'] && item.selected,
      ) || false
    );
  };

  const isMaxSelected = (group, product) => {
    const maximum = resolveEffectiveGroupMaximum(group);
    if (maximum === null) {
      return false;
    }
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const selectedGroup = selectedItems[groupId] || [];
    return (
      selectedGroup.filter(item => item.selected).length >= maximum &&
      !selectedGroup.some(p => p['@id'] === product['@id'] && p.selected)
    );
  };

  const handleToggleOption = (groupId, option) => {
    const normalizedGroupId = String(groupId || '');
    setSelectedItems(prev => {
      const selectedGroup = Array.isArray(prev[normalizedGroupId])
        ? prev[normalizedGroupId]
        : [];
      const optionId = option?.value?.['@id'];
      const currentGroup = resolvedProductGroupsById[normalizedGroupId];
      const maximum = resolveEffectiveGroupMaximum(currentGroup);
      const selectedCount = selectedGroup.filter(item => item?.selected).length;
      const targetOption = selectedGroup.find(item => item['@id'] === optionId);
      const isCurrentlySelected = !!targetOption?.selected;

      if (!isCurrentlySelected && maximum !== null && selectedCount >= maximum) {
        return prev;
      }

      const updatedGroup = selectedGroup.map(item =>
        item['@id'] === optionId
          ? {...item, selected: !item.selected}
          : item,
      );

      return {
        ...prev,
        [normalizedGroupId]: updatedGroup,
      };
    });
  };

  const getSubproducts = () => {
    const subProducts = [];
    Object.entries(selectedItems).forEach(([groupId, groupItems]) => {
      groupItems.forEach(item => {
        if (item.selected) {
          const selectedQuantity = resolvePositiveQuantity(item.quantity || 1);
          subProducts.push({
            product: item.productChild['@id'].replace(/\D/g, ''),
            productGroup: parseInt(groupId),
            quantity: Number((selectedQuantity * resolvedItemQuantity).toFixed(2)),
          });
        }
      });
    });
    return subProducts;
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
      } else {
        await orderProductsActions.save(orderProductData);
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

    return (
      <TouchableOpacity
        key={`${group.id}-${index}`}
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
            Resumo do item
          </Text>
          <Text style={customizeSummaryKickerStyle({palette})}>
            {selectedOptionsLabel}
          </Text>
        </View>
        <Text style={customizeSummaryKickerStyle({palette})}>total</Text>
      </View>
      <Text style={customizeSummaryTotalStyle({palette})}>
        {Formatter.formatMoney(itemTotal, 'R$', 'pt-br')}
      </Text>
      <View style={customizeSummaryLineStyle({palette})}>
        <Text style={customizeSummaryLabelStyle({palette})}>Preco base</Text>
        <Text style={customizeSummaryValueStyle({palette})}>
          {Formatter.formatMoney(basePrice, 'R$', 'pt-br')}
        </Text>
      </View>
      <View style={customizeSummaryLineStyle({palette})}>
        <Text style={customizeSummaryLabelStyle({palette})}>Complementos</Text>
        <Text style={customizeSummaryValueStyle({palette})}>
          {Formatter.formatMoney(complementsTotal, 'R$', 'pt-br')}
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
      {!isSingleItemCustomizationFlow ? (
        <View style={customizeQuantityRowStyle}>
          <Text style={customizeSummaryLabelStyle({palette})}>Quantidade</Text>
          <View style={customizeQuantityStepperStyle}>
            <TouchableOpacity
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

  const renderSubmitButton = () => {
    const disabled = isSavingCustomization || !canSubmitCustomization;

    return (
      <TouchableOpacity
        onPress={addHandle}
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
          {submitLabel}
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
                    Personalizacao
                  </Text>
                  <View style={customizeTitleRowStyle}>
                    <Text
                      style={customizeTitleStyle({palette, isLargeScreen})}
                      numberOfLines={3}>
                      {activeProduct?.product || 'Produto'}
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
                  {activeProduct?.description ? (
                    <Text
                      style={customizeDescriptionStyle({
                        palette,
                        isLargeScreen,
                      })}
                      numberOfLines={3}>
                      {activeProduct.description}
                    </Text>
                  ) : null}
                  <View style={customizeChipRowStyle}>
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
                  product: activeProduct,
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
                {renderSubmitButton()}
              </View>
            </View>
          ) : (
            <View style={customizeFooterFloatingStyle({palette})}>
              {renderSubmitButton()}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default CustomizeScreen;
