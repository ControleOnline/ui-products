import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions, View, Text, Image } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl';
import ProductForm from '@controleonline/ui-products/src/react/components/ProductForm';
import ProductGroups from '@controleonline/ui-products/src/react/components/ProductGroups';
import ProductStockForm from '@controleonline/ui-products/src/react/components/ProductStockForm';
import ProductSuppliersTab from '@controleonline/ui-products/src/react/components/ProductSuppliersTab';
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

const normalizeEntityId = value => {
  if (!value && value !== 0) return '';
  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;
  return String(raw || '').replace(/\D+/g, '').trim();
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
  const [productSummary, setProductSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(Boolean(ProductId));

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

  useEffect(() => {
    loadProductSummary();
  }, [loadProductSummary]);

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
            {props => (
              <ProductForm
                {...props}
                ProductId={ProductId}
                contextTypes={contextTypes}
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
    </View>
  );
};

export default ProductDetails;
