import React, {useCallback, useState} from 'react'
import {useFocusEffect} from '@react-navigation/native'
import {useStore} from '@store'
import {normalizeEntityId} from './categoryPageUtils'
import {
  alertCatalogError, alertCatalogMessage, downloadMenuCatalogForCompany,
  downloadNormalizedCatalogForCompany, loadMenuModelsForCompany,
} from './categoryCatalogDownloads'

export default function useCategoryManagement({categoryActions, context, currentCompany,
  isManagerApp, items, loadCatalogStatus, navigation, reloadCategories, routeCategoryId}) {
  const [isDownloadingCatalog, setIsDownloadingCatalog] = useState(false)
  const [isDownloadingNormalizedCatalog, setIsDownloadingNormalizedCatalog] = useState(false)
  const [isLoadingMenuModels, setIsLoadingMenuModels] = useState(false)
  const [showMenuModelModal, setShowMenuModelModal] = useState(false)
  const [menuModels, setMenuModels] = useState([])
  const [selectedMenuModel, setSelectedMenuModel] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const modelActions = useStore('models').actions
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

  const refreshSelectedCategory = useCallback(async () => {
    const refreshed = await reloadCategories()
    const fresh = refreshed.find(category => String(category.id) === String(selectedCategory?.id))
    if (fresh) setSelectedCategory(fresh)
    return fresh
  }, [reloadCategories, selectedCategory?.id])

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

  return {
    isDownloadingCatalog, isDownloadingNormalizedCatalog, isLoadingMenuModels,
    showMenuModelModal, setShowMenuModelModal, menuModels, selectedMenuModel,
    setSelectedMenuModel, modalVisible, selectedCategory, setSelectedCategory,
    refreshSelectedCategory, closeModal, openCreateModal, openEditModal,
    openMenuModelPicker, downloadCatalog, downloadNormalizedCatalog, saveCategoryCover
  }
}
