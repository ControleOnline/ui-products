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
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager'
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal'
import {
  downloadMenuCatalog as downloadCompanyMenuCatalog,
} from '@controleonline/ui-common/src/react/utils/menuCatalogDownload'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { resolveThemePalette } from '@controleonline/../../src/styles/branding'
import { colors } from '@controleonline/../../src/styles/colors'
import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports'
import {searchCompanyProducts} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'

import {
  readCachedCategories,
  writeCachedCategories,
} from '@controleonline/ui-products/src/react/utils/categoryCache'

import Icon from 'react-native-vector-icons/FontAwesome'
import { skeletonStyles, styles } from './Categories.styles'

import {
  inlineStyle_104_8,
  inlineStyle_424_14,
  inlineStyle_617_22,
  inlineStyle_631_42,
  inlineStyle_692_8,
} from './Categories.styles';

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

/*
 * Sentinel para "Sem Categoria".
 * Não é uma categoria real — é um filtro especial que mostra produtos
 * sem nenhuma categoria vinculada.
 */
export const ALL_PRODUCTS_SENTINEL = {
  '@id': '__all_products__',
  name: 'Todos os produtos',
  _isAllProducts: true,
};

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
  const [isLoadingMenuModels, setIsLoadingMenuModels] = useState(false)
  const [showMenuModelModal, setShowMenuModelModal] = useState(false)
  const [menuModels, setMenuModels] = useState([])
  const [selectedMenuModel, setSelectedMenuModel] = useState('')
  const [productSearchText, setProductSearchText] = useState('')
  const [productSearchResults, setProductSearchResults] = useState([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const navigation = useNavigation()
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
  const context = 'products'

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
      const cached = readCachedCategories(currentCompany?.id)
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
            writeCachedCategories(currentCompany.id, data || [])
          })

        if (isManagerApp) {
          loadMenuModels()
        }
      }
    }, [currentCompany?.id, categoryActions, isManagerApp, loadMenuModels])
  )

  const changeCategory = category => {
    const categoryId =
      category?._isAllProducts || category?.['@id'] === ALL_PRODUCTS_SENTINEL['@id']
        ? ALL_PRODUCTS_SENTINEL['@id']
        : normalizeEntityId(category)

    categoryActions.setItem(category || {})
    navigation.navigate({
      name: 'ProductsPage',
      params: {
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
    setSelectedCategory(null)
    setModalVisible(true)
  }

  const openEditModal = category => {
    setSelectedCategory(category)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedCategory(null)
  }

  const reloadCategories = useCallback(async () => {
    if (!currentCompany?.id) return []
    const data = await categoryActions.getItems({
      context: context,
      'order[name]': 'ASC',
      company: currentCompany.id,
    })
    writeCachedCategories(currentCompany.id, data || [])
    return data || []
  }, [currentCompany?.id, categoryActions])

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
    [context, interactionMode, navigation],
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

  const getColumns = () => {
    if (width < 640) return 2
    if (width < 960) return 3
    if (width < 1280) return 4
    return 5
  }

  const columns = getColumns()
  const maxContentWidth = 1600
  const containerWidth = Math.min(width, maxContentWidth)
  const gap = 12
  const cardWidth = (containerWidth - (columns + 1) * gap) / columns

  const { styles: orderStyles } = css()
  const modalTitle = selectedCategory ? 'Editar Categoria' : 'Nova Categoria'
  const skeletonCount = columns * 3

  return (
    <SafeAreaView style={[orderStyles.container, styles.container]}>
      {!storeLoading && <StateStore store="categories" />}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isManagerApp && { paddingBottom: 84 },
        ]}
      >
        <View style={inlineStyle_424_14({
          containerWidth: containerWidth,
          gap: gap,
        })}>
          <View style={styles.searchSection}>
            <View style={styles.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
              <TextInput
                value={productSearchText}
                onChangeText={setProductSearchText}
                onSubmitEditing={() => openProductSearchResults(productSearchText)}
                placeholder="Buscar produto pelo nome ou SKU"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {productSearchLoading && (
                <ActivityIndicator size="small" color={brandColors.primary} />
              )}
            </View>
            <Text style={styles.searchHelperText}>
              A busca com auto-complete fica disponivel em todos os modos do PDV.
            </Text>
            {normalizedProductSearchText.length >= 2 && (
              <View style={styles.searchSuggestionList}>
                {productSearchResults.map(product => (
                  <TouchableOpacity
                    key={product?.id || product?.['@id']}
                    style={styles.searchSuggestionItem}
                    activeOpacity={0.85}
                    onPress={() =>
                      openProductSearchResults(
                        product?.product || product?.description || normalizedProductSearchText,
                      )
                    }
                  >
                    <View style={styles.searchSuggestionCopy}>
                      <Text style={styles.searchSuggestionTitle} numberOfLines={1}>
                        {product?.product || 'Produto sem nome'}
                      </Text>
                      <Text style={styles.searchSuggestionMeta} numberOfLines={1}>
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
                    style={styles.searchSuggestionItem}
                    activeOpacity={0.85}
                    onPress={() => openProductSearchResults(productSearchText)}
                  >
                    <View style={styles.searchSuggestionCopy}>
                      <Text style={styles.searchSuggestionTitle} numberOfLines={1}>
                        Buscar por "{normalizedProductSearchText}"
                      </Text>
                      <Text style={styles.searchSuggestionMeta} numberOfLines={1}>
                        Nenhum atalho encontrado. Abrir listagem filtrada.
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
              <Text style={styles.emptyTitle}>Nenhuma categoria</Text>
              <Text style={styles.emptySubtitle}>
                {isManagerApp
                  ? 'Adicione a primeira categoria para começar'
                  : 'Nenhuma categoria disponível no momento'}
              </Text>
            </View>
          )}

          {/* Grid */}
          {!storeLoading && (
            <>
              {items.length > 0 && (
                <Text style={styles.countLabel}>
                  {items.length} {items.length === 1 ? 'categoria' : 'categorias'}
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
                    <View style={[styles.noCategoryCard, { aspectRatio: 3 / 4 }]}>
                      <MaterialCommunityIcons name="tag-off-outline" size={32} color="#94A3B8" />
                      <Text style={styles.noCategoryName}>Todos</Text>
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

                        <View style={styles.cardOverlay}>
                          <Text style={styles.cardOverlayName} numberOfLines={2}>
                            {category.name}
                          </Text>
                        </View>

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
            <Text style={styles.bottomBarButtonText}>Adicionar Categoria</Text>
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
                onSaved={saved => setSelectedCategory(saved || null)}
              />

              {selectedCategory?.id && (
                <View style={styles.attachmentSection}>
                  <AttachmentManager
                    entityType="category"
                    entityId={selectedCategory.id}
                    attachments={selectedCategory.categoryFiles || []}
                    companyId={currentCompany?.id}
                    context={context}
                    onChanged={async () => {
                      const refreshed = await reloadCategories()
                      const fresh = refreshed.find(c => c.id === selectedCategory.id)
                      if (fresh) setSelectedCategory(fresh)
                    }}
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
