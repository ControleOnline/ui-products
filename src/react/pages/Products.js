import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { NO_CATEGORY_SENTINEL } from './Categories';
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';

const TYPE_FILTER_OPTIONS = [
  { key: null,          label: 'Todos' },
  { key: 'product',     label: 'Produto' },
  { key: 'service',     label: 'Serviço' },
  { key: 'manufactured',label: 'Fabricado' },
  { key: 'component',   label: 'Componente' },
  { key: 'feedstock',   label: 'Matéria Prima' },
  { key: 'package',     label: 'Embalagem' },
  { key: 'custom',      label: 'Custom' },
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
)

const ProductsPage = ({ navigation, route }) => {
  const { category } = route.params;
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const actions = productsStore.actions;
  const isLoading = productsStore.isLoading;
  const storeLoading = productsStore.getters?.isLoading;
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

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(null);

  const isManager = env.APP_TYPE === 'MANAGER';

  // Filtra localmente sem nova requisição à API
  const visibleProducts = useMemo(() => {
    if (!typeFilter) return categoryProducts;
    return categoryProducts.filter(p => p.type === typeFilter);
  }, [categoryProducts, typeFilter]);

  // Tipos presentes na lista atual (para exibir só os filtros relevantes)
  const availableTypes = useMemo(() => {
    const set = new Set(categoryProducts.map(p => p.type).filter(Boolean));
    return TYPE_FILTER_OPTIONS.filter(opt => opt.key === null || set.has(opt.key));
  }, [categoryProducts]);

  /* detecta se a "categoria" selecionada é o sentinel de produtos sem categoria */
  const isNoCategory = category?._isNoCategory === true ||
    category?.['@id'] === '__no_category__';

  const changeCategoryProduct = (p, changeStorage = false) => {
    /* não persiste o cache para o sentinel "Sem Categoria" */
    if (isNoCategory) { setCategoryProducts(p); return; }

    const index = categories.findIndex(c => c['@id'] === category['@id']);
    if (index < 0) { setCategoryProducts(p); return; }

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
      // Manager vê todos os tipos; vitrine filtra só os tipos de venda ao cliente
      ...(isManager ? {} : { type: ['custom', 'product', 'manufactured', 'service'] }),
    };

    if (isNoCategory) {
      /*
       * Filtro "Sem Categoria": busca produtos sem nenhuma categoria vinculada.
       * Usa o ExistsFilter do API Platform: productCategory[exists]=false
       */
      if (!categoryProducts || categoryProducts.length === 0) {
        setLoading(true);
        actions
          .getItems({
            ...baseParams,
            'productCategory[exists]': false,
          })
          .then(data => {
            setCategoryProducts(data || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
      return;
    }

    /* fluxo normal com categoria real */
    if (
      categories &&
      categories.length > 0 &&
      category['@id'] &&
      (!categoryProducts || categoryProducts.length === 0)
    ) {
      const index = categories.findIndex(c => c['@id'] === category['@id']);

      if (
        index >= 0 &&
        categories[index]?.products?.length > 0
      ) {
        setCategoryProducts(categories[index]['products']);
        setLoading(false);
      } else {
        actions
          .getItems({
            ...baseParams,
            'productCategory.category': category['@id'],
          })
          .then(data => {
            if (data && Object.keys(data).length > 0)
              changeCategoryProduct(data, true);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      }
    } else if (categories && categories.length > 0) {
      setLoading(false);
    } else {
      /* categories ainda não carregadas — aguarda sem travar na tela */
      const timer = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [category, categories, categoryProducts, isNoCategory]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
        const cats = JSON.parse(localStorage.getItem('categories') || '[]');
        setCategoryProducts([]);
        setLoading(true);
        if (cats.length > 0) categoryActions.setItems(cats);
      };
    }, []),
  );

  const handleProductPress = product => {
    if (!isManager) return;
    navigation.navigate('ProductDetails', { ProductId: product.id, category });
  };

  const handleAddProduct = () => {
    if (!isManager) return;
    navigation.navigate('ProductDetails', { category });
  };

  const maxContentWidth = 860;
  const containerWidth = Math.min(width, maxContentWidth);

  return (
    <SafeAreaView style={styles.container}>
      {!loading && !storeLoading && <StateStore store="products" />}

      {/* Skeleton */}
      {loading && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, isManager && { paddingBottom: 84 }]}
        >
          <View style={{ width: containerWidth, paddingHorizontal: 16, paddingTop: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonProductCard key={i} />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Empty state */}
      {!loading && categoryProducts.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons
              name={isNoCategory ? 'tag-off-outline' : 'package-variant-closed'}
              size={48}
              color="#CBD5E1"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {isNoCategory ? 'Nenhum produto sem categoria' : 'Nenhum produto'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isNoCategory
              ? 'Todos os produtos já estão categorizados.'
              : isManager
                ? 'Adicione o primeiro produto a esta categoria'
                : 'Nenhum produto disponível nesta categoria'}
          </Text>
        </View>
      )}

      {/* Filtro por tipo — exibe sempre que há produtos carregados no manager */}
      {!loading && categoryProducts.length > 0 && isManager && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFilterBar}
          style={styles.typeFilterScroll}
        >
          {availableTypes.map(opt => {
            const active = typeFilter === opt.key;
            return (
              <TouchableOpacity
                key={String(opt.key)}
                style={[styles.typeFilterChip, active && styles.typeFilterChipActive]}
                onPress={() => setTypeFilter(opt.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.typeFilterChipText, active && styles.typeFilterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Product list */}
      {!loading && categoryProducts.length > 0 && !error && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, isManager && { paddingBottom: 84 }]}
        >
          <View style={{ width: containerWidth, paddingHorizontal: 16, paddingTop: 12 }}>
            <Text style={styles.countLabel}>
              {visibleProducts.length} {visibleProducts.length === 1 ? 'produto' : 'produtos'}
              {typeFilter ? ` · ${TYPE_FILTER_OPTIONS.find(o => o.key === typeFilter)?.label}` : ''}
            </Text>

            {visibleProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                activeOpacity={isManager ? 0.75 : 1}
                onPress={() => handleProductPress(product)}
                disabled={!isManager}
              >
                <ProductItem product={product} category={category} />
              </TouchableOpacity>
            ))}

            {visibleProducts.length === 0 && typeFilter && (
              <View style={styles.filterEmptyWrap}>
                <Text style={styles.filterEmptyText}>
                  Nenhum produto do tipo "{TYPE_FILTER_OPTIONS.find(o => o.key === typeFilter)?.label}" nesta categoria.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Add product bar (MANAGER only) */}
      {isManager && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBarButton, { backgroundColor: brandColors.primary }]}
            onPress={handleAddProduct}
            activeOpacity={0.85}
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
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  imageBlock: {
    width: 100,
    height: 100,
    backgroundColor: '#E2E8F0',
  },
  body: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  line: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },

  countLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  typeFilterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  typeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  typeFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  typeFilterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeFilterChipTextActive: {
    color: '#fff',
  },
  filterEmptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  filterEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 -2px 16px rgba(0,0,0,0.07)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  bottomBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomBarButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ProductsPage;
