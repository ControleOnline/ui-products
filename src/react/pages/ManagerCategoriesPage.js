import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import {
  humanizeCategoryContext,
  normalizeCategoryContext,
} from '@controleonline/ui-common/src/react/utils/categoryContexts';
import styles from './ManagerCategoriesPage.styles';
import ManagerCategoryParentPicker from './ManagerCategoryParentPicker';
import ManagerCategoryFormModal from './ManagerCategoryFormModal';
import {
  COLOR_PRESETS,
  cardShadow,
  normalizeEntityId,
  buildCompanyIri,
  buildCategoryIri,
  sortContextValues,
} from './managerCategoriesHelpers';

export default function ManagerCategoriesPage({ route }) {
  const categoriesStore = useStore('categories');
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const messageApi = useMessage() || {};

  const categoryActions = categoriesStore.actions;
  const { items: storeCategories = [], columns } = categoriesStore.getters;
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const palette = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [selectedContext, setSelectedContext] = useState('all');
  const [formVisible, setFormVisible] = useState(false);
  const [parentPickerVisible, setParentPickerVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formName, setFormName] = useState('');
  const [formContext, setFormContext] = useState('');
  const [isFormContextLocked, setIsFormContextLocked] = useState(false);
  const [formColor, setFormColor] = useState(COLOR_PRESETS[5]);
  const [formIcon, setFormIcon] = useState('');
  const [formParentId, setFormParentId] = useState(null);

  const safeCategories = useMemo(
    () => (Array.isArray(storeCategories) ? storeCategories : []),
    [storeCategories],
  );

  const currentCompanyIri = useMemo(
    () => buildCompanyIri(currentCompany?.id || currentCompany?.['@id']),
    [currentCompany?.id, currentCompany?.['@id']],
  );

  const requestParams = useMemo(() => {
    if (!currentCompanyIri) return {};
    const params = {
      company: currentCompanyIri,
      'order[sortOrder]': 'ASC',
      'order[name]': 'ASC',
    };
    if (selectedContext && selectedContext !== 'all') {
      params.context = selectedContext;
    }
    return params;
  }, [currentCompanyIri, selectedContext]);

  const loadCategories = useCallback(async () => {
    if (!currentCompanyIri) {
      return [];
    }
    return categoryActions.getItems(requestParams);
  }, [categoryActions, currentCompanyIri, requestParams]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  const allContexts = useMemo(() => {
    const contextsFromDatabase = safeCategories
      .map(category => normalizeCategoryContext(category?.context))
      .filter(Boolean);
    const routePresetContext = normalizeCategoryContext(route?.params?.presetContext);
    const currentFormContext = normalizeCategoryContext(formContext);
    return sortContextValues(
      Array.from(
        new Set(
          [...contextsFromDatabase, routePresetContext, currentFormContext].filter(Boolean),
        ),
      ),
      humanizeCategoryContext,
    );
  }, [safeCategories, route?.params?.presetContext, formContext]);

  const parentOptions = useMemo(() => {
    const currentContext = normalizeCategoryContext(formContext);
    const editingId = normalizeEntityId(editingCategory?.id || editingCategory?.['@id']);
    return safeCategories.filter(category => {
      const categoryId = normalizeEntityId(category?.id || category?.['@id']);
      if (editingId && categoryId === editingId) {
        return false;
      }
      return normalizeCategoryContext(category?.context) === currentContext;
    });
  }, [editingCategory?.['@id'], editingCategory?.id, formContext, safeCategories]);

  const selectedParent = useMemo(
    () =>
      safeCategories.find(
        category =>
          normalizeEntityId(category?.id || category?.['@id']) ===
          normalizeEntityId(formParentId),
      ) || null,
    [formParentId, safeCategories],
  );

  const openCreateModal = useCallback(
    (presetContext, options = {}) => {
      const normalizedPresetContext =
        normalizeCategoryContext(presetContext) ||
        (selectedContext !== 'all' ? selectedContext : '');
      setEditingCategory(null);
      setFormName('');
      setFormContext(normalizedPresetContext);
      setIsFormContextLocked(Boolean(options.lockContext && normalizedPresetContext));
      setFormColor(COLOR_PRESETS[5]);
      setFormIcon('');
      setFormParentId(null);
      setFormVisible(true);
    },
    [selectedContext],
  );

  const openEditModal = useCallback(category => {
    setEditingCategory(category);
    setFormName(category?.name || '');
    setFormContext(normalizeCategoryContext(category?.context) || '');
    setIsFormContextLocked(false);
    setFormColor(category?.color || COLOR_PRESETS[5]);
    setFormIcon(category?.icon || '');
    setFormParentId(normalizeEntityId(category?.parent?.id || category?.parent) || null);
    setFormVisible(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setFormVisible(false);
    setParentPickerVisible(false);
  }, []);

  const handleSaveCategory = useCallback(async () => {
    const normalizedName = String(formName || '').trim();
    const normalizedContext = normalizeCategoryContext(formContext);
    if (!normalizedName) {
      messageApi.showError?.('Informe o nome da categoria.');
      return;
    }
    if (!normalizedContext) {
      messageApi.showError?.('Informe o contexto da categoria.');
      return;
    }
    if (!currentCompanyIri) {
      messageApi.showError?.('Selecione uma empresa antes de salvar categorias.');
      return;
    }
    setIsSubmitting(true);
    try {
      await categoryActions.save({
        ...(editingCategory?.id ? { id: editingCategory.id } : {}),
        name: normalizedName,
        context: normalizedContext,
        color: String(formColor || '').trim() || null,
        icon: String(formIcon || '').trim() || null,
        company: currentCompanyIri,
        parent: buildCategoryIri(formParentId) || null,
      });
      await loadCategories();
      setSelectedContext(normalizedContext);
      closeFormModal();
      messageApi.showSuccess?.(
        editingCategory?.id ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.',
      );
    } catch (error) {
      messageApi.showError?.(
        error?.message || error?.description || 'Nao foi possivel salvar a categoria.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    categoryActions,
    closeFormModal,
    currentCompanyIri,
    editingCategory?.id,
    formColor,
    formContext,
    formIcon,
    formName,
    formParentId,
    loadCategories,
    messageApi,
  ]);

  const handleDeleteCategory = useCallback(async () => {
    const categoryId = normalizeEntityId(deleteTarget?.id);
    if (!categoryId) {
      setDeleteTarget(null);
      return;
    }
    setIsSubmitting(true);
    try {
      await categoryActions.remove(categoryId);
      await loadCategories();
      setDeleteTarget(null);
      messageApi.showSuccess?.('Categoria removida com sucesso.');
    } catch (error) {
      messageApi.showError?.(
        error?.message || error?.description || 'Nao foi possivel remover a categoria.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [categoryActions, deleteTarget?.id, loadCategories, messageApi]);

  const renderCategoryCard = useCallback(
    ({ item: category }) => {
      if (!category) return null;
      const categoryId = normalizeEntityId(category?.id || category?.['@id']);
      return (
        <View>
          <View style={styles.categoryCardTop}>
            <View
              style={[styles.colorDot, { backgroundColor: category?.color || '#CBD5E1' }]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryName}>{category?.name}</Text>
              <View
                style={[
                  styles.contextBadge,
                  { backgroundColor: withOpacity(palette.primary, 0.1) },
                ]}>
                <Text style={[styles.contextBadgeText, { color: palette.primary }]}>
                  {humanizeCategoryContext(category?.context) ||
                    String(category?.context || 'Sem contexto')}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.categoryCardBottom}>
            <Text style={styles.categoryMeta}>
              {category?.icon ? `Icone: ${category.icon}` : 'Sem icone'}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={() => openEditModal(category)}>
                <Icon name="edit-2" size={16} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cardActionButton, styles.cardActionDanger]}
                onPress={() =>
                  setDeleteTarget({
                    id: categoryId,
                    label: category?.name || 'Categoria',
                  })
                }>
                <Icon name="trash-2" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [openEditModal, palette.primary],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Categorias</Text>
          <Text style={styles.headerSubtitle}>
            Edite as categorias da tabela `category` e filtre por nome ou contexto.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: palette.primary }]}
          onPress={() => openCreateModal()}>
          <Icon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filterCard, cardShadow]}>
        <Text style={styles.filterLabel}>Contextos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contextChipsRow}>
          <TouchableOpacity
            style={[
              styles.contextChip,
              selectedContext === 'all' && {
                backgroundColor: palette.primary,
                borderColor: palette.primary,
              },
            ]}
            onPress={() => setSelectedContext('all')}>
            <Text
              style={[
                styles.contextChipText,
                selectedContext === 'all' && { color: '#FFFFFF' },
              ]}>
              Todos
            </Text>
          </TouchableOpacity>
          {allContexts.map(contextValue => (
            <TouchableOpacity
              key={contextValue}
              style={[
                styles.contextChip,
                selectedContext === contextValue && {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              onPress={() => setSelectedContext(contextValue)}>
              <Text
                style={[
                  styles.contextChipText,
                  selectedContext === contextValue && { color: '#FFFFFF' },
                ]}>
                {humanizeCategoryContext(contextValue)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <DefaultTable
          key={`manager-categories-${selectedContext}-${currentCompanyIri}`}
          storeName="categories"
          requestParams={requestParams}
          columns={columns}
          initialViewMode="cards"
          forceCardsOnCompact
          add
          onAdd={() => openCreateModal()}
          onEditRow={openEditModal}
          onRowPress={openEditModal}
          showRowActions={false}
          renderCard={renderCategoryCard}
          searchProps={{
            compact: true,
            placeholder: 'Buscar categoria ou contexto...',
            searchKey: 'search',
            storeName: 'categories',
          }}
          totalItemsLabel="categories"
          visibleColumnsPreferenceKey={`manager-categories-${selectedContext}`}
          accentColor={palette.primary}
        />
      </View>

      <ManagerCategoryFormModal
        visible={formVisible}
        onClose={closeFormModal}
        editingCategory={editingCategory}
        formName={formName}
        setFormName={setFormName}
        formContext={formContext}
        setFormContext={setFormContext}
        isFormContextLocked={isFormContextLocked}
        formColor={formColor}
        setFormColor={setFormColor}
        formIcon={formIcon}
        setFormIcon={setFormIcon}
        selectedParent={selectedParent}
        onOpenParentPicker={() => setParentPickerVisible(true)}
        isSubmitting={isSubmitting}
        onSave={handleSaveCategory}
        palette={palette}
      />

      <ManagerCategoryParentPicker
        visible={parentPickerVisible}
        onClose={() => setParentPickerVisible(false)}
        categories={parentOptions}
        selectedParentId={formParentId}
        onSelect={id => {
          setFormParentId(id);
          setParentPickerVisible(false);
        }}
      />

      <Modal
        transparent
        visible={!!deleteTarget}
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}>
        <TouchableWithoutFeedback onPress={() => setDeleteTarget(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Confirmar exclusão</Text>
                <Text style={styles.deleteMsg}>
                  Deseja excluir <Text style={{ fontWeight: '700' }}>{deleteTarget?.label}</Text>?
                </Text>
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => setDeleteTarget(null)}>
                    <Text style={styles.btnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnSave, { backgroundColor: '#c10015' }]}
                    onPress={handleDeleteCategory}
                    disabled={isSubmitting}>
                    <Text style={styles.btnSaveText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
