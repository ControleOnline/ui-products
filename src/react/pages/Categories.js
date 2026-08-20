import React, { useCallback, useMemo, useRef, useState } from 'react'
import { SafeAreaView, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useStore } from '@store'
import { app_type } from '@appType'
import css from '@controleonline/ui-orders/src/react/css/orders'
import StateStore from '@controleonline/ui-common/src/react/components/StateStore'
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable'
import { colors } from '@controleonline/../../src/styles/colors'
import { resolveThemePalette } from '@controleonline/../../src/styles/branding'
import useMarketplaceCatalogSync from '@controleonline/ui-products/src/react/hooks/useMarketplaceCatalogSync'
import { writeCachedCategories } from '@controleonline/ui-products/src/react/utils/categoryCache'

import { styles } from './Categories.styles'
import CategoryCard from './CategoriesPage/CategoryCard'
import CategoryEditorModal from './CategoriesPage/CategoryEditorModal'
import MenuModelPickerModal from './CategoriesPage/MenuModelPickerModal'
import { buildCatalogLabels } from './CategoriesPage/catalogLabels'
import { buildCategoryToolbarActions } from './CategoriesPage/categoryToolbarActions'
import {
  normalizeCatalogContext,
  normalizeEntityId,
} from './CategoriesPage/categoryPageUtils'
import { shouldRedirectEmptyCategoriesToProducts } from './CategoriesPage/pdvEmptyCategoriesRedirect'
import {
  navigateToAllProducts,
  navigateToCategoryProducts,
} from './CategoriesPage/categoryProductsNavigation'
import { DESKTOP_GRID_MIN_WIDTH, useCategoryGridLayout } from './CategoriesPage/useCategoryGridLayout'
import {
  alertCatalogError,
  alertCatalogMessage,
  downloadMenuCatalogForCompany,
  downloadNormalizedCatalogForCompany,
  loadMenuModelsForCompany,
} from './CategoriesPage/categoryCatalogDownloads'

const CategoriesPage = ({ route }) => {
  const [isDownloadingCatalog, setIsDownloadingCatalog] = useState(false)
  const [isDownloadingNormalizedCatalog, setIsDownloadingNormalizedCatalog] = useState(false)
  const [isLoadingMenuModels, setIsLoadingMenuModels] = useState(false)
  const [showMenuModelModal, setShowMenuModelModal] = useState(false)
  const [menuModels, setMenuModels] = useState([])
  const [selectedMenuModel, setSelectedMenuModel] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const formRef = useRef(null)
  const emptyCategoriesRedirectedRef = useRef(false)
  const navigation = useNavigation()
  const { styles: orderStyles } = css()
  const { cardWidth, columns, gap, isCompactMobile, isMobileCatalog } = useCategoryGridLayout()

  const categoriesStore = useStore('categories')
  const { items, isLoading: storeLoading } = categoriesStore.getters
  const categoryActions = categoriesStore.actions
  const modelActions = useStore('models').actions
  const { currentCompany } = useStore('people').getters
  const { colors: themeColors } = useStore('theme').getters

  const context = useMemo(
    () => normalizeCatalogContext(route?.params?.context),
    [route?.params?.context],
  )
  const labels = useMemo(() => buildCatalogLabels(context), [context])
  const interactionMode =
    route?.params?.interactionMode || (app_type === 'MANAGER' ? 'manager' : 'pdv')
  const isManagerApp = app_type === 'MANAGER' && interactionMode !== 'pdv'
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
  const buttonPalette = useMemo(() => {
    const mergedThemeColors = {
      ...themeColors,
      ...(currentCompany?.theme?.colors || {}),
    }

    return {
      buttonBackground: mergedThemeColors.buttonBackground,
      buttonBorder: mergedThemeColors.buttonBorder,
      buttonText: mergedThemeColors.buttonText,
      buttonIcon: mergedThemeColors.buttonIcon || mergedThemeColors.buttonText,
      buttonBackgroundSecondary: mergedThemeColors.buttonBackgroundSecondary,
      buttonBorderSecondary: mergedThemeColors.buttonBorderSecondary,
      buttonTextSecondary: mergedThemeColors.buttonTextSecondary,
      buttonIconSecondary:
        mergedThemeColors.buttonIconSecondary || mergedThemeColors.buttonTextSecondary,
      iconBackground: mergedThemeColors.iconBackground,
      iconColor: mergedThemeColors.iconColor,
      modalCloseIcon: mergedThemeColors.modalCloseIcon,
    }
  }, [currentCompany?.theme?.colors, themeColors])
  const operationalRouteParams = useMemo(() => {
    const params = route?.params || {}

    return ['id', 'resumeExistingOrder', 'allowLinkedOrderManagement', 'hideBottomToolBar', 'hideCatalogToolbar'].reduce(
      (nextParams, key) => (params[key] === undefined ? nextParams : { ...nextParams, [key]: params[key] }),
      {},
    )
  }, [route?.params])
  const hideCatalogToolbar = useMemo(() => {
    const asBoolean = value => {
      if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true'
      }

      return value === true
    }

    return (
      asBoolean(route?.params?.hideCatalogToolbar) ||
      asBoolean(route?.params?.hideBottomToolBar)
    )
  }, [route?.params?.hideBottomToolBar, route?.params?.hideCatalogToolbar])
  const {
    getCategoryStatuses,
    hasActivePlatforms,
    loadCatalogStatus,
    syncAllEligible,
    syncEntity,
    syncingKey: marketplaceSyncingKey,
  } = useMarketplaceCatalogSync(isManagerApp ? currentCompany?.id : null)

  const loadMenuModels = useCallback(async () => {
    setIsLoadingMenuModels(true)
    try {
      const availableModels = await loadMenuModelsForCompany({ currentCompany, modelActions })
      setMenuModels(availableModels)
      setSelectedMenuModel(current =>
        current && availableModels.some(model => model?.['@id'] === current)
          ? current
          : availableModels[0]?.['@id'] || '',
      )
      return availableModels
    } finally {
      setIsLoadingMenuModels(false)
    }
  }, [currentCompany, modelActions])

  useFocusEffect(
    useCallback(() => {
      if (currentCompany?.id && isManagerApp) {
        loadMenuModels()
        loadCatalogStatus().catch(() => {})
      }
    }, [currentCompany?.id, isManagerApp, loadCatalogStatus, loadMenuModels]),
  )

  React.useEffect(() => {
    if (!routeCategoryId || !isManagerApp) return
    const category = (Array.isArray(items) ? items : [])
      .find(item => normalizeEntityId(item) === routeCategoryId)

    if (!category) return
    if (modalVisible && normalizeEntityId(selectedCategory) === routeCategoryId) return

    setSelectedCategory(category)
    setModalVisible(true)
  }, [isManagerApp, items, modalVisible, routeCategoryId, selectedCategory])

  const requestParams = useMemo(() => ({
    company: currentCompany?.id,
    context,
    'order[sortOrder]': 'ASC',
    'order[name]': 'ASC',
  }), [context, currentCompany?.id])

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

  const refreshSelectedCategory = useCallback(async () => {
    const refreshed = await reloadCategories()
    const fresh = refreshed.find(category => String(category.id) === String(selectedCategory?.id))
    if (fresh) setSelectedCategory(fresh)
    return fresh
  }, [reloadCategories, selectedCategory?.id])

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

  const closeModal = useCallback(() => {
    setModalVisible(false)
    setSelectedCategory(null)
    if (routeCategoryId) navigation.setParams({ categoryId: undefined, category: undefined })
  }, [navigation, routeCategoryId])

  const openCreateModal = useCallback(() => {
    if (routeCategoryId) navigation.setParams({ categoryId: undefined, category: undefined })
    setSelectedCategory(null)
    setModalVisible(true)
  }, [navigation, routeCategoryId])

  const openEditModal = useCallback(category => {
    const categoryId = normalizeEntityId(category)
    if (categoryId && routeCategoryId !== categoryId) {
      navigation.setParams({ categoryId, category: undefined })
    }
    setSelectedCategory(category)
    setModalVisible(true)
  }, [navigation, routeCategoryId])

  const openMenuModelPicker = useCallback(async () => {
    if (!currentCompany?.id) {
      alertCatalogMessage('companyNotSelected', 'selectCompanyForMenuModel')
      return
    }

    const availableModels =
      menuModels.length > 0 || isLoadingMenuModels ? menuModels : await loadMenuModels()

    if (!isLoadingMenuModels && availableModels.length === 0) {
      alertCatalogMessage('noMenuModels', 'createMenuModelForCompany')
      return
    }

    setShowMenuModelModal(true)
  }, [currentCompany?.id, isLoadingMenuModels, loadMenuModels, menuModels])

  const downloadCatalog = useCallback(async () => {
    if (isDownloadingCatalog || !currentCompany?.id) return

    let modelIri = selectedMenuModel
    if (!modelIri) {
      const availableModels = menuModels.length ? menuModels : await loadMenuModels()
      modelIri = availableModels[0]?.['@id'] || ''
      if (modelIri) setSelectedMenuModel(modelIri)
    }
    if (!modelIri) return openMenuModelPicker()

    setIsDownloadingCatalog(true)
    try {
      await downloadMenuCatalogForCompany({ currentCompany, modelIri })
    } catch (error) {
      alertCatalogError('downloadError', error)
    } finally {
      setIsDownloadingCatalog(false)
    }
  }, [
    currentCompany,
    isDownloadingCatalog,
    loadMenuModels,
    menuModels,
    openMenuModelPicker,
    selectedMenuModel,
  ])

  const downloadNormalizedCatalog = useCallback(async () => {
    if (isDownloadingNormalizedCatalog || !currentCompany?.id) return

    setIsDownloadingNormalizedCatalog(true)
    try {
      await downloadNormalizedCatalogForCompany({ currentCompany, context })
    } catch (error) {
      alertCatalogError('exportError', error)
    } finally {
      setIsDownloadingNormalizedCatalog(false)
    }
  }, [context, currentCompany, isDownloadingNormalizedCatalog])

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

  const saveCategoryCover = useCallback(async relation => {
    if (!selectedCategory?.id || !relation?.id || !currentCompany?.id) return

    const parentId = normalizeEntityId(selectedCategory.parent)
    const companyIri = currentCompany?.['@id'] || `/people/${normalizeEntityId(currentCompany.id)}`

    await categoryActions.save({
      id: selectedCategory.id,
      name: selectedCategory.name || '',
      color: selectedCategory.color,
      icon: selectedCategory.icon || '',
      context,
      company: companyIri,
      parent: parentId ? `/categories/${parentId}` : null,
      extraData: {
        ...(selectedCategory.extraData || {}),
        imageCoverRelationId: relation.id,
      },
    })
    await refreshSelectedCategory()
  }, [categoryActions, context, currentCompany, refreshSelectedCategory, selectedCategory])

  const openAllProducts = useCallback(() => {
    navigateToAllProducts({
      categoryActions,
      context,
      interactionMode,
      navigation,
      operationalRouteParams,
    })
  }, [categoryActions, context, interactionMode, navigation, operationalRouteParams])

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
      {!storeLoading && <StateStore store="categories" />}
      <View style={styles.tableContent}>
        <DefaultTable
          accentColor={brandColors.primary}
          add={isManagerApp}
          addButtonPlacement="bottom"
          addLabel={labels.addCategoryLabel}
          cardListProps={tableCardProps}
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
          rowStyle={rowStyle}
          searchKey="search"
          searchPlaceholder={global.t?.t?.('categories', 'input', 'search')}
          showSearch
          showToolbar={!hideCatalogToolbar}
          showRowActions={false}
          showTotalItemsInCompactToolbar
          storeName="categories"
          toolbarActions={toolbarActions}
          visibleColumnsPreferenceKey={`categories:${context}`}
        />
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
