import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions, View, Text, Image, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import ProductForm from '@controleonline/ui-products/src/react/components/ProductForm';
import ProductFeedStock from '@controleonline/ui-products/src/react/components/ProductFeedStock';
import ProductGroups from '@controleonline/ui-products/src/react/components/ProductGroups';
import ProductPricingModal from '@controleonline/ui-products/src/react/components/ProductPricingModal';
import ProductSalesTab from '@controleonline/ui-products/src/react/components/ProductSalesTab';
import ProductStockForm from '@controleonline/ui-products/src/react/components/ProductStockForm';
import ProductSuppliersTab from '@controleonline/ui-products/src/react/components/ProductSuppliersTab';
import ProductReferenceLink from '@controleonline/ui-products/src/react/components/ProductReferenceLink';
import {
  buildProductCostBreakdown,
  emptyPricingBreakdown,
  formatCurrency,
  normalizeEntityId,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import { buildProductDetailsBrowserPath } from '@controleonline/ui-products/src/react/domain/productDetailsUrl';
import { resolveProductCoverUrl } from '@controleonline/ui-products/src/react/domain/productMedia';
import { PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './ProductDetails.styles';

const Tab = createMaterialTopTabNavigator();

const inferProductContext = product => {
  const type = String(product?.type || '').toLowerCase();
  return ['package', 'component', 'feedstock'].includes(type) ? 'supplies' : 'products';
};

const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';

const SUPPLY_TYPE_LABELS = {
  feedstock: 'Matéria-prima',
  component: 'Componente operacional',
  package: 'Embalagem',
};

const getSupplyTypeLabel = value => SUPPLY_TYPE_LABELS[value] || 'Insumo';

const buildEntityLabels = (context, typeValue) => context === 'supplies'
  ? {
      singular: 'Insumo',
      editTitle: `Editar ${getSupplyTypeLabel(typeValue)}`,
      createTitle: `Adicionar ${getSupplyTypeLabel(typeValue)}`,
      emptyDescription: 'Sem descrição informada.',
      createDescription: 'Preencha as abas abaixo para cadastrar um novo insumo.',
      saleMetric: 'Preço cad.',
      costMetric: 'Custo ficha',
    }
  : {
      singular: 'Produto',
      editTitle: 'Editar Produto',
      createTitle: 'Adicionar Produto',
      emptyDescription: 'Sem descrição informada.',
      createDescription: 'Preencha as abas abaixo para cadastrar um novo produto.',
      saleMetric: 'Venda',
      costMetric: 'Custo',
    };

const ProductDetails = ({ route, navigation }) => {
  const routeParams = route.params || {};
  const ProductId = normalizeEntityId(routeParams.ProductId || routeParams.id);
  const { width } = useWindowDimensions();
  const productsStore = useStore('products');
  const productGroupProductStore = useStore('product_group_product');
  const [productSummary, setProductSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(Boolean(ProductId));
  const [costPrice, setCostPrice] = useState(0);
  const [isLoadingCost, setIsLoadingCost] = useState(Boolean(ProductId));
  const [pricingBreakdown, setPricingBreakdown] = useState({
    ...emptyPricingBreakdown,
  });
  const [pricingModalVisible, setPricingModalVisible] = useState(false);

  const themeStore = useStore('theme');
  const brandColors = useMemo(
    () => resolveThemePalette(themeStore?.getters?.theme),
    [themeStore?.getters?.theme],
  );
  const coverUrl = useMemo(
    () => resolveProductCoverUrl(productSummary),
    [productSummary],
  );

  const loadProductSummary = useCallback(async () => {
    if (!ProductId) {
      setProductSummary(null);
      setIsLoadingSummary(false);
      return;
    }

    setIsLoadingSummary(true);
    try {
      const data = await productsStore?.actions?.get(ProductId);
      setProductSummary(data || null);
    } catch {
      // Mantem tela utilizavel mesmo se o resumo falhar.
      setProductSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [ProductId, productsStore?.actions]);

  const loadCostSummary = useCallback(async () => {
    if (!ProductId) {
      setCostPrice(0);
      setPricingBreakdown(emptyPricingBreakdown);
      setIsLoadingCost(false);
      return;
    }

    setIsLoadingCost(true);
    try {
      const nextBreakdown = await buildProductCostBreakdown({
        productId: ProductId,
        productGroupProductStore,
      });

      setPricingBreakdown(nextBreakdown);
      setCostPrice(nextBreakdown.totalCost || 0);
    } catch {
      setCostPrice(0);
      setPricingBreakdown(emptyPricingBreakdown);
    } finally {
      setIsLoadingCost(false);
    }
  }, [ProductId, productGroupProductStore?.actions]);

  const inferredContext = productSummary ? inferProductContext(productSummary) : null;
  const context = normalizeCatalogContext(routeParams.context || inferredContext || 'products');
  const contextTypes = useMemo(() => {
    if (context === 'products') {
      return ['product', 'manufactured', 'custom', 'service', 'recipe'];
    }

    if (context === 'supplies') {
      return ['package', 'component', 'feedstock'];
    }

    return [];
  }, [context]);
  const productType = String(productSummary?.type || '').toLowerCase();
  const requestedProductType = String(routeParams.initialProductType || routeParams.typeFilter || productType || '').toLowerCase();
  const effectiveSupplyType = context === 'supplies'
    ? (requestedProductType || productType || 'feedstock')
    : '';
  const entityLabels = useMemo(
    () => buildEntityLabels(context, effectiveSupplyType),
    [context, effectiveSupplyType],
  );
  const typeLabel = context === 'supplies'
    ? getSupplyTypeLabel(effectiveSupplyType)
    : entityLabels.singular;
  const canHaveFeedstocks = Boolean(ProductId && productSummary && productType !== 'feedstock');

  const normalizeProductDetailsBrowserUrl = useCallback(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    if (!url.pathname.includes('/product-details')) return;

    let changed = false;
    const canonicalPathname = buildProductDetailsBrowserPath({
      pathname: url.pathname,
      routeName: route?.name,
      productId: ProductId,
    });

    if (canonicalPathname !== url.pathname) {
      url.pathname = canonicalPathname;
      changed = true;
    }

    const ensureParam = (key, value) => {
      if (!value) return;
      if (url.searchParams.get(key) === value) return;
      url.searchParams.set(key, value);
      changed = true;
    };

    if (context === 'supplies') {
      ensureParam('context', 'supplies');
      ensureParam('typeFilter', effectiveSupplyType);
      if (!ProductId) {
        ensureParam('initialProductType', effectiveSupplyType);
      }
    }

    if (changed) {
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, [context, effectiveSupplyType, ProductId, route?.name]);

  const scheduleNormalizeProductDetailsBrowserUrl = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(normalizeProductDetailsBrowserUrl);
      return;
    }

    setTimeout(normalizeProductDetailsBrowserUrl, 0);
  }, [normalizeProductDetailsBrowserUrl]);

  useEffect(() => {
    loadProductSummary();
  }, [loadProductSummary]);

  useEffect(() => {
    loadCostSummary();
  }, [loadCostSummary]);

  useEffect(() => {
    if (typeof window === 'undefined' || !ProductId) return undefined;

    const handleBomChanged = event => {
      const changedProductId = normalizeEntityId(
        event?.detail?.parentProductId || event?.detail?.productId,
      );
      if (changedProductId && changedProductId !== String(ProductId)) return;
      loadProductSummary();
      loadCostSummary();
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener(PRODUCT_EVENTS.BOM_CHANGED, handleBomChanged);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener(PRODUCT_EVENTS.BOM_CHANGED, handleBomChanged);
      }
    };
  }, [ProductId, loadCostSummary, loadProductSummary]);

  useEffect(() => {
    if (!routeParams.ProductId && routeParams.id && ProductId) {
      navigation.setParams({ ProductId, id: undefined });
    }
  }, [ProductId, navigation, routeParams.ProductId, routeParams.id]);

  useEffect(() => {
    scheduleNormalizeProductDetailsBrowserUrl();
  }, [scheduleNormalizeProductDetailsBrowserUrl]);

  useEffect(() => {
    navigation.setOptions?.({
      title: ProductId ? entityLabels.editTitle : entityLabels.createTitle,
    });
  }, [ProductId, entityLabels.createTitle, entityLabels.editTitle, navigation]);

  const shouldScrollTabs = canHaveFeedstocks || (context === 'products' && Boolean(ProductId));

  return (
    <View style={styles.container}>
      <View style={styles.summaryWrap}>
        <View style={[styles.summaryCard, { borderColor: '#DCEAF4' }]}>
          {ProductId ? (
            <>
              <View style={[styles.avatarWrap, { borderColor: `${brandColors.primary}33` }]}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name="package-variant-closed" size={24} color={brandColors.primary} />
                )}
              </View>
              <View style={styles.summaryContent}>
                <ProductReferenceLink product={productSummary} context={context} />
                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {productSummary?.product || entityLabels.singular}
                </Text>
                <Text style={styles.summaryDescription} numberOfLines={2}>
                  {productSummary?.description || entityLabels.emptyDescription}
                </Text>
                <View style={styles.summaryMetricsRow}>
                  <View style={styles.summaryMetricCard}>
                    <Text style={styles.summaryMetricLabel}>{entityLabels.saleMetric}</Text>
                    <Text style={styles.summaryMetricValue}>{formatCurrency(productSummary?.price)}</Text>
                  </View>
                  <View style={styles.summaryMetricCard}>
                    <View style={styles.summaryMetricHeader}>
                      <Text style={styles.summaryMetricLabel}>{entityLabels.costMetric}</Text>
                      <TouchableOpacity
                        style={styles.summaryMetricAction}
                        onPress={() => setPricingModalVisible(true)}
                        activeOpacity={0.75}
                      >
                        <MaterialCommunityIcons name="calculator-variant-outline" size={14} color={brandColors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.summaryMetricValue}>
                      {isLoadingCost ? 'Calculando...' : formatCurrency(costPrice)}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.summaryContentCreate}>
              <Text style={styles.summaryTitle}>{entityLabels.createTitle}</Text>
              <Text style={styles.summaryDescription} numberOfLines={2}>
                {entityLabels.createDescription} Tipo inicial: {typeLabel}.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <Tab.Navigator
          initialLayout={{ width }}
          screenListeners={
            {
              focus: scheduleNormalizeProductDetailsBrowserUrl,
              state: scheduleNormalizeProductDetailsBrowserUrl,
              tabPress: scheduleNormalizeProductDetailsBrowserUrl,
            }
          }
          screenOptions={{
            tabBarScrollEnabled: shouldScrollTabs,
            tabBarActiveTintColor: brandColors.primary,
            tabBarIndicatorStyle: { backgroundColor: brandColors.primary, height: 3 },
            tabBarLabelStyle: { fontWeight: '600', fontSize: 12, textTransform: 'none' },
            tabBarItemStyle: shouldScrollTabs ? { width: 'auto', minWidth: 96 } : undefined,
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
            {props => (
              <ProductForm
                {...props}
                ProductId={ProductId}
                catalogContext={context}
                contextTypes={contextTypes}
                initialProductType={requestedProductType}
                onSaved={() => {
                  loadProductSummary();
                  loadCostSummary();
                }}
                onSavedProductId={newProductId => {
                  const normalizedProductId = normalizeEntityId(newProductId);
                  if (normalizedProductId) {
                    navigation.setParams({
                      ProductId: normalizedProductId,
                      context,
                      typeFilter: effectiveSupplyType,
                      initialProductType: effectiveSupplyType,
                    });
                  }
                }}
              />
            )}
          </Tab.Screen>

          {ProductId ? (
            <Tab.Screen name="Fornecedores">
              {props => (
                <ProductSuppliersTab
                  {...props}
                  product={productSummary}
                  isLoading={isLoadingSummary}
                  onRefresh={loadProductSummary}
                />
              )}
            </Tab.Screen>
          ) : null}

          {ProductId && context === 'products' ? (
            <Tab.Screen name="Vendas">
              {props => (
                <ProductSalesTab
                  {...props}
                  product={productSummary}
                  isLoading={isLoadingSummary}
                  brandColors={brandColors}
                />
              )}
            </Tab.Screen>
          ) : null}

          {canHaveFeedstocks ? (
            <Tab.Screen name="Insumos">
              {() => (
                <View style={styles.feedstockTabContent}>
                  <View style={styles.feedstockCard}>
                    <ProductFeedStock
                      productIri={`/products/${ProductId}`}
                      parentProductId={ProductId}
                      brandColors={brandColors}
                      targetLabel="este produto"
                    />
                  </View>
                </View>
              )}
            </Tab.Screen>
          ) : null}

          {(productSummary?.type == 'custom' || productSummary?.type == 'manufactured' || productSummary?.type == 'service') &&
            <Tab.Screen name="Grupos">
              {props => <ProductGroups {...props} ProductId={ProductId} />}
            </Tab.Screen>
          }

          <Tab.Screen name="Estoque">
            {props => (
              <ProductStockForm
                {...props}
                ProductId={ProductId}
                rootNavigation={navigation}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
      <ProductPricingModal
        visible={pricingModalVisible}
        onClose={() => setPricingModalVisible(false)}
        navigation={navigation}
        pricingBreakdown={pricingBreakdown}
      />
    </View>
  );
};

export default ProductDetails;
