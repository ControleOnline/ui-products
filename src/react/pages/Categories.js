import React, { useCallback, useMemo, useRef, useState } from 'react'
import { SafeAreaView, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useStore } from '@store'
import { app_type } from '@appType'
import {
  POS_OPERATION_MODE_WAITER,
  resolvePosOperationMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import css from '@controleonline/ui-orders/src/react/css/orders'
import StateStore from '@controleonline/ui-common/src/react/components/StateStore'
import DefaultToolbarAction from '@controleonline/ui-default/src/react/components/table/DefaultToolbarAction'
import DefaultSearch from '@controleonline/ui-default/src/react/components/filters/DefaultSearch'
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable'
import { colors } from '@controleonline/../../src/styles/colors'
import { resolveThemePalette } from '@controleonline/../../src/styles/branding'
import useMarketplaceCatalogSync from '@controleonline/ui-products/src/react/hooks/useMarketplaceCatalogSync'
import useCachedCatalogActions from '../hooks/useCachedCatalogActions'
import useCachedCatalogView from '../hooks/useCachedCatalogView'
import { writeCachedCategories } from '@controleonline/ui-products/src/react/utils/categoryCache'

import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem'
import {isCatalogToolbarHidden} from './CategoriesPage/catalogToolbarVisibility'
import {buildCategoryButtonPalette} from './CategoriesPage/categoryButtonPalette'
import CategoryCard from './CategoriesPage/CategoryCard'
import PdvCategoryTabs from './CategoriesPage/PdvCategoryTabs'
import { styles } from './Categories.styles'
import useProductAddQueue from '@controleonline/ui-products/src/react/hooks/useProductAddQueue'
import { ALL_PRODUCTS_SENTINEL_ID } from '@controleonline/ui-products/src/react/constants/categorySentinels'
import { buildProductCatalogRequestParams } from '@controleonline/ui-products/src/react/utils/productCatalogRequestParams'
import useInlineCategoryData from './CategoriesPage/useInlineCategoryData'
import useCategoryManagement from './CategoriesPage/useCategoryManagement'
import CategoryEditorModal from './CategoriesPage/CategoryEditorModal'
import MenuModelPickerModal from './CategoriesPage/MenuModelPickerModal'
import { buildCatalogLabels } from './CategoriesPage/catalogLabels'
import { buildCategoryToolbarActions } from './CategoriesPage/categoryToolbarActions'
import {
  normalizeCatalogContext,
  normalizeEntityId,
} from './CategoriesPage/categoryPageUtils'
import { shouldRedirectEmptyCategoriesToProducts } from './CategoriesPage/pdvEmptyCategoriesRedirect'
import { shouldUseInlinePdvCategories as resolveInlinePdvCategories } from './CategoriesPage/shouldUseInlinePdvCategories'
import {
  navigateToAllProducts,
  navigateToCategoryProducts,
} from './CategoriesPage/categoryProductsNavigation'
import { DESKTOP_GRID_MIN_WIDTH, useCategoryGridLayout } from './CategoriesPage/useCategoryGridLayout'
import {alertCatalogError} from './CategoriesPage/categoryCatalogDownloads'
const {resolveShowBottomCart} = require('@controleonline/ui-products/src/react/utils/resolveShowBottomCart')

const CategoriesPage = ({ activeOrderId = '', route }) => {
  const [productSearchDraft, setProductSearchDraft] = useState('')
  const [activeProductSearch, setActiveProductSearch] = useState('')
  const [activePdvCategoryId, setActivePdvCategoryId] = useState('')
  const formRef = useRef(null)
  const emptyCategoriesRedirectedRef = useRef(false)
  const navigation = useNavigation()
  const { styles: orderStyles } = css()
  const { cardWidth, columns, gap, isCompactMobile, isMobileCatalog } = useCategoryGridLayout()

  const categoriesStore = useStore('categories')
  const { items, isLoading: storeLoading } = categoriesStore.getters
  const productsStore = useStore('products')
  const deviceConfigStore = useStore('device_config')
  const { item: runtimeDeviceConfig } = deviceConfigStore.getters
  const isWaiterPosMode = String(app_type || '').trim().toUpperCase() === 'POS' &&
    String(route?.params?.interactionMode || 'pdv').trim().toLowerCase() === 'pdv' &&
    resolvePosOperationMode(runtimeDeviceConfig?.configs) === POS_OPERATION_MODE_WAITER
  const productsActions = productsStore.actions
  const { currentOrderId } = useProductAddQueue({
    orderId: activeOrderId || route?.params?.orderId || route?.params?.id || route?.params?.order || '',
  })
  const { currentCompany } = useStore('people').getters
  const { colors: themeColors } = useStore('theme').getters

  const context = useMemo(
    () => normalizeCatalogContext(route?.params?.context),
    [route?.params?.context],
  )
  const categoryActions = useCachedCatalogActions(categoriesStore, isWaiterPosMode, currentCompany?.id, context)
  const cachedProductActions = useCachedCatalogActions(productsStore, isWaiterPosMode, currentCompany?.id, context)
  const restoreCatalogView = useCallback(saved => {
    setActivePdvCategoryId(saved.categoryId || '')
    setProductSearchDraft(saved.search || '')
    setActiveProductSearch(saved.search || '')
  }, [])
  const cachedListProps = useCachedCatalogView({enabled: isWaiterPosMode, companyId: currentCompany?.id,
    context, viewKey: 'categories', scopeRevision: runtimeDeviceConfig?.id, resetKey: route?.params?.catalogResetKey,
    view: {categoryId: activePdvCategoryId, search: activeProductSearch}, restore: restoreCatalogView})
  const labels = useMemo(() => buildCatalogLabels(context), [context])
  const interactionMode =
    route?.params?.interactionMode || (app_type === 'MANAGER' ? 'manager' : 'pdv')
  const isManagerApp = app_type === 'MANAGER' && interactionMode !== 'pdv'
  const useInlinePdvCategories = resolveInlinePdvCategories({
    appType: app_type,
    interactionMode,
    isMobileCatalog,
    isWaiterPosMode,
  })

  const routeCategoryId = useMemo(
    () => normalizeEntityId(route?.params?.categoryId || route?.params?.category),
    [route?.params?.category, route?.params?.categoryId],
  )
  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [currentCompany?.id, themeColors],
  )
  const buttonPalette = useMemo(
    () => buildCategoryButtonPalette(currentCompany?.theme?.colors, themeColors),
    [currentCompany?.theme?.colors, themeColors],
  )
  const operationalRouteParams = useMemo(() => {
    const params = route?.params || {}

    return ['id', 'orderId', 'resumeExistingOrder', 'allowLinkedOrderManagement', 'hideBottomToolBar', 'hideCatalogToolbar', 'showBottomCart'].reduce(
      (nextParams, key) => (params[key] === undefined ? nextParams : { ...nextParams, [key]: params[key] }),
      {},
    )
  }, [route?.params])
  const hideCatalogToolbar = isCatalogToolbarHidden(route?.params)
  const {
    getCategoryStatuses,
    hasActivePlatforms,
    loadCatalogStatus,
    syncAllEligible,
    syncEntity,
    syncingKey: marketplaceSyncingKey,
  } = useMarketplaceCatalogSync(isManagerApp ? currentCompany?.id : null)

  const requestParams = useMemo(() => ({
    company: currentCompany?.id,
    context,
    'order[sortOrder]': 'ASC',
    'order[name]': 'ASC',
  }), [context, currentCompany?.id])
  const productSearchRequestParams = useMemo(
    () => buildProductCatalogRequestParams({
      categoryId: activePdvCategoryId || ALL_PRODUCTS_SENTINEL_ID,
      companyId: currentCompany?.id,
      context,
      searchQuery: activeProductSearch,
    }),
    [activePdvCategoryId, activeProductSearch, context, currentCompany?.id],
  )
  const productSearchFilters = useMemo(
    () => ({ search: productSearchDraft }),
    [productSearchDraft],
  )
  const handleProductSearchFiltersChange = useCallback(filters => {
    setProductSearchDraft(String(filters?.search || ''))
  }, [])
  const handleProductSearch = useCallback(query => {
    const normalizedQuery = String(query || '').trim()
    setProductSearchDraft(normalizedQuery)
    setActiveProductSearch(normalizedQuery)
    setActivePdvCategoryId('')
    productsActions?.setFilters?.({})
  }, [productsActions])
  const handlePdvCategorySelect = useCallback(category => {
    const categoryId = normalizeEntityId(category)
    if (!categoryId) return

    categoryActions.setItem(category)
    setProductSearchDraft('')
    setActiveProductSearch('')
    setActivePdvCategoryId(categoryId)
    productsActions?.setFilters?.({})
  }, [categoryActions, productsActions])
  const productSearchCardListProps = useMemo(() => ({
    key: 'pdv-product-search-results',
    numColumns: 1,
    contentContainerStyle: { gap: 8, paddingBottom: 24, paddingHorizontal: 8 },
  }), [])

  const tableCardProps = useMemo(() => ({
    key: `categories-${columns}`,
    numColumns: columns,
    columnWrapperStyle: columns > 1 ? { gap } : null,
    contentContainerStyle: { gap, paddingBottom: 24 },
  }), [columns, gap])

  const rowStyle = useCallback(
    () => ({
      flex: 1,
      maxWidth: cardWidth,
    }),
    [cardWidth],
  )

  const reloadCategories = useCallback(async () => {
    if (!currentCompany?.id) return []

    const data = await categoryActions.getItems(requestParams)
    writeCachedCategories(currentCompany.id, data || [], context)
    return data || []
  }, [categoryActions, context, currentCompany?.id, requestParams])

  const {
    isDownloadingCatalog, isDownloadingNormalizedCatalog, isLoadingMenuModels,
    showMenuModelModal, setShowMenuModelModal, menuModels, selectedMenuModel,
    setSelectedMenuModel, modalVisible, selectedCategory, setSelectedCategory,
    refreshSelectedCategory, closeModal, openCreateModal, openEditModal,
    openMenuModelPicker, downloadCatalog, downloadNormalizedCatalog, saveCategoryCover
  } = useCategoryManagement({categoryActions, context, currentCompany, isManagerApp,
    items, loadCatalogStatus, navigation, reloadCategories, routeCategoryId})

  const changeCategory = useCallback(category => {
    navigateToCategoryProducts({
      category,
      categoryActions,
      context,
      interactionMode,
      navigation,
      operationalRouteParams,
    })
  }, [categoryActions, context, interactionMode, navigation, operationalRouteParams])

  const handleSyncAllEligible = useCallback(async () => {
    try {
      await syncAllEligible()
    } catch (error) {
      alertCatalogError('syncError', error)
    }
  }, [syncAllEligible])

  const handleMarketplaceSync = useCallback(
    (platformKey, status, syncKey) => syncEntity(platformKey, status, { syncKey }),
    [syncEntity],
  )

  const openAllProducts = useCallback(() => {
    navigateToAllProducts({
      categoryActions,
      context,
      interactionMode,
      navigation,
      operationalRouteParams,
    })
  }, [categoryActions, context, interactionMode, navigation, operationalRouteParams])

  const {categoryFetchError, categoryFetchLoading, fetchInlineCategories} = useInlineCategoryData({
    categoryActions, context, currentCompany, emptyCategoriesRedirectedRef, isManagerApp,
    openAllProducts, requestParams, categoriesPrefetched: route?.params?.categoriesPrefetched,
    useInlinePdvCategories,
  })

  const toolbarActions = useMemo(() => isManagerApp ? buildCategoryToolbarActions({
    buttonPalette,
    canUseCompany: Boolean(currentCompany?.id),
    hasActivePlatforms,
    isDownloadingCatalog,
    isLoadingMenuModels,
    marketplaceSyncingKey,
    onDownloadCatalog: downloadCatalog,
    onOpenAllProducts: openAllProducts,
    onOpenIntegrations: () => navigation.navigate('IntegrationsPage'),
    onOpenMenuModelPicker: openMenuModelPicker,
    onSyncAllEligible: handleSyncAllEligible,
  }) : [], [
    currentCompany?.id,
    buttonPalette,
    downloadCatalog,
    handleSyncAllEligible,
    hasActivePlatforms,
    isDownloadingCatalog,
    isLoadingMenuModels,
    isManagerApp,
    marketplaceSyncingKey,
    navigation,
    openAllProducts,
    openMenuModelPicker,
  ])

  const renderCategoryCard = useCallback(({ item }) => (
    <CategoryCard
      brandColors={brandColors}
      category={item}
      getCategoryStatuses={getCategoryStatuses}
      isCompactMobile={isCompactMobile}
      isManagerApp={isManagerApp}
      isMobileCatalog={isMobileCatalog}
      marketplaceSyncingKey={marketplaceSyncingKey}
      onEdit={openEditModal}
      onOpen={changeCategory}
      onSync={handleMarketplaceSync}
    />
  ), [
    brandColors,
    changeCategory,
    getCategoryStatuses,
    handleMarketplaceSync,
    isCompactMobile,
    isManagerApp,
    isMobileCatalog,
    marketplaceSyncingKey,
    openEditModal,
  ])

  return (
    <SafeAreaView style={[orderStyles.container, styles.container]}>
      <View style={styles.tableContent}>
        {isWaiterPosMode ? (
          <View
            style={[
              styles.searchStickyShell,
              styles.searchStickyShellCompact,
              { paddingHorizontal: 8, paddingVertical: 10 },
            ]}
          >
            <DefaultSearch
              filters={productSearchFilters}
              onChangeFilters={handleProductSearchFiltersChange}
              onSearch={handleProductSearch}
              placeholder={global.t?.t?.('products', 'input', 'search') || 'Buscar produto'}
              searchKey="search"
              storeName="products"
              style={[styles.searchInputWrap, { width: '100%' }]}
              value={productSearchDraft}
            />
          </View>
        ) : null}
        {useInlinePdvCategories && (storeLoading || categoryFetchLoading) ? (
          <StateStore compact mode="compact" store="categories" />
        ) : null}
        {useInlinePdvCategories && !activeProductSearch && !categoryFetchError ? (
          <View style={styles.pdvCategoryTabsShell}>
            <PdvCategoryTabs
              categories={Array.isArray(items) ? items : []}
              onSelectCategory={handlePdvCategorySelect}
              palette={brandColors}
              selectedCategoryId={activePdvCategoryId}
            />
          </View>
        ) : null}
        {useInlinePdvCategories && categoryFetchError ? (
          <View testID="category-fetch-error" accessibilityRole="alert">
            <Text>{global.t?.t?.('categories', 'error', 'load') || 'Nao foi possivel carregar as categorias.'}</Text>
            <DefaultToolbarAction action={{
              key: 'category-fetch-retry', icon: 'refresh', label: 'Tentar novamente',
              onPress: () => fetchInlineCategories(), testID: 'category-fetch-retry',
            }} />
          </View>
        ) : (isWaiterPosMode && activeProductSearch) || (useInlinePdvCategories && activePdvCategoryId) ? (
          <>
            <DefaultTable
              accentColor={brandColors.primary}
              actions={cachedProductActions}
              cardListProps={{...productSearchCardListProps, ...cachedListProps}}
              compactBreakpoint={DESKTOP_GRID_MIN_WIDTH}
              data={undefined}
              initialViewMode="cards"
              renderCard={({ item }) => (
                <ProductItem
                  catalogContext={context}
                  displayMode="search"
                  interactionMode={interactionMode}
                  orderId={currentOrderId}
                  showBottomCart={resolveShowBottomCart(interactionMode, operationalRouteParams.showBottomCart)}
                  palette={brandColors}
                  product={item}
                />
              )}
              requestParams={productSearchRequestParams}
              showRowActions={false}
              showSearch={false}
              showToolbar={false}
              showToolbarActions={false}
              showToolbarControls={false}
              showTotalItemsInCompactToolbar={false}
              showTotalItemsInFooter={false}
              storeName="products"
            />
          </>
        ) : useInlinePdvCategories ? (
          storeLoading || categoryFetchLoading ? null : (
            <View style={{ flex: 1 }}>
              <Text style={styles.pdvCategoryEmptyHint}>
                {global.t?.t?.('categories', 'helper', 'selectCategory') || 'Selecione uma categoria para ver os produtos.'}
              </Text>
            </View>
          )
        ) : (
        <DefaultTable
          accentColor={brandColors.primary}
          add={isManagerApp}
          addButtonPlacement="bottom"
          addLabel={labels.addCategoryLabel}
          actions={categoryActions}
          cardListProps={{...tableCardProps, ...cachedListProps}}
          compactBreakpoint={DESKTOP_GRID_MIN_WIDTH}
          defaultColor="$primary"
          importAction={isManagerApp ? {
            color: buttonPalette.buttonIcon,
            style: {
              backgroundColor: buttonPalette.buttonBackground,
              borderColor: buttonPalette.buttonBorder,
            },
            labelStyle: {
              color: buttonPalette.buttonText,
            },
          } : null}
          exportAction={isManagerApp ? {
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
            label: isDownloadingNormalizedCatalog
              ? global.t?.t?.('categories', 'label', 'exporting')
              : global.t?.t?.('categories', 'button', 'exportCsv'),
            disabled: isDownloadingNormalizedCatalog || !currentCompany?.id,
            onPress: downloadNormalizedCatalog,
          } : null}
          initialViewMode="cards"
          onAdd={openCreateModal}
          onDataLoaded={data => {
            writeCachedCategories(currentCompany?.id, data || [], context)
            if (
              !emptyCategoriesRedirectedRef.current &&
              shouldRedirectEmptyCategoriesToProducts({ isManagerApp, data })
            ) {
              emptyCategoriesRedirectedRef.current = true
              openAllProducts()
            }
          }}
          onEditRow={openEditModal}
          onRowPress={changeCategory}
          renderCard={renderCategoryCard}
          requestParams={requestParams}
          data={route?.params?.categoriesPrefetched === true ? items : undefined}
          rowStyle={rowStyle}
          searchKey="search"
          searchPlaceholder={global.t?.t?.('categories', 'input', 'search')}
          showSearch={!isWaiterPosMode}
          showToolbar={!isWaiterPosMode && !hideCatalogToolbar}
          showRowActions={false}
          showTotalItemsInCompactToolbar={!isWaiterPosMode}
          showTotalItemsInFooter={!isWaiterPosMode}
          showToolbarActions={!isWaiterPosMode}
          showToolbarControls={!isWaiterPosMode}
          storeName="categories"
          toolbarActions={toolbarActions}
          visibleColumnsPreferenceKey={`categories:${context}`}
        />
        )}
      </View>

      {isManagerApp ? (
        <MenuModelPickerModal
          brandColors={brandColors}
          buttonPalette={buttonPalette}
          isLoading={isLoadingMenuModels}
          models={menuModels}
          selectedModel={selectedMenuModel}
          visible={showMenuModelModal}
          onClose={() => setShowMenuModelModal(false)}
          onSelect={model => {
            setSelectedMenuModel(model)
            setShowMenuModelModal(false)
          }}
        />
      ) : null}

      <CategoryEditorModal
        brandColors={brandColors}
        buttonPalette={buttonPalette}
        category={selectedCategory}
        companyId={currentCompany?.id}
        context={context}
        formRef={formRef}
        title={selectedCategory ? labels.editCategoryLabel : labels.newCategoryLabel}
        visible={modalVisible}
        onAttachmentsChanged={refreshSelectedCategory}
        onClose={closeModal}
        onCoverChanged={saveCategoryCover}
        onSaved={saved => {
          setSelectedCategory(saved || null)
          reloadCategories().catch(() => {})
          loadCatalogStatus().catch(() => {})
        }}
      />
    </SafeAreaView>
  )
}

export default CategoriesPage
