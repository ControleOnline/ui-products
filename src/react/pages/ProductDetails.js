import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions, View, Text, Image, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl';
import ProductForm from '@controleonline/ui-products/src/react/components/ProductForm';
import ProductFeedStock from '@controleonline/ui-products/src/react/components/ProductFeedStock';
import ProductGroups from '@controleonline/ui-products/src/react/components/ProductGroups';
import ProductPricingModal from '@controleonline/ui-products/src/react/components/ProductPricingModal';
import ProductStockForm from '@controleonline/ui-products/src/react/components/ProductStockForm';
import ProductSuppliersTab from '@controleonline/ui-products/src/react/components/ProductSuppliersTab';
import {
  buildProductCostBreakdown,
  emptyPricingBreakdown,
  formatCurrency,
  normalizeEntityId,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import { PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './ProductDetails.styles';

const Tab = createMaterialTopTabNavigator();

const buildCoverUrl = (files, coverRelationId) => {
  const arr = files || [];
  let first = null;
  if (coverRelationId) {
    first = arr.find(item => String(item?.id) === String(coverRelationId) && item?.file?.id);
  }
  if (!first) first = arr.find(item => item?.file?.id);
  if (!first) return null;
  return resolveFileImageUrl(first.file);
};

const inferProductContext = product => {
  const type = String(product?.type || '').toLowerCase();
  return ['package', 'component', 'feedstock'].includes(type) ? 'supplies' : 'products';
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
    () => buildCoverUrl(productSummary?.productFiles, productSummary?.extraData?.imageCoverRelationId),
    [productSummary?.productFiles, productSummary?.extraData?.imageCoverRelationId],
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

  const context = routeParams.context || (productSummary ? inferProductContext(productSummary) : 'products');
  const contextTypes = useMemo(() => {
    if (context === 'products') {
      return ['product', 'manufactured', 'custom', 'service'];
    }

    if (context === 'supplies') {
      return ['package', 'component', 'feedstock'];
    }

    return [];
  }, [context]);
  const productType = String(productSummary?.type || '').toLowerCase();
  const canHaveFeedstocks = Boolean(ProductId && productSummary && productType !== 'feedstock');

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

    window.addEventListener(PRODUCT_EVENTS.BOM_CHANGED, handleBomChanged);
    return () => {
      window.removeEventListener(PRODUCT_EVENTS.BOM_CHANGED, handleBomChanged);
    };
  }, [ProductId, loadCostSummary, loadProductSummary]);

  useEffect(() => {
    if (!routeParams.ProductId && routeParams.id && ProductId) {
      navigation.setParams({ ProductId, id: undefined });
    }
  }, [ProductId, navigation, routeParams.ProductId, routeParams.id]);

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
                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {productSummary?.product || 'Produto'}
                </Text>
                <Text style={styles.summaryDescription} numberOfLines={2}>
                  {productSummary?.description || 'Sem descrição informada.'}
                </Text>
                <View style={styles.summaryMetricsRow}>
                  <View style={styles.summaryMetricCard}>
                    <Text style={styles.summaryMetricLabel}>Venda</Text>
                    <Text style={styles.summaryMetricValue}>{formatCurrency(productSummary?.price)}</Text>
                  </View>
                  <View style={styles.summaryMetricCard}>
                    <View style={styles.summaryMetricHeader}>
                      <Text style={styles.summaryMetricLabel}>Custo</Text>
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
              <Text style={styles.summaryTitle}>Adicionar Produto</Text>
              <Text style={styles.summaryDescription} numberOfLines={2}>
                Preencha as abas abaixo para cadastrar um novo produto.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <Tab.Navigator
          initialLayout={{ width }}
          screenOptions={{
            tabBarScrollEnabled: canHaveFeedstocks,
            tabBarActiveTintColor: brandColors.primary,
            tabBarIndicatorStyle: { backgroundColor: brandColors.primary, height: 3 },
            tabBarLabelStyle: { fontWeight: '600', fontSize: 12, textTransform: 'none' },
            tabBarItemStyle: canHaveFeedstocks ? { width: 'auto', minWidth: 96 } : undefined,
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
                contextTypes={contextTypes}
                onSaved={() => {
                  loadProductSummary();
                  loadCostSummary();
                }}
                onSavedProductId={newProductId => {
                  const normalizedProductId = normalizeEntityId(newProductId);
                  if (normalizedProductId) {
                    navigation.setParams({ ProductId: normalizedProductId, context });
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
