import React, { useCallback, useState, useMemo, useRef } from 'react'
import { Text, View, Image, ScrollView, TouchableOpacity, Platform, Modal, useWindowDimensions, ActivityIndicator, Alert, TextInput } from 'react-native'
import { useStore } from '@store'
import { SafeAreaView } from 'react-native-safe-area-context'
import css from '@controleonline/ui-orders/src/react/css/orders'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { env } from '@env'
import CategoryForm from '@controleonline/ui-common/src/react/components/CategoryForm'
import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl'
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService'
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager'
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal'
import {
  downloadMenuCatalog as downloadCompanyMenuCatalog,
} from '@controleonline/ui-common/src/react/utils/menuCatalogDownload'
import {
  downloadNormalizedCatalog as downloadCompanyNormalizedCatalog,
} from '@controleonline/ui-common/src/react/utils/normalizedCatalogDownload'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { resolveThemePalette } from '@controleonline/../../src/styles/branding'
import { colors } from '@controleonline/../../src/styles/colors'
import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports'
import {searchCompanyProducts} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'
import MarketplaceSyncIndicators from '@controleonline/ui-products/src/react/components/MarketplaceSyncIndicators'
import useMarketplaceCatalogSync from '@controleonline/ui-products/src/react/hooks/useMarketplaceCatalogSync'

import {
  readCachedCategories,
  writeCachedCategories,
} from '@controleonline/ui-products/src/react/utils/categoryCache'
import usePosOrderMaterialization from '@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization'

import Icon from 'react-native-vector-icons/FontAwesome'
import { skeletonStyles, styles } from './Categories.styles'

import {
  inlineStyle_104_8,
  inlineStyle_424_14,
  inlineStyle_617_22,
  inlineStyle_631_42,
  inlineStyle_692_8,
} from './Categories.styles';
import {ALL_PRODUCTS_SENTINEL} from '@controleonline/ui-products/src/react/constants/categorySentinels';

const buildCoverUrl = (files, coverRelationId) => {
  const arr = files || []
  let first = null
  if (coverRelationId) {
    first = arr.find(item => String(item?.id) === String(coverRelationId) && item?.file?.id)
  }
  if (!first) first = arr.find(item => item?.file?.id)
  if (!first) return null
  return resolveFileImageUrl(first.file)
}

const slugifyFileName = value => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'catalogo'
}

const normalizeEntityId = value => {
  if (!value && value !== 0) {
    return ''
  }

  const raw = typeof value === 'object'
    ? value?.['@id'] || value?.id || value?.value || ''
    : value

  return String(raw || '').replace(/\D+/g, '').trim()
}

const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products'

const buildCatalogLabels = context => {
  if (context === 'supplies') {
    return {
      itemSingular: 'insumo',
      itemPlural: 'insumos',
      categorySingular: 'categoria de insumo',
      categoryPlural: 'categorias de insumo',
      addCategoryLabel: 'Adicionar Categoria de Insumo',
      newCategoryLabel: 'Nova Categoria de Insumo',
      editCategoryLabel: 'Editar Categoria de Insumo',
      searchPlaceholder: 'Buscar insumo pelo nome ou SKU',
      allLabel: 'Todos os insumos',
      emptyTitle: 'Nenhuma categoria de insumo',
      emptySubtitleManager: 'Adicione a primeira categoria de insumo para começar',
      countSingular: 'categoria de insumo',
      countPlural: 'categorias de insumo',
    }
  }

  return {
    itemSingular: 'produto',
    itemPlural: 'produtos',
    categorySingular: 'categoria',
    categoryPlural: 'categorias',
    addCategoryLabel: 'Adicionar Categoria',
    newCategoryLabel: 'Nova Categoria',
    editCategoryLabel: 'Editar Categoria',
    searchPlaceholder: 'Buscar produto pelo nome ou SKU',
    allLabel: 'Todos',
    emptyTitle: 'Nenhuma categoria',
    emptySubtitleManager: 'Adicione a primeira categoria para começar',
    countSingular: 'categoria',
    countPlural: 'categorias',
  }
}

const SkeletonCard = ({ width }) => (
  <View style={inlineStyle_104_8({
    width: width,
  })}>
    <View style={[skeletonStyles.card, { aspectRatio: 3 / 4 }]} />
  </View>
)

const CategoriesPage = ({ route }) => {
  const [showImportModal, setShowImportModal] = useState(false)
  const [isDownloadingCatalog, setIsDownloadingCatalog] = useState(false)
  const [isDownloadingNormalizedCatalog, setIsDownloadingNormalizedCatalog] = useState(false)
  const [isLoadingMenuModels, setIsLoadingMenuModels] = useState(false)
  const [showMenuModelModal, setShowMenuModelModal] = useState(false)
  const [menuModels, setMenuModels] = useState([])
  const [selectedMenuModel, setSelectedMenuModel] = useState('')
  const [productSearchText, setProductSearchText] = useState('')
  const [productSearchResults, setProductSearchResults] = useState([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const navigation = useNavigation()
  const {showError} = useMessage() || {}
  const { width } = useWindowDimensions()
  const interactionMode =
    route?.params?.interactionMode ||
    (env.APP_TYPE === 'MANAGER' ? 'manager' : 'pdv')
  const isManagerApp = env.APP_TYPE === 'MANAGER' && interactionMode !== 'pdv'

  const categoriesStore = useStore('categories')
  const { items, isLoading: storeLoading } = categoriesStore.getters
  const categoryActions = categoriesStore.actions

  const modelsStore = useStore('models')
  const modelActions = modelsStore.actions

  const peopleStore = useStore('people')
  const { currentCompany } = peopleStore.getters
  const {
    getCategoryStatuses,
    hasActivePlatforms,
    loadCatalogStatus,
    syncAllEligible,
    syncEntity,
    syncingKey: marketplaceSyncingKey,
  } = useMarketplaceCatalogSync(isManagerApp ? currentCompany?.id : null)

  const themeStore = useStore('theme')
  const { colors: themeColors } = themeStore.getters
  const openImport = () => {
    setShowImportModal(true)
  }
  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  )

  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const formRef = useRef(null)
  const context = useMemo(
    () => normalizeCatalogContext(route?.params?.context),
    [route?.params?.context],
  )
  const labels = useMemo(() => buildCatalogLabels(context), [context])
  const routeCategoryId = useMemo(
    () => normalizeEntityId(route?.params?.categoryId || route?.params?.category),
    [route?.params?.category, route?.params?.categoryId],
  )
  const operationalRouteParams = useMemo(() => {
    const params = route?.params || {}
    const nextParams = {}

    if (params?.id) {
      nextParams.id = params.id
    }

    if (params?.resumeExistingOrder === true) {
      nextParams.resumeExistingOrder = true
    }

    if (typeof params?.allowLinkedOrderManagement === 'boolean') {
      nextParams.allowLinkedOrderManagement = params.allowLinkedOrderManagement
    }

    return nextParams
  }, [
    route?.params?.allowLinkedOrderManagement,
    route?.params?.id,
    route?.params?.resumeExistingOrder,
  ])
  const {materializeOrderWithProducts, openOrderDetails} = usePosOrderMaterialization({
    interactionParams: route?.params,
    navigation,
  })

  const loadMenuModels = useCallback(async () => {
    if (!currentCompany?.id) {
      setMenuModels([])
      setSelectedMenuModel('')
      return []
    }

    const currentCompanyId = normalizeEntityId(currentCompany.id)
    setIsLoadingMenuModels(true)

    try {
      const response = await modelActions.getItems({
        context: 'menu',
        people: currentCompanyId,
        itemsPerPage: 100,
      })

      const availableModels = (Array.isArray(response) ? response : [])
        .filter(model => {
          const modelCompanyId = normalizeEntityId(model?.people || model?.company)
          return !modelCompanyId || modelCompanyId === currentCompanyId
        })
        .sort((first, second) =>
          String(first?.model || '').localeCompare(String(second?.model || ''), 'pt-BR', {
            sensitivity: 'base',
          })
        )

      setMenuModels(availableModels)
      setSelectedMenuModel(current =>
        current && availableModels.some(model => model?.['@id'] === current)
          ? current
          : availableModels[0]?.['@id'] || ''
      )
      modelActions.setError?.(null)

      return availableModels
    } catch {
      setMenuModels([])
      setSelectedMenuModel('')
      modelActions.setError?.(null)
      return []
    } finally {
      setIsLoadingMenuModels(false)
    }
  }, [currentCompany?.id, modelActions])

  useFocusEffect(
    useCallback(() => {
      const cached = readCachedCategories(currentCompany?.id, context)
      if (cached.length > 0) {
        categoryActions.setItems(cached)
      } else {
        categoryActions.setItems([])
      }
      if (currentCompany?.id) {
        categoryActions
          .getItems({
            context: context,
            'order[name]': 'ASC',
            company: currentCompany.id,
          })
          .then(data => {
            categoryActions.setItems(data || [])
            writeCachedCategories(currentCompany.id, data || [], context)
          })

        if (isManagerApp) {
          loadMenuModels()
          loadCatalogStatus().catch(() => {})
        }
      }
    }, [context, currentCompany?.id, categoryActions, isManagerApp, loadCatalogStatus, loadMenuModels])
  )

  const changeCategory = category => {
    const categoryId =
      category?._isAllProducts || category?.['@id'] === ALL_PRODUCTS_SENTINEL['@id']
        ? ALL_PRODUCTS_SENTINEL['@id']
        : normalizeEntityId(category)

    categoryActions.setItem(category || null)
    navigation.navigate({
      name: 'ProductsPage',
      params: {
        ...operationalRouteParams,
        categoryId,
        context,
        interactionMode,
        showBottomCart: interactionMode === 'pdv',
        showBottomToolBar: interactionMode === 'pdv',
      },
      merge: false,
    })
  }

  const openCreateModal = () => {
    if (routeCategoryId) navigation.setParams({ categoryId: undefined, category: undefined })
    setSelectedCategory(null)
    setModalVisible(true)
  }

  const openEditModal = category => {
    const categoryId = normalizeEntityId(category)
    if (categoryId && routeCategoryId !== categoryId) {
      navigation.setParams({ categoryId, category: undefined })
    }
    setSelectedCategory(category)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedCategory(null)
    if (routeCategoryId) navigation.setParams({ categoryId: undefined, category: undefined })
  }

  React.useEffect(() => {
    if (!routeCategoryId || !isManagerApp) return
    const category = (Array.isArray(items) ? items : [])
      .find(item => normalizeEntityId(item) === routeCategoryId)

    if (!category) return
    if (modalVisible && normalizeEntityId(selectedCategory) === routeCategoryId) return

    setSelectedCategory(category)
    setModalVisible(true)
  }, [isManagerApp, items, modalVisible, routeCategoryId, selectedCategory])

  const reloadCategories = useCallback(async () => {
    if (!currentCompany?.id) return []
    const data = await categoryActions.getItems({
      context: context,
      'order[name]': 'ASC',
      company: currentCompany.id,
    })
    writeCachedCategories(currentCompany.id, data || [], context)
    return data || []
  }, [context, currentCompany?.id, categoryActions])

  const refreshSelectedCategory = useCallback(async () => {
    const refreshed = await reloadCategories()
    const fresh = refreshed.find(c => String(c.id) === String(selectedCategory?.id))
    if (fresh) setSelectedCategory(fresh)
    return fresh
  }, [reloadCategories, selectedCategory?.id])

  const saveCategoryCover = useCallback(async relation => {
    if (!selectedCategory?.id || !relation?.id || !currentCompany?.id) return

    const parentId = normalizeEntityId(selectedCategory.parent)
    const companyIri = currentCompany?.['@id']
      ? String(currentCompany['@id'])
      : `/people/${normalizeEntityId(currentCompany.id)}`

    await categoryActions.save({
      id: selectedCategory.id,
      name: selectedCategory.name || '',
      color: selectedCategory.color || '#CBD5E1',
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

  const selectedMenuModelLabel = useMemo(() => {
    if (isLoadingMenuModels) {
      return 'Carregando modelo'
    }

    return menuModels.find(model => model?.['@id'] === selectedMenuModel)?.model || 'Selecionar modelo'
  }, [isLoadingMenuModels, menuModels, selectedMenuModel])
  const normalizedProductSearchText = useMemo(
    () => String(productSearchText || '').trim(),
    [productSearchText],
  )

  const openProductSearchResults = useCallback(
    query => {
      const normalizedQuery = String(query || '').trim()
      if (!normalizedQuery) {
        return
      }

      setProductSearchResults([])
      navigation.navigate({
        name: 'ProductsPage',
        params: {
          ...operationalRouteParams,
          categoryId: ALL_PRODUCTS_SENTINEL['@id'],
          context,
          interactionMode,
          searchQuery: normalizedQuery,
          showBottomCart: interactionMode === 'pdv',
          showBottomToolBar: interactionMode === 'pdv',
        },
        merge: false,
      })
    },
    [context, interactionMode, navigation, operationalRouteParams],
  )
  const handleAutocompleteProductSelect = useCallback(
    async product => {
      try {
        const productId = normalizeEntityId(product)

        if (!productId) {
          throw new Error('Nao foi possivel identificar o produto selecionado.')
        }

        const updatedOrder = await materializeOrderWithProducts({
          products: [{product: productId, quantity: 1}],
        })

        if (!updatedOrder) {
          throw new Error('Nao foi possivel preparar o pedido para conferencia.')
        }

        setProductSearchText('')
        setProductSearchResults([])
        openOrderDetails(updatedOrder)
      } catch (error) {
        showError?.(error?.message || 'Nao foi possivel adicionar o produto selecionado.')
      }
    },
    [materializeOrderWithProducts, openOrderDetails, showError],
  )

  const openMenuModelPicker = useCallback(async () => {
    if (!currentCompany?.id) {
      Alert.alert('Empresa nao selecionada', 'Selecione uma empresa para escolher o modelo do cardapio.')
      return
    }

    const availableModels =
      menuModels.length > 0 || isLoadingMenuModels ? menuModels : await loadMenuModels()

    if (!isLoadingMenuModels && availableModels.length === 0) {
      Alert.alert(
        'Nenhum modelo encontrado',
        'Cadastre um modelo com contexto menu para a empresa selecionada.',
      )
      return
    }

    setShowMenuModelModal(true)
  }, [currentCompany?.id, isLoadingMenuModels, loadMenuModels, menuModels])

  React.useEffect(() => {
    let isMounted = true

    if (!currentCompany?.id || normalizedProductSearchText.length < 2) {
      setProductSearchResults([])
      setProductSearchLoading(false)
      return undefined
    }

    setProductSearchLoading(true)

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchCompanyProducts({
          companyId: currentCompany.id,
          query: normalizedProductSearchText,
          itemsPerPage: 8,
        })

        if (isMounted) {
          setProductSearchResults(Array.isArray(results) ? results : [])
        }
      } catch {
        if (isMounted) {
          setProductSearchResults([])
        }
      } finally {
        if (isMounted) {
          setProductSearchLoading(false)
        }
      }
    }, 180)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [currentCompany?.id, normalizedProductSearchText])

  const downloadCatalog = useCallback(async () => {
    if (isDownloadingCatalog) {
      return
    }

    if (!currentCompany?.id) {
      Alert.alert('Empresa nao selecionada', 'Selecione uma empresa para baixar o cardapio.')
      return
    }

    const availableModels = menuModels.length > 0 ? menuModels : await loadMenuModels()
    const modelIri =
      selectedMenuModel && availableModels.some(model => model?.['@id'] === selectedMenuModel)
        ? selectedMenuModel
        : availableModels[0]?.['@id'] || ''

    if (!modelIri) {
      Alert.alert(
        'Nenhum modelo encontrado',
        'Cadastre um modelo com contexto menu para a empresa selecionada antes de baixar o cardapio.',
      )
      return
    }

    setIsDownloadingCatalog(true)

    try {
      const downloadResult = await downloadCompanyMenuCatalog({
        companyId: currentCompany.id,
        companyName:
          currentCompany?.alias || currentCompany?.name || slugifyFileName(currentCompany?.id),
        modelReference: modelIri,
      })

      if (downloadResult?.savedUri && !downloadResult?.shared && Platform.OS !== 'web') {
        Alert.alert('Cardapio salvo', `Arquivo salvo em ${downloadResult.savedUri}`)
      }
    } catch (error) {
      Alert.alert(
        'Erro ao baixar cardapio',
        error?.message || 'Nao foi possivel gerar o cardapio em PDF.',
      )
    } finally {
      setIsDownloadingCatalog(false)
    }
  }, [
    currentCompany?.alias,
    currentCompany?.id,
    currentCompany?.name,
    interactionMode,
    isDownloadingCatalog,
    loadMenuModels,
    menuModels,
    selectedMenuModel,
  ])

  const downloadNormalizedCatalog = useCallback(async () => {
    if (isDownloadingNormalizedCatalog) {
      return
    }

    if (!currentCompany?.id) {
      Alert.alert(
        'Empresa nao selecionada',
        'Selecione uma empresa para exportar o CSV normalizado.',
      )
      return
    }

    setIsDownloadingNormalizedCatalog(true)

    try {
      const downloadResult = await downloadCompanyNormalizedCatalog({
        companyId: currentCompany.id,
        companyName:
          currentCompany?.alias || currentCompany?.name || slugifyFileName(currentCompany?.id),
        context,
      })

      if (downloadResult?.savedUri && !downloadResult?.shared && Platform.OS !== 'web') {
        Alert.alert('CSV salvo', `Arquivo salvo em ${downloadResult.savedUri}`)
      }
    } catch (error) {
      Alert.alert(
        'Erro ao exportar CSV',
        error?.message || 'Nao foi possivel gerar o CSV normalizado.',
      )
    } finally {
      setIsDownloadingNormalizedCatalog(false)
    }
  }, [
    context,
    currentCompany?.alias,
    currentCompany?.id,
    currentCompany?.name,
    isDownloadingNormalizedCatalog,
  ])

  const openIntegrationsPage = useCallback(() => {
    navigation.navigate('IntegrationsPage')
  }, [navigation])

  const handleSyncAllEligible = useCallback(async () => {
    try {
      await syncAllEligible()
    } catch (error) {
      Alert.alert(
        'Sincronizacao nao concluida',
        error?.message || 'Nao foi possivel sincronizar os produtos elegiveis.',
      )
    }
  }, [syncAllEligible])

  const handleMarketplaceSync = useCallback(
    async (platformKey, status, syncKey) => {
      try {
        await syncEntity(platformKey, status, { syncKey })
      } catch (error) {
        Alert.alert(
          'Sincronizacao nao concluida',
          error?.message || 'Nao foi possivel sincronizar este item.',
        )
        throw error
      }
    },
    [syncEntity],
  )

  const getColumns = () => {
    if (width < 640) return 2
    if (width < 960) return 3
    if (width < 1280) return 4
    return 5
  }

  const columns = getColumns()
  const maxContentWidth = 1600
  const containerWidth = Math.min(width, maxContentWidth)
  const isCompactMobile = width < 360
  const gap = isCompactMobile ? 8 : 12
  const cardWidth = (containerWidth - (columns + 1) * gap) / columns
  const scrollBottomPadding = isManagerApp
    ? 84
    : interactionMode === 'pdv'
      ? (isCompactMobile ? 148 : 164)
      : 0

  const { styles: orderStyles } = css()
  const modalTitle = selectedCategory ? labels.editCategoryLabel : labels.newCategoryLabel
  const skeletonCount = columns * 3

  return (
    <SafeAreaView style={[orderStyles.container, styles.container]}>
      {!storeLoading && <StateStore store="categories" />}
      <View
        style={[
          styles.searchStickyShell,
          isCompactMobile && styles.searchStickyShellCompact,
        ]}
      >
        <View
          style={[
            inlineStyle_424_14({
              containerWidth: containerWidth,
              gap: gap,
            }),
            {
              paddingTop: isCompactMobile ? 8 : 16,
              paddingBottom: isCompactMobile ? 8 : 0,
            },
          ]}
        >
          <View
            style={[
              styles.searchSection,
              isCompactMobile && styles.searchSectionCompact,
            ]}
          >
            <View
              style={[
                styles.searchInputWrap,
                isCompactMobile && styles.searchInputWrapCompact,
              ]}
            >
              <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
              <TextInput
                value={productSearchText}
                onChangeText={setProductSearchText}
                onSubmitEditing={() => openProductSearchResults(productSearchText)}
                placeholder={labels.searchPlaceholder}
                placeholderTextColor="#94A3B8"
                style={[
                  styles.searchInput,
                  isCompactMobile && styles.searchInputCompact,
                ]}
                returnKeyType="search"
              />
              {productSearchLoading && (
                <ActivityIndicator size="small" color={brandColors.primary} />
              )}
            </View>
            {normalizedProductSearchText.length >= 2 && (
              <View style={styles.searchSuggestionList}>
                {productSearchResults.map(product => (
                  <TouchableOpacity
                    key={product?.id || product?.['@id']}
                    style={[
                      styles.searchSuggestionItem,
                      isCompactMobile && styles.searchSuggestionItemCompact,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleAutocompleteProductSelect(product)}
                  >
                    <View style={styles.searchSuggestionCopy}>
                      <Text
                        style={[
                          styles.searchSuggestionTitle,
                          isCompactMobile && styles.searchSuggestionTitleCompact,
                        ]}
                        numberOfLines={1}
                      >
                        {product?.product || 'Produto sem nome'}
                      </Text>
                      <Text
                        style={[
                          styles.searchSuggestionMeta,
                          isCompactMobile && styles.searchSuggestionMetaCompact,
                        ]}
                        numberOfLines={1}
                      >
                        {[product?.sku ? `SKU ${product.sku}` : '', product?.description || '']
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                ))}
                {!productSearchLoading && productSearchResults.length === 0 && (
                  <TouchableOpacity
                    style={[
                      styles.searchSuggestionItem,
                      isCompactMobile && styles.searchSuggestionItemCompact,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => openProductSearchResults(productSearchText)}
                  >
                    <View style={styles.searchSuggestionCopy}>
                      <Text
                        style={[
                          styles.searchSuggestionTitle,
                          isCompactMobile && styles.searchSuggestionTitleCompact,
                        ]}
                        numberOfLines={1}
                      >
                        Ver produtos para "{normalizedProductSearchText}"
                      </Text>
                      <Text
                        style={[
                          styles.searchSuggestionMeta,
                          isCompactMobile && styles.searchSuggestionMetaCompact,
                        ]}
                        numberOfLines={1}
                      >
                        Abrir lista filtrada.
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
      >
        <View
          style={[
            inlineStyle_424_14({
              containerWidth: containerWidth,
              gap: gap,
            }),
            { paddingTop: isCompactMobile ? 10 : 16 },
          ]}
        >
          {isManagerApp && (
            <>
              <Modal
                visible={showImportModal}
                animationType="slide"
                transparent={false}
              >
                <ImportsPage
                  context={{
                    "context": "product",
                    "title": "Importação de Produtos",
                    "searchPlaceholder": "Buscar importações de produtos..."
                  }}
                  onClose={() => setShowImportModal(false)}
                />
              </Modal>
              <Modal
                visible={showMenuModelModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowMenuModelModal(false)}
              >
                <View style={styles.pickerModalOverlay}>
                  <View style={styles.pickerModalContent}>
                    <View style={styles.pickerModalHeader}>
                      <Text style={styles.pickerModalTitle}>Selecionar modelo do cardapio</Text>
                      <TouchableOpacity
                        onPress={() => setShowMenuModelModal(false)}
                        style={styles.pickerModalClose}
                      >
                        <MaterialCommunityIcons name="close" size={20} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.pickerModalBody}>
                      {isLoadingMenuModels ? (
                        <View style={styles.pickerState}>
                          <ActivityIndicator size="small" color={brandColors.primary} />
                          <Text style={styles.pickerStateText}>Carregando modelos...</Text>
                        </View>
                      ) : menuModels.length > 0 ? (
                        menuModels.map(model => {
                          const isSelected = model?.['@id'] === selectedMenuModel

                          return (
                            <TouchableOpacity
                              key={model?.['@id'] || model?.id}
                              style={[
                                styles.modelOption,
                                isSelected && styles.modelOptionSelected,
                              ]}
                              activeOpacity={0.85}
                              onPress={() => {
                                setSelectedMenuModel(model?.['@id'] || '')
                                setShowMenuModelModal(false)
                              }}
                            >
                              <View style={styles.modelOptionCopy}>
                                <Text
                                  style={[
                                    styles.modelOptionTitle,
                                    isSelected && styles.modelOptionTitleSelected,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {model?.model || 'Modelo sem nome'}
                                </Text>
                                <Text style={styles.modelOptionSubtitle}>
                                  Contexto: menu
                                </Text>
                              </View>
                              {isSelected ? (
                                <MaterialCommunityIcons
                                  name="check-circle"
                                  size={22}
                                  color={brandColors.primary}
                                />
                              ) : (
                                <MaterialCommunityIcons
                                  name="radiobox-blank"
                                  size={22}
                                  color="#CBD5E1"
                                />
                              )}
                            </TouchableOpacity>
                          )
                        })
                      ) : (
                        <View style={styles.pickerState}>
                          <MaterialCommunityIcons
                            name="file-document-outline"
                            size={36}
                            color="#CBD5E1"
                          />
                          <Text style={styles.pickerStateText}>
                            Nenhum modelo de cardapio encontrado para esta empresa.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
              <View style={styles.topActionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.importButton]}
                  onPress={openImport}
                  activeOpacity={0.85}
                >
                  <Icon name="file-excel-o" size={18} color="#2E7D32" />
                  <Text style={[styles.actionButtonText, styles.importButtonText]}>
                    Importar CSV
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.modelButton]}
                  onPress={openMenuModelPicker}
                  activeOpacity={0.85}
                  disabled={!currentCompany?.id}
                >
                  {isLoadingMenuModels ? (
                    <ActivityIndicator size="small" color="#7C3AED" />
                  ) : (
                    <MaterialCommunityIcons name="file-document-edit-outline" size={18} color="#7C3AED" />
                  )}
                  <View style={styles.modelButtonCopy}>
                    <Text style={styles.modelButtonLabel}>Modelo</Text>
                    <Text style={styles.modelButtonValue} numberOfLines={1}>
                      {selectedMenuModelLabel}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.integrationButton]}
                  onPress={openIntegrationsPage}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="cloud-sync-outline" size={18} color="#0369A1" />
                  <Text style={[styles.actionButtonText, styles.integrationButtonText]}>
                    Sincronias
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.syncEligibleButton,
                    (!hasActivePlatforms || marketplaceSyncingKey === 'all') && styles.disabledActionButton,
                  ]}
                  onPress={handleSyncAllEligible}
                  activeOpacity={0.85}
                  disabled={!hasActivePlatforms || marketplaceSyncingKey === 'all'}
                >
                  {marketplaceSyncingKey === 'all' ? (
                    <ActivityIndicator size="small" color="#047857" />
                  ) : (
                    <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#047857" />
                  )}
                  <Text style={[styles.actionButtonText, styles.syncEligibleButtonText]}>
                    {marketplaceSyncingKey === 'all' ? 'Sincronizando...' : 'Sincronizar todos os elegiveis'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.normalizedCatalogButton,
                    (isDownloadingNormalizedCatalog || !currentCompany?.id) && styles.disabledActionButton,
                  ]}
                  onPress={downloadNormalizedCatalog}
                  activeOpacity={0.85}
                  disabled={isDownloadingNormalizedCatalog || !currentCompany?.id}
                >
                  {isDownloadingNormalizedCatalog ? (
                    <ActivityIndicator size="small" color="#9A3412" />
                  ) : (
                    <MaterialCommunityIcons name="file-download-outline" size={18} color="#9A3412" />
                  )}
                  <Text style={[styles.actionButtonText, styles.normalizedCatalogButtonText]}>
                    {isDownloadingNormalizedCatalog ? 'Exportando...' : 'Exportar CSV'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.catalogButton,
                    { backgroundColor: brandColors.primary, borderColor: brandColors.primary },
                    (isDownloadingCatalog || !currentCompany?.id) && styles.disabledActionButton,
                  ]}
                  onPress={downloadCatalog}
                  activeOpacity={0.85}
                  disabled={isDownloadingCatalog || !currentCompany?.id}
                >
                  {isDownloadingCatalog ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="file-download-outline" size={18} color="#fff" />
                  )}
                  <Text style={[styles.actionButtonText, styles.catalogButtonText]}>
                    {isDownloadingCatalog ? 'Baixando...' : 'Baixar cardapio'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {/* Skeleton loading */}
          {storeLoading && (
            <View style={[styles.grid, { gap }]}>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} width={cardWidth} />
              ))}
            </View>
          )}

          {/* Empty state */}
          {!storeLoading && items.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="tag-off-outline" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>{labels.emptyTitle}</Text>
              <Text style={styles.emptySubtitle}>
                {isManagerApp
                  ? labels.emptySubtitleManager
                  : `Nenhuma ${labels.categorySingular} disponível no momento`}
              </Text>
            </View>
          )}

          {/* Grid */}
          {!storeLoading && (
            <>
              {items.length > 0 && (
                <Text
                  style={[
                    styles.countLabel,
                    isCompactMobile && styles.countLabelCompact,
                  ]}
                >
                  {items.length} {items.length === 1 ? labels.countSingular : labels.countPlural}
                </Text>
              )}

              <View style={[styles.grid, { gap }]}>
                {/* Card fixo "Sem Categoria" — sempre exibido */}
                <View style={inlineStyle_617_22({
                  cardWidth: cardWidth,
                })}>
                  <TouchableOpacity
                    style={styles.cardTouchable}
                    onPress={() => changeCategory(ALL_PRODUCTS_SENTINEL)}
                    activeOpacity={0.88}
                  >
                    <View
                      style={[
                        styles.noCategoryCard,
                        isCompactMobile && styles.noCategoryCardCompact,
                        { aspectRatio: 3 / 4 },
                      ]}
                    >
                      <MaterialCommunityIcons name="tag-off-outline" size={32} color="#94A3B8" />
                      <Text
                        style={[
                          styles.noCategoryName,
                          isCompactMobile && styles.noCategoryNameCompact,
                        ]}
                      >
                        {labels.allLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {items.map(category => (
                  <View key={category.id} style={inlineStyle_631_42({
                    cardWidth: cardWidth,
                  })}>
                    <TouchableOpacity
                      style={styles.cardTouchable}
                      onPress={() => changeCategory(category)}
                      activeOpacity={0.88}
                    >
                      <View
                        style={[
                          styles.cardImage,
                          isCompactMobile && styles.cardImageCompact,
                          { backgroundColor: category.color || '#CBD5E1' },
                        ]}
                      >
                        {!!buildCoverUrl(category.categoryFiles, category?.extraData?.imageCoverRelationId) ? (
                          <Image
                            source={{ uri: buildCoverUrl(category.categoryFiles, category?.extraData?.imageCoverRelationId) }}
                            style={styles.cardCoverImage}
                            resizeMode="cover"
                          />
                        ) : null}

                        <View
                          style={[
                            styles.cardOverlay,
                            isCompactMobile && styles.cardOverlayCompact,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardOverlayName,
                              isCompactMobile && styles.cardOverlayNameCompact,
                            ]}
                            numberOfLines={2}
                          >
                            {category.name}
                          </Text>
                        </View>

                        {isManagerApp && (
                          <View style={styles.syncOverlay}>
                            <MarketplaceSyncIndicators
                              entityLabel={category.name}
                              entityType="category"
                              statuses={getCategoryStatuses(category)}
                              onSync={handleMarketplaceSync}
                              syncingKey={marketplaceSyncingKey}
                            />
                          </View>
                        )}

                        {isManagerApp && (
                          <TouchableOpacity
                            onPress={() => openEditModal(category)}
                            style={styles.editOverlay}
                            activeOpacity={0.75}
                          >
                            <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      {isManagerApp && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBarButton, { backgroundColor: brandColors.primary }]}
            onPress={openCreateModal}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.bottomBarButtonText}>{labels.addCategoryLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
      <AnimatedModal
        visible={modalVisible}
        onRequestClose={closeModal}
        style={inlineStyle_692_8}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.headerCloseButton}>
              <MaterialCommunityIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              <CategoryForm
                context={context}
                ref={formRef}
                category={selectedCategory}
                onClose={closeModal}
                onSaved={saved => {
                  setSelectedCategory(saved || null)
                  loadCatalogStatus().catch(() => {})
                }}
              />

              {selectedCategory?.id && (
                <View style={styles.attachmentSection}>
                  <AttachmentManager
                    entityType="category"
                    entityId={selectedCategory.id}
                    attachments={selectedCategory.categoryFiles || []}
                    companyId={currentCompany?.id}
                    context="products-category"
                    coverRelationId={selectedCategory?.extraData?.imageCoverRelationId}
                    onChanged={refreshSelectedCategory}
                    onCoverChanged={saveCategoryCover}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={closeModal}>
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: brandColors.primary }]}
              onPress={() => formRef.current?.submit()}
            >
              <Text style={styles.modalSaveButtonText}>
                {selectedCategory ? 'Salvar' : 'Criar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </SafeAreaView>
  );
}

export default CategoriesPage
