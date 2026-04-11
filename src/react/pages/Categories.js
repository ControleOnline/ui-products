import React, { useCallback, useState, useMemo, useRef } from 'react'
import {
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useStore } from '@store'
import { SafeAreaView } from 'react-native-safe-area-context'
import css from '@controleonline/ui-orders/src/react/css/orders'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { env } from '@env'
import CategoryForm from '@controleonline/ui-common/src/react/components/CategoryForm'
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager'
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal'
import { api } from '@controleonline/ui-common/src/api'
import { resolveAppDomain } from '@controleonline/ui-common/src/utils/appDomain'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { resolveThemePalette } from '@controleonline/../../src/styles/branding'
import { colors } from '@controleonline/../../src/styles/colors'
import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import Icon from 'react-native-vector-icons/FontAwesome'

const buildCoverUrl = (files, coverRelationId) => {
  const arr = files || []
  let first = null
  if (coverRelationId) {
    first = arr.find(item => String(item?.id) === String(coverRelationId) && item?.file?.id)
  }
  if (!first) first = arr.find(item => item?.file?.id)
  if (!first) return null
  const host = env.DOMAIN || (typeof location !== 'undefined' ? location.host : '')
  return `${env.API_ENTRYPOINT}/files/${first.file.id}/download?app-domain=${encodeURIComponent(host)}`
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

const extractFilenameFromDisposition = value => {
  const utf8Match = String(value || '').match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).trim()
  }

  const fallbackMatch = String(value || '').match(/filename="?([^";]+)"?/i)
  return fallbackMatch?.[1]?.trim() || null
}

const extractDownloadErrorMessage = async response => {
  const fallback = 'Nao foi possivel baixar o cardapio.'

  try {
    const payload = await response.text()
    if (!payload) {
      return fallback
    }

    try {
      const parsed = JSON.parse(payload)
      return parsed?.error || parsed?.description || parsed?.message || fallback
    } catch (error) {
      return payload
    }
  } catch (error) {
    return fallback
  }
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
  <View style={{ width }}>
    <View style={[skeletonStyles.card, { aspectRatio: 3 / 4 }]} />
  </View>
)

const CategoriesPage = () => {
  const [showImportModal, setShowImportModal] = useState(false)
  const [isDownloadingCatalog, setIsDownloadingCatalog] = useState(false)
  const [isLoadingMenuModels, setIsLoadingMenuModels] = useState(false)
  const [showMenuModelModal, setShowMenuModelModal] = useState(false)
  const [menuModels, setMenuModels] = useState([])
  const [selectedMenuModel, setSelectedMenuModel] = useState('')
  const navigation = useNavigation()
  const { width } = useWindowDimensions()

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
    } catch (error) {
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
      const cached = JSON.parse(localStorage.getItem('categories') || '[]')
      if (cached.length > 0) {
        categoryActions.setItems(cached)
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
            localStorage.setItem('categories', JSON.stringify(data || []))
          })

        loadMenuModels()
      }
    }, [currentCompany?.id, categoryActions, loadMenuModels])
  )

  const changeCategory = category => {
    navigation.navigate('ProductsPage', { category, context })
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
    localStorage.setItem('categories', JSON.stringify(data || []))
    return data || []
  }, [currentCompany?.id, categoryActions])

  const selectedMenuModelLabel = useMemo(() => {
    if (isLoadingMenuModels) {
      return 'Carregando modelo'
    }

    return menuModels.find(model => model?.['@id'] === selectedMenuModel)?.model || 'Selecionar modelo'
  }, [isLoadingMenuModels, menuModels, selectedMenuModel])

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

    const apiEntrypoint = String(env.API_ENTRYPOINT || '').replace(/\/$/, '')
    if (!apiEntrypoint) {
      Alert.alert('Configuracao invalida', 'API_ENTRYPOINT nao configurado.')
      return
    }

    const baseFileName = `cardapio-${slugifyFileName(
      currentCompany?.alias || currentCompany?.name || currentCompany?.id,
    )}.pdf`

    const headers = {
      Accept: 'application/pdf',
      'App-Domain': resolveAppDomain(env.DOMAIN),
    }

    const token = await api.getToken()
    if (token) {
      headers['API-TOKEN'] = token
    }

    setIsDownloadingCatalog(true)

    try {
      const response = await fetch(
        `${apiEntrypoint}/products/menu/download?company=${encodeURIComponent(String(currentCompany.id))}&model=${encodeURIComponent(modelIri)}`,
        {
          method: 'GET',
          headers,
        },
      )

      if (!response.ok) {
        throw new Error(await extractDownloadErrorMessage(response))
      }

      const fileName =
        extractFilenameFromDisposition(response.headers.get('content-disposition')) ||
        baseFileName
      const blob = await response.blob()

      if (Platform.OS === 'web') {
        const objectUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = fileName
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
        return
      }

      const file = new File(Paths.cache, fileName)
      file.create({ intermediates: true, overwrite: true })
      file.write(new Uint8Array(await blob.arrayBuffer()))

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar cardapio',
        })
      } else {
        Alert.alert('Cardapio salvo', `Arquivo salvo em ${file.uri}`)
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
          env.APP_TYPE === 'MANAGER' && { paddingBottom: 84 },
        ]}
      >
        <View style={{ width: containerWidth, paddingHorizontal: gap / 2, paddingTop: 16, paddingBottom: 0 }}>
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
                {env.APP_TYPE === 'MANAGER'
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
                <View style={{ width: cardWidth }}>
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
                  <View key={category.id} style={{ width: cardWidth }}>
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

                        {env.APP_TYPE === 'MANAGER' && (
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

      {env.APP_TYPE === 'MANAGER' && (
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
        style={{ justifyContent: 'flex-end' }}
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
  )
}

const skeletonStyles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
})

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
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  topActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 180,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  importButton: {
    backgroundColor: '#fff',
    borderColor: '#BBF7D0',
  },
  importButtonText: {
    color: '#166534',
  },
  modelButton: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    justifyContent: 'flex-start',
  },
  modelButtonCopy: {
    flex: 1,
  },
  modelButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modelButtonValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4C1D95',
  },
  catalogButton: {
    borderColor: '#0F172A',
  },
  catalogButtonText: {
    color: '#fff',
  },
  disabledActionButton: {
    opacity: 0.6,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    minHeight: 240,
    paddingBottom: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    paddingRight: 12,
  },
  pickerModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerModalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pickerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 10,
  },
  pickerStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  modelOptionSelected: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  modelOptionCopy: {
    flex: 1,
  },
  modelOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modelOptionTitleSelected: {
    color: '#5B21B6',
  },
  modelOptionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },

  cardTouchable: {
    width: '100%',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' },
    }),
  },

  cardCoverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 48,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
      },
      default: {
        backgroundColor: 'rgba(0,0,0,0.45)',
      },
    }),
  },
  cardOverlayName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  editOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── card sem categoria ─── */
  noCategoryCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noCategoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },


  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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

  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalBody: {
    padding: 24,
  },
  attachmentSection: {
    marginTop: 18,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})

export default CategoriesPage
