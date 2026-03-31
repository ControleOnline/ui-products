import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions, View, Text, Image, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import ProductForm from '@controleonline/ui-products/src/react/components/ProductForm';
import ProductGroups from '@controleonline/ui-products/src/react/components/ProductGroups';
import ProductStockForm from '@controleonline/ui-products/src/react/components/ProductStockForm';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { env } from '@env';

const Tab = createMaterialTopTabNavigator();

const buildCoverUrl = (files, coverRelationId) => {
  const arr = files || [];
  let first = null;
  if (coverRelationId) {
    first = arr.find(item => String(item?.id) === String(coverRelationId) && item?.file?.id);
  }
  if (!first) first = arr.find(item => item?.file?.id);
  if (!first) return null;
  if (first?.file?.url) return first.file.url;
  const host = env.DOMAIN || (typeof location !== 'undefined' ? location.host : '');
  return `${env.API_ENTRYPOINT}/files/${first.file.id}/download?app-domain=${encodeURIComponent(host)}`;
};

const ProductDetails = ({ route, navigation }) => {
  const { ProductId, context } = route.params || {};
  const { width } = useWindowDimensions();
  const productsStore = useStore('products');
  const [productSummary, setProductSummary] = useState(null);

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
      return;
    }
    try {
      const data = await productsStore?.actions?.get(ProductId);
      if (data) setProductSummary(data);
    } catch (e) {
      // Mantem tela utilizavel mesmo se o resumo falhar.
      setProductSummary(null);
    }
  }, [ProductId, productsStore?.actions]);

  const contextTypes = [];

  useFocusEffect(
    useCallback(() => {
      if (context == 'products') {
        contextTypes.push('product')
        contextTypes.push('manufactured')
        contextTypes.push('custom')
        contextTypes.push('service')
      }

      if (context == 'supplies') {
        contextTypes.push('package')
        contextTypes.push('component')
        contextTypes.push('feedstock')
      }
    }
    ))

  useEffect(() => {
    loadProductSummary();
  }, [loadProductSummary]);

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
            {props => <ProductForm {...props} ProductId={ProductId} contextTypes={contextTypes} />}
          </Tab.Screen>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  summaryWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryContentCreate: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  tabsContainer: {
    flex: 1,
  },
});

export default ProductDetails;
