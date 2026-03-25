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
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { resolveThemePalette } from '@controleonline/../../src/styles/branding'
import { colors } from '@controleonline/../../src/styles/colors'
import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports';
import Icon from 'react-native-vector-icons/FontAwesome';

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

/*
 * Sentinel para "Sem Categoria".
 * Não é uma categoria real — é um filtro especial que mostra produtos
 * sem nenhuma categoria vinculada.
 */
export const NO_CATEGORY_SENTINEL = {
  id: '__no_category__',
  '@id': '__no_category__',
  name: 'Sem Categoria',
  _isNoCategory: true,
}

const SkeletonCard = ({ width }) => (
  <View style={{ width }}>
    <View style={[skeletonStyles.card, { aspectRatio: 3 / 4 }]} />
  </View>
)

const CategoriesPage = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const navigation = useNavigation()
  const { width } = useWindowDimensions()

  const categoriesStore = useStore('categories')
  const { items, isLoading: storeLoading } = categoriesStore.getters
  const categoryActions = categoriesStore.actions

  const peopleStore = useStore('people')
  const { currentCompany } = peopleStore.getters

  const themeStore = useStore('theme')
  const { colors: themeColors } = themeStore.getters
  const openImport = () => {
    setShowImportModal(true);
  };
  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  )

  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const formRef = useRef(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      const cached = JSON.parse(localStorage.getItem('categories') || '[]')
      if (cached.length > 0) {
        categoryActions.setItems(cached)
        setLoading(false)
      }
      if (currentCompany?.id) {
        categoryActions
          .getItems({
            context: 'products',
            'order[name]': 'ASC',
            company: currentCompany.id,
          })
          .then(data => {
            categoryActions.setItems(data || [])
            localStorage.setItem('categories', JSON.stringify(data || []))
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    }, [currentCompany?.id, categoryActions])
  )

  const changeCategory = category => {
    navigation.navigate('ProductsPage', { category })
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
      context: 'products',
      'order[name]': 'ASC',
      company: currentCompany.id,
    })
    localStorage.setItem('categories', JSON.stringify(data || []))
    return data || []
  }, [currentCompany?.id, categoryActions])

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
      {!loading && !storeLoading && <StateStore store="categories" />}

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
                "context": "products",
                "title": "Importação de Produtos",
                "searchPlaceholder": "Buscar importações de produtos..."
              }}
              onClose={() => setShowImportModal(false)}
            />
          </Modal>
          <TouchableOpacity
            style={styles.importButton}
            onPress={openImport}
          >
            <Icon name="file-excel-o" size={18} color="#2E7D32" />
          </TouchableOpacity>
          {/* Skeleton loading */}
          {loading && (
            <View style={[styles.grid, { gap }]}>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} width={cardWidth} />
              ))}
            </View>
          )}

          {/* Empty state */}
          {!loading && items.length === 0 && (
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
          {!loading && (
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
                    onPress={() => changeCategory(NO_CATEGORY_SENTINEL)}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.noCategoryCard, { aspectRatio: 3 / 4 }]}>
                      <MaterialCommunityIcons name="tag-off-outline" size={32} color="#94A3B8" />
                      <Text style={styles.noCategoryName}>Sem{'\n'}Categoria</Text>
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
                    context="products"
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
