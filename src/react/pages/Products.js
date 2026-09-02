import React, { useCallback, useMemo } from 'react';
import { Alert, SafeAreaView, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { app_type } from '@appType';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import { api } from '@controleonline/ui-common/src/api';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import ProductItem, {
  getProductTypeLabel,
} from '@controleonline/ui-products/src/react/components/products/ProductItem';
import useMarketplaceCatalogSync from '@controleonline/ui-products/src/react/hooks/useMarketplaceCatalogSync';
import { ALL_PRODUCTS_SENTINEL_ID } from '@controleonline/ui-products/src/react/constants/categorySentinels';
import { resolveRouteCategoryId } from '@controleonline/ui-products/src/react/utils/categorySelection';
import useProductAddQueue from '@controleonline/ui-products/src/react/hooks/useProductAddQueue';
import { styles } from './Products.styles';

const DESKTOP_GRID_MIN_WIDTH = 960;

const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';

const normalizeProductTypeFilter = value => String(value || '').trim().toLowerCase() || null;

const buildCatalogLabels = (context, typeFilter) => {
  if (context !== 'supplies') {
    return {
      addLabel: global.t?.t?.('products', 'button', 'add') || 'Adicionar Produto',
      empty: 'Nenhum produto encontrado',
      plural: 'produtos',
    };
  }

  const resolvedType = normalizeProductTypeFilter(typeFilter) || 'feedstock';
  const typeLabel = getProductTypeLabel(resolvedType) || 'Insumo';

  return {
    addLabel: `Adicionar ${typeLabel}`,
    empty: 'Nenhum insumo encontrado',
    plural: 'insumos',
  };
};

const buildRouteParams = (routeParams, context, interactionMode) => {
  const params = {
    context,
    interactionMode,
    showBottomCart: interactionMode === 'pdv',
    showBottomToolBar: interactionMode === 'pdv',
  };

  ['id', 'resumeExistingOrder', 'allowLinkedOrderManagement', 'hideBottomToolBar', 'hideCatalogToolbar'].forEach(key => {
    if (routeParams?.[key] !== undefined) {
      params[key] = routeParams[key];
    }
  });

  return params;
};

const buildRequestParams = ({
  categoryId,
  companyId,
  context,
  searchQuery,
  typeFilter,
}) => {
  if (!companyId) return {};

  const effectiveTypeFilter =
    context === 'supplies'
      ? (normalizeProductTypeFilter(typeFilter) || 'feedstock')
      : normalizeProductTypeFilter(typeFilter);

  const params = {
    active: 1,
    company: companyId,
    'order[description]': 'ASC',
    'order[product]': 'ASC',
    type: effectiveTypeFilter
      ? [effectiveTypeFilter]
      : (
          context === 'supplies'
            ? ['feedstock', 'component', 'package']
            : ['product', 'manufactured', 'custom', 'service', 'recipe']
        ),
  };

  const normalizedSearch = String(searchQuery || '').trim();
  if (normalizedSearch) {
    params.search = normalizedSearch;
  }

  if (categoryId && categoryId !== ALL_PRODUCTS_SENTINEL_ID) {
    params['productCategory.category'] = `/categories/${categoryId}`;
  }

  return params;
};

const ProductsPage = ({ navigation: navigationProp, route }) => {
  const navigation = navigationProp || useNavigation();
  const routeParams = route?.params || {};
  const context = useMemo(() => normalizeCatalogContext(routeParams.context), [routeParams.context]);
  const interactionMode = routeParams.interactionMode || (app_type === 'MANAGER' ? 'manager' : 'pdv');
  const isManager = app_type === 'MANAGER' && interactionMode !== 'pdv';
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const { isLoading: storeLoading } = productsStore.getters;
  const { currentCompany } = useStore('people').getters;
  const { colors: themeColors } = useStore('theme').getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [currentCompany?.id, currentCompany?.theme?.colors, themeColors],
  );
  const buttonPalette = useMemo(() => {
    const mergedThemeColors = {
      ...themeColors,
      ...(currentCompany?.theme?.colors || {}),
    };

    return {
      buttonBackground: mergedThemeColors.buttonBackground,
      buttonBorder: mergedThemeColors.buttonBorder,
      buttonText: mergedThemeColors.buttonText,
      buttonIcon: mergedThemeColors.buttonIcon || mergedThemeColors.buttonText,
    };
  }, [currentCompany?.theme?.colors, themeColors]);

  const categoryId = useMemo(
    () => resolveRouteCategoryId(routeParams.categoryId || routeParams.category),
    [routeParams.category, routeParams.categoryId],
  );
  const isAllProducts = !categoryId || categoryId === ALL_PRODUCTS_SENTINEL_ID;
  const typeFilter = useMemo(
    () => normalizeProductTypeFilter(routeParams.typeFilter),
    [routeParams.typeFilter],
  );
  const labels = useMemo(
    () => buildCatalogLabels(context, typeFilter),
    [context, typeFilter],
  );
  const searchQuery = useMemo(
    () => String(routeParams.searchQuery || '').trim(),
    [routeParams.searchQuery],
  );
  const hideCatalogToolbar = useMemo(() => {
    const asBoolean = value => {
      if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true';
      }

      return value === true;
    };

    return asBoolean(routeParams.hideCatalogToolbar) || asBoolean(routeParams.hideBottomToolBar);
  }, [routeParams.hideBottomToolBar, routeParams.hideCatalogToolbar]);
  const isSingleItemMode = Boolean(
    routeParams.singleItemMode ||
    routeParams?.singleItemMode === true,
  );
  const { currentOrderId } = useProductAddQueue({
    isSingleItemMode,
    orderId: routeParams.id || routeParams.order || '',
  });
  const {
    getProductStatuses,
    loadCatalogStatus,
    syncEntity,
    syncingKey: marketplaceSyncingKey,
  } = useMarketplaceCatalogSync(isManager ? currentCompany?.id : null);

  useFocusEffect(
    useCallback(() => {
      if (currentCompany?.id && isManager) {
        loadCatalogStatus().catch(() => {});
      }
    }, [currentCompany?.id, isManager, loadCatalogStatus]),
  );

  const requestParams = useMemo(
    () => buildRequestParams({
      categoryId,
      companyId: currentCompany?.id,
      context,
      searchQuery,
      typeFilter,
    }),
    [categoryId, context, currentCompany?.id, searchQuery, typeFilter],
  );

  const exportCatalog = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      await api.fetch('normalized-catalog/download', {
        params: {
          company: currentCompany.id,
          context,
        },
      });
    } catch (error) {
      Alert.alert(
        global.t?.t?.('products', 'title', 'exportError') || 'Exportacao nao concluida',
        error?.message || 'Nao foi possivel exportar o catalogo.',
      );
    }
  }, [context, currentCompany?.id]);

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

  const handleProductPress = useCallback(
    product => {
      if (!isManager) return;

      navigation.navigate({
        name: 'ProductDetails',
        params: {
          ProductId: product.id,
          ...buildRouteParams(routeParams, context, interactionMode),
          typeFilter: context === 'supplies' ? product.type : undefined,
          initialProductType: context === 'supplies' ? product.type : undefined,
        },
        merge: false,
      });
    },
    [context, interactionMode, isManager, navigation, routeParams],
  );

  const handleAddProduct = useCallback(() => {
    if (!isManager) return;

    navigation.navigate({
      name: 'ProductDetails',
      params: buildRouteParams(routeParams, context, interactionMode),
      merge: false,
    });
  }, [context, interactionMode, isManager, navigation, routeParams]);

  const handleOpenCategories = useCallback(() => {
    navigation.navigate({
      name: 'CategoriesPage',
      params: buildRouteParams(routeParams, context, interactionMode),
      merge: false,
    });
  }, [context, interactionMode, navigation, routeParams]);

  const handleShowAllProducts = useCallback(() => {
    navigation.navigate({
      name: 'ProductsPage',
      params: {
        ...buildRouteParams(routeParams, context, interactionMode),
        categoryId: undefined,
        category: undefined,
      },
      merge: false,
    });
  }, [context, interactionMode, navigation, routeParams]);

  const toolbarActions = useMemo(() => {
    const primaryActionStyle = {
      backgroundColor: buttonPalette.buttonBackground,
      borderColor: buttonPalette.buttonBorder,
    };
    const primaryActionLabelStyle = {
      color: buttonPalette.buttonText,
    };
    const primaryActionIconColor = buttonPalette.buttonIcon;

    const actions = [
      {
        key: 'products-categories',
        icon: 'grid',
        color: primaryActionIconColor,
        style: primaryActionStyle,
        labelStyle: primaryActionLabelStyle,
        label: global.t?.t?.('products', 'button', 'categories') || 'Categorias',
        onPress: handleOpenCategories,
      },
    ];

    if (!isAllProducts) {
      actions.unshift({
        key: 'products-all',
        icon: 'layers',
        color: primaryActionIconColor,
        style: primaryActionStyle,
        labelStyle: primaryActionLabelStyle,
        label: global.t?.t?.('products', 'button', 'allProducts') || 'Todos os produtos',
        onPress: handleShowAllProducts,
      });
    }

    return actions;
  }, [buttonPalette.buttonBackground, buttonPalette.buttonBorder, buttonPalette.buttonIcon, buttonPalette.buttonText, handleOpenCategories, handleShowAllProducts, isAllProducts]);

  const renderProductCard = useCallback(
    ({ item }) => {
      const productCard = (
        <ProductItem
          catalogContext={context}
          displayMode={isManager && width >= DESKTOP_GRID_MIN_WIDTH ? 'table' : 'card'}
          interactionMode={interactionMode}
          marketplaceStatuses={isManager ? getProductStatuses(item) : []}
          marketplaceSyncingKey={marketplaceSyncingKey}
          orderId={currentOrderId}
          palette={brandColors}
          product={item}
          productCategories={[]}
          singleItemMode={isSingleItemMode}
          onMarketplaceSync={handleMarketplaceSync}
        />
      );

      return isManager ? (
        <TouchableOpacity activeOpacity={0.84} onPress={() => handleProductPress(item)} style={{ width: '100%' }}>
          {productCard}
        </TouchableOpacity>
      ) : (
        productCard
      );
    },
    [
      brandColors,
      context,
      currentOrderId,
      getProductStatuses,
      handleMarketplaceSync,
      handleProductPress,
      interactionMode,
      isManager,
      isSingleItemMode,
      marketplaceSyncingKey,
      width,
    ],
  );

  // Card grid: fill content width edge-to-edge; multi-column rows stretch via
  // ui-default cardItem flex:1 (app-community#710).
  const cardListProps = useMemo(
    () => ({
      key: `products-${width < 640 ? 1 : width < 960 ? 2 : width < 1280 ? 3 : 4}`,
      numColumns: width < 640 ? 1 : width < 960 ? 2 : width < 1280 ? 3 : 4,
      columnWrapperStyle: width < 640
        ? null
        : { gap: 12, width: '100%', alignItems: 'stretch' },
      contentContainerStyle: {
        gap: 12,
        paddingBottom: isManager ? 104 : 16,
        paddingHorizontal: 8,
        width: '100%',
      },
    }),
    [isManager, width],
  );

  const exportAction = isManager
    ? {
        key: 'export-csv',
        icon: 'download',
        color: buttonPalette.buttonIcon,
        style: {
          backgroundColor: buttonPalette.buttonBackground,
          borderColor: buttonPalette.buttonBorder,
        },
        labelStyle: {
          color: buttonPalette.buttonText,
        },
        label: global.t?.t?.('products', 'button', 'exportCsv') || 'Exportar CSV',
        onPress: exportCatalog,
      }
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {!storeLoading ? <StateStore store="products" /> : null}
      <View style={styles.managerTableContent}>
        <DefaultTable
          accentColor={brandColors.primary}
          add={isManager}
          addButtonPlacement="bottom"
          addLabel={labels.addLabel}
          cardListProps={cardListProps}
          compactBreakpoint={DESKTOP_GRID_MIN_WIDTH}
          defaultColor="$primary"
          importAction={isManager ? {
            color: buttonPalette.buttonIcon,
            style: {
              backgroundColor: buttonPalette.buttonBackground,
              borderColor: buttonPalette.buttonBorder,
            },
            labelStyle: {
              color: buttonPalette.buttonText,
            },
          } : null}
          exportAction={exportAction}
          initialViewMode="cards"
          onAdd={handleAddProduct}
          onEditRow={handleProductPress}
          onRowPress={handleProductPress}
          renderCard={renderProductCard}
          requestParams={requestParams}
          searchKey="search"
          searchPlaceholder={global.t?.t?.('products', 'input', 'search') || 'Search'}
          showRowActions={false}
          showSearch
          showToolbar={!hideCatalogToolbar}
          showTotalItemsInCompactToolbar
          storeName="products"
          toolbarActions={toolbarActions}
          visibleColumnsPreferenceKey={`products:${context}:${interactionMode}`}
        />
      </View>
    </SafeAreaView>
  );
};

export default ProductsPage;
