// CustomizeScreen.js
// Line count: 2064 → ~480 lines after modularization (QA line-limit fix for app-community#302)
// Extracted modules:
//   - customizeScreenHelpers.js  (pure helpers, ~230 lines)
//   - useCustomizeScreenIds.js   (ID resolution hook, ~100 lines)
//   - useCustomizeScreenData.js  (data loading + selection state hook, ~490 lines)
//   - OptionRow.js               (option row subcomponent, ~200 lines)
//   - GroupCard.js               (group card subcomponent, ~90 lines)
//   - SummaryPanel.js            (summary panel subcomponent, ~160 lines)

import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
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
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import {app_type} from '@appType';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {isPosSingleItemMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  customizeBackdropPressableStyle,
  customizeChipRowStyle,
  customizeChipStyle,
  customizeChipTextStyle,
  customizeCloseButtonStyle,
  customizeDescriptionStyle,
  customizeEyebrowStyle,
  customizeFooterFloatingStyle,
  customizeFooterStyle,
  customizeGroupsStackStyle,
  customizeHeaderContentStyle,
  customizeHeaderStyle,
  customizeHeroImageStyle,
  customizeHeroImageWrapStyle,
  customizeHeroPlaceholderStyle,
  customizeHeroPlaceholderTextStyle,
  customizeMainColumnStyle,
  customizeModalStyle,
  customizeMobileSummaryWrapStyle,
  customizeScreenBackdropStyle,
  customizeScreenRootStyle,
  customizeScrollContentStyle,
  customizeScrollStyle,
  customizeSubmitButtonStyle,
  customizeSubmitButtonTextStyle,
  customizeSummaryColumnStyle,
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
import NestedCustomizationModal from '../components/NestedCustomizationModal';
import {serializeCustomizationTree} from '../domain/customizationTree';
import {
  buildCoverUrl,
  normalizeEntityId,
  parseNumericValue,
  resolvePositiveQuantity,
  resolveProductInitial,
} from './customizeScreenHelpers';
import useCustomizeScreenIds from './useCustomizeScreenIds';
import useCustomizeScreenData from './useCustomizeScreenData';
import GroupCard from './GroupCard';
import SummaryPanel from './SummaryPanel';

const CustomizeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {width, height} = useWindowDimensions();
  const viewportWidth = Number.isFinite(width) && width > 0 ? width
    : typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportHeight = Number.isFinite(height) && height > 0 ? height
    : typeof window !== 'undefined' ? window.innerHeight : 768;
  const isLargeScreen = viewportWidth >= 960;
  const requestedPresentation = route.params?.presentation || null;
  const isBottomSheet = requestedPresentation === 'bottomSheet' && !isLargeScreen;
  const bottomSheetHeight = Math.min(
    Math.max(360, viewportHeight - 20),
    Math.max(420, Math.round(viewportHeight * 0.9)),
  );
  const modalHeight = isLargeScreen
    ? Math.max(640, Math.min(viewportHeight - 64, 900))
    : isBottomSheet ? bottomSheetHeight : viewportHeight;
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
  const isPdvCustomizationFlow = String(interactionMode || '').trim().toLowerCase() === 'pdv';

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
  const storedOrderProducts = Array.isArray(orderProductsGetters?.items) ? orderProductsGetters.items : [];
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
  const orderProductsActionsRef = useRef(orderProductsActions);
  const productsActionsRef = useRef(productsActions);
  const quantityTouchedRef = useRef(false);

  useEffect(() => { orderProductsActionsRef.current = orderProductsActions; }, [orderProductsActions]);
  useEffect(() => { productsActionsRef.current = productsActions; }, [productsActions]);

  const {
    activeOrderProductId, activeOrderProduct, activeProductId, activeProduct,
    activeResolvedProductId, activeOrderProductQuantity, activeProductIri,
    activeOrderId, activeOrderIri,
  } = useCustomizeScreenIds({
    routeProduct, routeProductId, routeOrderProduct, routeOrderProductId,
    routeParamsId: route.params?.id,
    storedOrderProductItem: orderProductsGetters?.item,
    storedOrderProducts,
    productsGettersItem: productsGetters?.item,
    order,
    cart,
  });

  const isEditingExistingOrderProduct = !!activeOrderProductId;
  const [itemQuantity, setItemQuantity] = useState(() => activeOrderProductQuantity);

  useEffect(() => {
    quantityTouchedRef.current = false;
    setItemQuantity(activeOrderProductQuantity);
  }, [activeOrderProductId, activeProductId]);

  useEffect(() => {
    if (!quantityTouchedRef.current) setItemQuantity(activeOrderProductQuantity);
  }, [activeOrderProductQuantity]);

  useFocusEffect(
    useCallback(() => {
      if (activeOrderProductId) {
        orderProductsActionsRef.current.get(activeOrderProductId).catch(() => null);
      }
      if (activeProductId && activeResolvedProductId !== activeProductId) {
        productsActionsRef.current.get(activeProductId).catch(() => null);
      }
    }, [activeOrderProductId, activeProductId, activeResolvedProductId]),
  );

  const {
    isLoadingProductGroups, selectedItems, optionProductsById,
    resolvedProductGroups, resolvedProductGroupsById,
    groupSummaries, groupSummariesById, invalidGroupSummaries,
    getProcessedOptions, updateNestedOption, inspectNestedOption, handleToggleOption,
    nestedEditor, setNestedEditor,
  } = useCustomizeScreenData({
    activeProductId, activeOrderProduct, activeOrderProductQuantity,
    activeOrderProductId, activeChannel,
    productGroupActions, productsActions, productGroupProductActions,
  });

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

  const productCoverUrl = useMemo(() => buildCoverUrl(activeProduct), [activeProduct]);
  const selectedGroupsCount = groupSummaries.filter(s => s.selectedCount > 0).length;
  const selectedOptionsCount = groupSummaries.reduce((sum, s) => sum + (s.selectedCount || 0), 0);
  const complementsTotal = groupSummaries.reduce((sum, s) => sum + parseNumericValue(s.extraPrice), 0);
  const basePrice = parseNumericValue(activeProduct?.price || activeOrderProduct?.price);
  // No single-item, a quantidade eh implicita e a tela nao mostra o stepper.
  const resolvedItemQuantity = isSingleItemCustomizationFlow ? 1 : resolvePositiveQuantity(itemQuantity);
  const itemTotal = (basePrice + complementsTotal) * resolvedItemQuantity;
  const submitLabel = isSavingCustomization ? 'SALVANDO...' : isEditingExistingOrderProduct ? 'MODIFICAR' : 'ADICIONAR';
  const selectedOptionsLabel =
    selectedOptionsCount === 1 ? '1 selecao feita' : `${selectedOptionsCount} selecoes feitas`;

  const refreshSavedOrderProducts = useCallback(async () => {
    if (!activeOrderId) return [];
    const refreshedOrderProducts = await orderProductsActions.getItems({'order.id': Number(activeOrderId)});
    if (typeof ordersActions.syncOrderProducts === 'function') {
      ordersActions.syncOrderProducts({orderId: Number(activeOrderId), orderProducts: refreshedOrderProducts});
    } else if (order && normalizeEntityId(order?.id || order?.['@id']) === activeOrderId) {
      ordersActions.setItem(mergeOrderWithOrderProducts(order, refreshedOrderProducts));
    }
    if (cart && typeof cartActions?.setItem === 'function' &&
        normalizeEntityId(cart?.id || cart?.['@id']) === activeOrderId) {
      cartActions.setItem(mergeOrderWithOrderProducts(cart, refreshedOrderProducts));
    }
    return refreshedOrderProducts;
  }, [activeOrderId, cart, cartActions, order, orderProductsActions, ordersActions]);

  const closeCustomizeScreen = useCallback(() => {
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) { navigation.goBack(); return; }
    navigation.navigate('ShopIndex', {store: 'categories'});
  }, [navigation]);

  const finishCustomizeScreen = useCallback((nextOrderId = activeOrderId) => {
    if (redirectToCart) { navigation.navigate('ShopCartPage'); return; }
    if (isSingleItemCustomizationFlow && nextOrderId) {
      // No single-item, o customizado vai direto para o pagamento;
      navigation.replace('Checkout', buildCheckoutRouteParams(
        nextOrderId, buildManagerPdvRouteParams({showBottomCart: false}),
      ));
      return;
    }
    if (isPdvCustomizationFlow && nextOrderId) {
      navigation.replace('OrderDetails', buildOrderDetailsRouteParams(
        nextOrderId, buildManagerPdvRouteParams({showBottomCart: false}),
      ));
      return;
    }
    navigation.pop(Math.max(1, Number(returnDepth || 1)));
  }, [activeOrderId, isPdvCustomizationFlow, isSingleItemCustomizationFlow, navigation, redirectToCart, returnDepth]);

  const addHandle = async () => {
    const showAlert = message =>
      typeof window !== 'undefined' && typeof window.alert === 'function'
        ? window.alert(message) : Alert.alert('Atencao', message);

    if (!activeProductIri) { showAlert('Nao foi possivel identificar produto ou carrinho para adicionar.'); return; }
    if (invalidGroupSummaries.length > 0) {
      showAlert(invalidGroupSummaries.map(s => `${s.groupName}: ${s.validationMessage}`).join('\n'));
      return;
    }

    let targetOrderIri = activeOrderIri;
    let targetOrderId = activeOrderId;

    if (!targetOrderIri && isPdvCustomizationFlow) {
      try {
        const ensuredOrder = await ensureActiveOrder();
        const ensuredOrderId = normalizeEntityId(ensuredOrder?.id || ensuredOrder?.['@id']);
        targetOrderId = ensuredOrderId || targetOrderId;
        targetOrderIri = ensuredOrder?.['@id'] || (ensuredOrderId ? `/orders/${ensuredOrderId}` : null);
      } catch (error) {
        showAlert(error?.message || 'Nao foi possivel salvar a customizacao do item.'); return;
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
          provider: defaultCompany?.id, client: currentCompany?.id || defaultCompany?.id,
        });
        const ensuredCartId = normalizeEntityId(ensuredCart?.id || ensuredCart?.['@id']);
        targetOrderId = ensuredCartId || targetOrderId;
        targetOrderIri = ensuredCart?.['@id'] || (ensuredCartId ? `/orders/${ensuredCartId}` : null);
      } catch { targetOrderIri = null; }
    }

    if (!targetOrderIri) { showAlert('Nao foi possivel identificar produto ou carrinho para adicionar.'); return; }

    const orderProductData = {
      ...(activeOrderProductId ? {id: activeOrderProductId} : {}),
      product: activeProductIri,
      sub_products: serializeCustomizationTree(selectedItems, resolvedItemQuantity),
      order: targetOrderIri,
      quantity: resolvedItemQuantity,
    };

    try {
      if (isSingleItemCustomizationFlow) {
        // No single-item, a troca precisa substituir o pai e manter os filhos
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
      try { await refreshSavedOrderProducts(); } catch { /* parent screen refetches on focus */ }
      finishCustomizeScreen(targetOrderId);
    } catch (error) {
      showAlert(error?.message || 'Nao foi possivel salvar a customizacao do item.');
    }
  };

  const saveNestedCustomization = unitTree => {
    if (!nestedEditor) return;
    updateNestedOption(nestedEditor.groupId, nestedEditor.optionId, item => ({
      ...item, sub_products: unitTree, hasNestedGroups: true, nestedState: 'valid',
    }));
    setNestedEditor(null);
  };

  const renderProductImage = ({product, imageUrl, wrapperStyle, imageStyle}) => {
    if (imageUrl) {
      return <View style={wrapperStyle}><Image source={{uri: imageUrl}} style={imageStyle} resizeMode="cover" /></View>;
    }
    return (
      <View style={wrapperStyle}>
        <View style={customizeHeroPlaceholderStyle({palette})}>
          <Text style={customizeHeroPlaceholderTextStyle({palette})}>{resolveProductInitial(product)}</Text>
        </View>
      </View>
    );
  };

  const renderSubmitButton = () => {
    const disabled = isSavingCustomization || !canSubmitCustomization;
    return (
      <TouchableOpacity
        accessibilityLabel={`${submitLabel} ${activeProduct?.product || 'produto personalizado'}`}
        accessibilityRole="button"
        onPress={addHandle}
        disabled={disabled}
        style={customizeSubmitButtonStyle({palette, disabled})}
        activeOpacity={0.82}>
        <Text style={customizeSubmitButtonTextStyle({palette, disabled})}>{submitLabel}</Text>
      </TouchableOpacity>
    );
  };

  const summaryProps = {palette, groupSummaries, selectedOptionsLabel, itemTotal, basePrice,
    complementsTotal, resolvedItemQuantity, isSingleItemCustomizationFlow,
    activeProduct, quantityTouchedRef, setItemQuantity};

  return (
    <View
      style={[
        customizeScreenRootStyle({palette, isLargeScreen, isBottomSheet}),
        Platform.OS === 'web' && (isLargeScreen || isBottomSheet) ? {backdropFilter: 'blur(7px)'} : null,
      ]}>
      {isLargeScreen || isBottomSheet ? (
        <TouchableOpacity onPress={closeCustomizeScreen} style={customizeBackdropPressableStyle} activeOpacity={1} />
      ) : null}
      <View style={customizeScreenBackdropStyle({isLargeScreen, isBottomSheet, modalHeight, modalWidth})}>
        <View style={customizeModalStyle({palette, isLargeScreen, isBottomSheet, modalHeight, modalWidth})}>
          <View style={customizeMainColumnStyle({palette, isLargeScreen})}>
            <ScrollView style={customizeScrollStyle} contentContainerStyle={customizeScrollContentStyle({isLargeScreen})}>
              <View style={customizeHeaderStyle({isLargeScreen})}>
                <View style={customizeHeaderContentStyle}>
                  <Text style={customizeEyebrowStyle({palette})}>Personalizacao</Text>
                  <View style={customizeTitleRowStyle}>
                    <Text style={customizeTitleStyle({palette, isLargeScreen})} numberOfLines={3}>
                      {activeProduct?.product || 'Produto'}
                    </Text>
                    <TouchableOpacity onPress={closeCustomizeScreen} style={customizeCloseButtonStyle({palette})} activeOpacity={0.78}>
                      <MaterialCommunityIcons name="close" size={20} color={palette.muted} />
                    </TouchableOpacity>
                  </View>
                  {activeProduct?.description ? (
                    <Text style={customizeDescriptionStyle({palette, isLargeScreen})} numberOfLines={3}>
                      {activeProduct.description}
                    </Text>
                  ) : null}
                  <View style={customizeChipRowStyle}>
                    <View style={customizeChipStyle({palette})}>
                      <Text style={customizeChipTextStyle({palette})}>
                        {resolvedProductGroups.length} grupo{resolvedProductGroups.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={customizeChipStyle({palette})}>
                      <Text style={customizeChipTextStyle({palette})}>
                        {selectedGroupsCount} grupo{selectedGroupsCount === 1 ? '' : 's'} com selecao
                      </Text>
                    </View>
                  </View>
                </View>
                {renderProductImage({
                  product: activeProduct,
                  imageUrl: productCoverUrl,
                  wrapperStyle: customizeHeroImageWrapStyle({palette, isLargeScreen}),
                  imageStyle: customizeHeroImageStyle,
                })}
              </View>
              {!isLargeScreen ? (
                <View style={customizeMobileSummaryWrapStyle}><SummaryPanel {...summaryProps} compact /></View>
              ) : null}
              <View style={customizeGroupsStackStyle}>
                {resolvedProductGroups.map(group => (
                  <GroupCard
                    key={normalizeEntityId(group?.id || group?.['@id'])}
                    group={group}
                    summary={groupSummariesById[String(normalizeEntityId(group?.id || group?.['@id']))]}
                    processedOptions={getProcessedOptions(group)}
                    palette={palette}
                    selectedItems={selectedItems}
                    optionProductsById={optionProductsById}
                    onToggleOption={handleToggleOption}
                    onInspectNested={inspectNestedOption}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
          {isLargeScreen ? (
            <View style={customizeSummaryColumnStyle({palette, isLargeScreen})}>
              <SummaryPanel {...summaryProps} compact={false} />
              <View style={customizeFooterStyle({palette, isLargeScreen})}>{renderSubmitButton()}</View>
            </View>
          ) : (
            <View style={customizeFooterFloatingStyle({palette})}>{renderSubmitButton()}</View>
          )}
        </View>
      </View>
      {nestedEditor ? (
        <NestedCustomizationModal
          initialTree={
            (selectedItems[nestedEditor.groupId] || []).find(item => item?.['@id'] === nestedEditor.optionId)
              ?.sub_products || []
          }
          onCancel={() => setNestedEditor(null)}
          onSave={saveNestedCustomization}
          palette={palette}
          preloadedGroups={nestedEditor.groups}
          product={nestedEditor.product}
          productGroupActions={productGroupActions}
          productGroupProductActions={productGroupProductActions}
          visible
        />
      ) : null}
    </View>
  );
};

export default CustomizeScreen;
