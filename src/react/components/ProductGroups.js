import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import ProductGroupProducts from './ProductGroupProducts';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';
import styles from './ProductGroups.styles';

import {
  inlineStyle_78_8,
  inlineStyle_85_14,
  inlineStyle_87_16,
  inlineStyle_88_18,
  inlineStyle_89_18,
  inlineStyle_153_62,
  inlineStyle_166_94,
  inlineStyle_498_22,
  inlineStyle_540_20,
  inlineStyle_595_8,
  inlineStyle_602_12,
  inlineStyle_606_26,
} from './ProductGroups.styles';

import { inlineStyle_101_14 } from './ProductGroups.styles';

/*
 * Campos válidos de product_group (confirmados no banco):
 *  id, company_id, product_group, price_calculation,
 *  required, minimum, maximum, active, show_in_display, group_order
 * A associação produto ↔ grupo também é gravada em product_group_parent.
 *
 * Removidos por não existirem no banco:
 *  extraData, bomVersion, validFrom, validTo
 */

const PRICE_CALCULATION_OPTIONS = [
  { value: 'sum', label: 'Soma' },
  { value: 'average', label: 'Média' },
  { value: 'biggest', label: 'Maior' },
  { value: 'free', label: 'Brinde' },
];

const parseInteger = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
};

const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  if (Array.isArray(response?.member)) return response.member;
  return [];
};

const normalizeEntityId = value => {
  if (!value) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return String(value).replace(/\D/g, '');
  return String(value?.id || value?.['@id'] || '').replace(/\D/g, '');
};

const toProductIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/products/${id}` : null;
};

const toProductGroupIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/product_groups/${id}` : null;
};

const toPeopleIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/people/${id}` : null;
};

const isDuplicateError = error => {
  const raw = String(
    error?.response?.data?.['hydra:description'] ||
    error?.response?.data?.detail ||
    error?.message ||
    '',
  ).toLowerCase();
  return raw.includes('duplicate') || raw.includes('unique');
};

/* Normaliza apenas campos que existem na entidade */
const normalizeGroupDraft = group => ({
  productGroup: String(group?.productGroup || ''),
  required: Boolean(group?.required),
  showInDisplay: group?.id ? group?.showInDisplay !== false : false,
  minimum: String(group?.minimum ?? ''),
  maximum: String(group?.maximum ?? ''),
  groupOrder: String(group?.groupOrder ?? '0'),
  priceCalculation: String(group?.priceCalculation || 'sum'),
});

/* ─── Validação por campo ─── */
const validateGroupDraft = draft => {
  const errs = {};

  if (!String(draft.productGroup || '').trim()) {
    errs.productGroup = 'Nome obrigatório.';
  }

  const min = parseInteger(draft.minimum);
  const max = parseInteger(draft.maximum);

  if (draft.minimum !== '' && draft.minimum !== null) {
    if (min === null || min < 0) errs.minimum = 'Valor inválido (inteiro ≥ 0).';
  }
  if (draft.maximum !== '' && draft.maximum !== null) {
    if (max === null || max < 1) errs.maximum = 'Deve ser ≥ 1.';
  }
  if (min !== null && max !== null && min > max) {
    errs.maximum = 'Máximo deve ser maior que o mínimo.';
  }
  if (Boolean(draft.required) && (min === null || min < 1)) {
    errs.minimum = 'Grupo obrigatório requer mínimo ≥ 1.';
  }

  const order = parseInteger(draft.groupOrder);
  if (draft.groupOrder !== '' && order === null) {
    errs.groupOrder = 'Deve ser um número inteiro.';
  }

  return errs;
};

/* ─── Skeleton ─── */
const SkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={inlineStyle_78_8({
    height: height,
    mb: mb,
    width: width,
  })} />
);

const GroupTabSkeleton = () => (
  <ScrollView contentContainerStyle={inlineStyle_101_14} showsVerticalScrollIndicator={false}>
    {[1, 2].map(i => (
      <View key={i} style={styles.card}>
        <View style={inlineStyle_85_14}>
          <SkeletonLine width="50%" height={14} mb={0} />
          <View style={inlineStyle_87_16}>
            <View style={inlineStyle_88_18} />
            <View style={inlineStyle_89_18} />
          </View>
        </View>
      </View>
    ))}
  </ScrollView>
);

/* ─── SelectField ─── */
const SelectField = ({ label, value, options, onSelect, brandColors }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.selectBtnText}>{selected ? selected.label : 'Selecionar...'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>
      <AnimatedModal visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.pickerModalClose}>
              <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map(opt => {
              const active = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerOption, active && { backgroundColor: '#F0FDF4' }]}
                  onPress={() => { onSelect(opt.value); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, active && { color: brandColors?.primary, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {active && <MaterialCommunityIcons name="check-circle" size={18} color={brandColors?.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AnimatedModal>
    </View>
  );
};

/* ─── Modal de edição do grupo ─── */
const GroupEditModal = ({
  visible, group, draft, onClose, onSave,
  saving, error, fieldErrors, onChangeDraft, brandColors,
}) => {
  if (!draft) return null;

  const inputStyle = field => [
    styles.input,
    fieldErrors?.[field] && styles.inputError,
  ];

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={inlineStyle_153_62}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{group?.id ? 'Editar Grupo' : 'Novo Grupo'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalBody}>
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={inlineStyle_166_94} />
                <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
              </View>
            )}

            {/* Nome do grupo */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Nome do grupo <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={draft.productGroup}
                onChangeText={v => onChangeDraft('productGroup', v)}
                style={inputStyle('productGroup')}
                placeholder="Ex: Molhos, Tamanhos, Sabores..."
                placeholderTextColor="#CBD5E1"
              />
              {!!fieldErrors?.productGroup && (
                <Text style={styles.fieldErrorText}>{fieldErrors.productGroup}</Text>
              )}
            </View>

            {/* Obrigatório */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Obrigatório</Text>
              <View style={styles.switchRight}>
                <Text style={styles.switchValue}>{draft.required ? 'Sim' : 'Não'}</Text>
                <Switch
                  value={Boolean(draft.required)}
                  onValueChange={v => onChangeDraft('required', v)}
                  trackColor={{ false: '#E2E8F0', true: brandColors?.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Exibição */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Exibir em displays e impressão</Text>
              <View style={styles.switchRight}>
                <Text style={styles.switchValue}>{draft.showInDisplay ? 'Sim' : 'Não'}</Text>
                <Switch
                  value={Boolean(draft.showInDisplay)}
                  onValueChange={v => onChangeDraft('showInDisplay', v)}
                  trackColor={{ false: '#E2E8F0', true: brandColors?.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Mínimo / Máximo */}
            <View style={styles.row}>
              <View style={[styles.halfField, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>Mín. escolhas</Text>
                <TextInput
                  value={String(draft.minimum)}
                  onChangeText={v => onChangeDraft('minimum', v)}
                  keyboardType="numeric"
                  style={inputStyle('minimum')}
                  placeholder="0"
                  placeholderTextColor="#CBD5E1"
                />
                {!!fieldErrors?.minimum && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.minimum}</Text>
                )}
              </View>
              <View style={[styles.halfField, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>
                  Máx. escolhas <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  value={String(draft.maximum)}
                  onChangeText={v => onChangeDraft('maximum', v)}
                  keyboardType="numeric"
                  style={inputStyle('maximum')}
                  placeholder="1"
                  placeholderTextColor="#CBD5E1"
                />
                {!!fieldErrors?.maximum && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.maximum}</Text>
                )}
              </View>
            </View>

            {/* Cálculo de preço / Ordem */}
            <View style={styles.row}>
              <View style={[styles.halfField, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>Ordem no cardápio</Text>
                <TextInput
                  value={String(draft.groupOrder)}
                  onChangeText={v => onChangeDraft('groupOrder', v)}
                  keyboardType="numeric"
                  style={inputStyle('groupOrder')}
                  placeholder="0"
                  placeholderTextColor="#CBD5E1"
                />
                {!!fieldErrors?.groupOrder && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.groupOrder}</Text>
                )}
              </View>
              <View style={styles.halfField}>
                <SelectField
                  label="Cálculo de preço"
                  value={draft.priceCalculation || 'sum'}
                  options={PRICE_CALCULATION_OPTIONS}
                  onSelect={v => onChangeDraft('priceCalculation', v)}
                  brandColors={brandColors}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: brandColors?.primary }, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
          >
            <MaterialCommunityIcons name="content-save-outline" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

const GroupImportModal = ({
  visible, groups, loading, importingId, error,
  onClose, onImport, brandColors,
}) => {
  const [search, setSearch] = useState('');
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return groups;
    return groups.filter(group =>
      String(group?.productGroup || '').toLowerCase().includes(normalizedSearch)
    );
  }, [groups, normalizedSearch]);

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={inlineStyle_153_62}>
      <View style={styles.importModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Importar Grupo</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.importModalBody}>
          {!!error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={inlineStyle_166_94} />
              <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
            </View>
          )}

          <View style={styles.searchInputWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Pesquisar grupo..."
              placeholderTextColor="#CBD5E1"
              style={styles.searchInput}
              autoFocus={visible}
              returnKeyType="search"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.importList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {loading && (
              <View style={styles.importEmpty}>
                <ActivityIndicator size="small" color="#94A3B8" />
                <Text style={styles.importEmptyText}>Buscando grupos...</Text>
              </View>
            )}

            {!loading && filteredGroups.length === 0 && (
              <View style={styles.importEmpty}>
                <MaterialCommunityIcons name="format-list-group" size={36} color="#CBD5E1" />
                <Text style={styles.importEmptyText}>Nenhum grupo disponível</Text>
              </View>
            )}

            {!loading && filteredGroups.map(group => {
              const gid = normalizeEntityId(group);
              const minMax = [group.minimum, group.maximum].filter(v => v != null).join(' – ');
              const calcLabel = PRICE_CALCULATION_OPTIONS.find(o => o.value === group.priceCalculation)?.label || '';
              const importing = String(importingId || '') === String(gid);

              return (
                <TouchableOpacity
                  key={gid || String(group?.['@id'])}
                  style={styles.importGroupItem}
                  onPress={() => onImport(group)}
                  disabled={!!importingId}
                  activeOpacity={0.75}
                >
                  <View style={inlineStyle_498_22}>
                    <Text style={styles.importGroupName} numberOfLines={1}>
                      {group.productGroup || 'Grupo'}
                    </Text>
                    <View style={styles.cardMeta}>
                      {!!minMax && (
                        <View style={styles.badge}>
                          <MaterialCommunityIcons name="swap-horizontal" size={11} color="#64748B" />
                          <Text style={styles.badgeText}>{minMax}</Text>
                        </View>
                      )}
                      {group.required && (
                        <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.badgeText, { color: '#92400E' }]}>Obrigatório</Text>
                        </View>
                      )}
                      {!!calcLabel && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{calcLabel}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {importing ? (
                    <ActivityIndicator size="small" color={brandColors?.primary} />
                  ) : (
                    <MaterialCommunityIcons name="tray-arrow-down" size={20} color={brandColors?.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </AnimatedModal>
  );
};

/* ─── Componente principal ─── */
const ProductGroups = ({ ProductId }) => {
  const productGroupStore = useStore('product_group');
  const productGroupParentStore = useStore('product_group_parent');
  const peopleStore = useStore('people');

  const { actions } = productGroupStore;
  const groupParentActions = productGroupParentStore.actions;
  const { currentCompany } = peopleStore.getters;
  const brandColors = useMemo(() => resolveThemePalette(), []);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [expanded, setExpanded] = useState({});

  /* modal state */
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [modalDraft, setModalDraft] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  /* importação */
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importCandidates, setImportCandidates] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importingId, setImportingId] = useState('');
  const [importError, setImportError] = useState('');

  /* confirmação de exclusão */
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadData = useCallback(() => {
    if (!ProductId || !currentCompany?.id) {
      setLoadingGroups(false);
      return Promise.resolve([]);
    }
    setLoadingGroups(true);
    return actions
      .getItems({
        product: ProductId,
        'order[groupOrder]': 'ASC',
        'order[productGroup]': 'ASC',
      })
      .then(response => {
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.['hydra:member'])
          ? response['hydra:member']
          : [];
        setGroups(items);
        setLoadingGroups(false);
        return items;
      })
      .catch(() => { setLoadingGroups(false); return []; });
  }, [ProductId, currentCompany?.id, actions]);

  useEffect(() => {
    if (currentCompany?.id) loadData();
    else setLoadingGroups(false);
  }, [currentCompany?.id, loadData]);

  const ensureGroupParentLink = useCallback(async groupValue => {
    const productGroup = toProductGroupIri(groupValue);
    const parentProduct = toProductIri(ProductId);
    if (!productGroup || !parentProduct) return;

    try {
      await groupParentActions.save({
        productGroup,
        parentProduct,
        active: true,
      });
    } catch (e) {
      if (!isDuplicateError(e)) throw e;
    }
  }, [ProductId, groupParentActions]);

  const removeImportedGroupFromProduct = useCallback(async group => {
    const productGroup = toProductGroupIri(group);
    const parentProduct = toProductIri(ProductId);
    if (!productGroup || !parentProduct) return;

    const links = extractItems(await groupParentActions.getItems({
      productGroup,
      parentProduct,
    }));
    for (const link of links) {
      const id = normalizeEntityId(link);
      if (id) await groupParentActions.remove(id);
    }
  }, [ProductId, groupParentActions]);

  const loadImportCandidates = useCallback(async () => {
    if (!currentCompany?.id) {
      setImportCandidates([]);
      return [];
    }

    setImportLoading(true);
    setImportError('');
    try {
      const response = await actions.getItems({
        company: `/people/${currentCompany.id}`,
        'order[productGroup]': 'ASC',
      });
      const associatedIds = new Set(groups.map(group => normalizeEntityId(group)).filter(Boolean));
      const candidates = extractItems(response)
        .filter(group => {
          const id = normalizeEntityId(group);
          return id && group?.active !== false && !associatedIds.has(id);
        });

      setImportCandidates(candidates);
      return candidates;
    } catch (e) {
      const detail =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';
      setImportError(detail || 'Falha ao buscar grupos.');
      setImportCandidates([]);
      return [];
    } finally {
      setImportLoading(false);
    }
  }, [actions, currentCompany?.id, groups]);

  const openImportModal = () => {
    setImportModalVisible(true);
    setImportCandidates([]);
    setImportError('');
    setImportingId('');
    loadImportCandidates();
  };

  const handleImportGroup = async group => {
    const gid = normalizeEntityId(group);
    if (!gid) return;

    setImportError('');
    setImportingId(gid);
    try {
      await ensureGroupParentLink(group);
      await loadData();
      setExpanded(prev => ({ ...prev, [toProductGroupIri(group) || gid]: true }));
      setImportModalVisible(false);
      setImportCandidates([]);
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId: gid,
        source: 'ProductGroups.importGroup',
      });
    } catch (e) {
      const detail =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';
      setImportError(detail || 'Falha ao importar grupo.');
    } finally {
      setImportingId('');
    }
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setModalDraft(normalizeGroupDraft({}));
    setModalError('');
    setFieldErrors({});
    setModalVisible(true);
  };

  const openEditModal = group => {
    setEditingGroup(group);
    setModalDraft(normalizeGroupDraft(group));
    setModalError('');
    setFieldErrors({});
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingGroup(null);
    setModalDraft(null);
    setModalError('');
    setFieldErrors({});
  };

  const handleChangeDraft = (field, value) => {
    setModalDraft(prev => ({ ...prev, [field]: value }));
    /* limpa erro do campo ao editar */
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleSaveModal = async () => {
    if (!modalDraft) return;
    setModalError('');

    if (!editingGroup && !currentCompany?.id) {
      setModalError('Selecione uma empresa antes de criar o grupo.');
      return;
    }

    /* Validação por campo */
    const errs = validateGroupDraft(modalDraft);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    const minimum = parseInteger(modalDraft.minimum);
    const maximum = parseInteger(modalDraft.maximum);
    const groupOrder = parseInteger(modalDraft.groupOrder) ?? 0;

    setModalSaving(true);
    try {
      /*
       * Payload limpo: apenas campos que existem em product_group.
       * Não enviar extraData, bomVersion, validFrom, validTo.
       */
      const payload = editingGroup
        ? {
            id: editingGroup.id,
            productGroup: String(modalDraft.productGroup).trim(),
            required: Boolean(modalDraft.required),
            showInDisplay: Boolean(modalDraft.showInDisplay),
            minimum: minimum ?? null,
            maximum: maximum ?? null,
            groupOrder,
            priceCalculation: modalDraft.priceCalculation || 'sum',
            active: editingGroup.active ?? true,
          }
        : {
            company: toPeopleIri(currentCompany),
            productGroup: String(modalDraft.productGroup || 'Novo Grupo').trim(),
            required: Boolean(modalDraft.required),
            showInDisplay: Boolean(modalDraft.showInDisplay),
            minimum: minimum ?? 0,
            maximum: maximum ?? 1,
            groupOrder,
            priceCalculation: modalDraft.priceCalculation || 'sum',
          };

      const saved = await actions.save(payload);
      if (!editingGroup) {
        await ensureGroupParentLink(saved);
      }
      await loadData();

      if (!editingGroup && saved) {
        const newId = String(saved?.['@id'] || saved?.id || '');
        if (newId) setExpanded(prev => ({ ...prev, [newId]: true }));
      }

      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        source: 'ProductGroups.saveModal',
      });
      closeModal();
    } catch (e) {
      const detail =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';
      setModalError(detail || 'Falha ao salvar grupo.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteGroup) return;
    const gid = String(confirmDeleteGroup?.id || confirmDeleteGroup?.['@id'] || '').replace(/\D/g, '');
    if (!gid) { setConfirmDeleteGroup(null); return; }
    setRemoving(true);
    try {
      const productGroup = toProductGroupIri(confirmDeleteGroup);
      const links = productGroup
        ? extractItems(await groupParentActions.getItems({
            productGroup,
          }))
        : [];
      const hasOtherActiveLinks = links.some(link => {
        if (link?.active === false) {
          return false;
        }

        const linkParentId = normalizeEntityId(link?.parentProduct);
        return linkParentId && linkParentId !== String(ProductId || '');
      });

      if (hasOtherActiveLinks) {
        await removeImportedGroupFromProduct(confirmDeleteGroup);
      } else {
        await actions.remove(gid);
      }
      await loadData();
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId: gid,
        source: 'ProductGroups.remove',
      });
    } catch {
      /* silent */
    } finally {
      setRemoving(false);
      setConfirmDeleteGroup(null);
    }
  };

  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loadingGroups) return <View style={styles.container}><GroupTabSkeleton /></View>;

  return (
    <View style={styles.container}>
      {!productGroupStore.getters?.isLoading && <StateStore store="product_group" />}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!ProductId && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="layers-off-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Salve o produto primeiro</Text>
            <Text style={styles.emptySubtitle}>Os grupos ficam disponíveis após salvar o produto.</Text>
          </View>
        )}

        {ProductId && groups.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="format-list-group" size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Nenhum grupo</Text>
            <Text style={styles.emptySubtitle}>Adicione grupos para organizar modificadores e componentes.</Text>
          </View>
        )}

        {groups.map((group, index) => {
          const gid = String(group['@id'] || group.id || index);
          const isExpanded = !!expanded[gid];
          const minMax = [group.minimum, group.maximum].filter(v => v != null).join(' – ');
          const calcLabel = PRICE_CALCULATION_OPTIONS.find(o => o.value === group.priceCalculation)?.label || '';

          return (
            <View key={gid} style={styles.card}>
              {/* Header do card */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggleExpand(gid)}
                activeOpacity={0.7}
              >
                <View style={inlineStyle_498_22}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {group.productGroup || 'Grupo'}
                  </Text>
                  <View style={styles.cardMeta}>
                    {!!minMax && (
                      <View style={styles.badge}>
                        <MaterialCommunityIcons name="swap-horizontal" size={11} color="#64748B" />
                        <Text style={styles.badgeText}>{minMax}</Text>
                      </View>
                    )}
                    {group.required && (
                      <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.badgeText, { color: '#92400E' }]}>Obrigatório</Text>
                      </View>
                    )}
                    {group.showInDisplay === false && (
                      <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Oculto</Text>
                      </View>
                    )}
                    {!!calcLabel && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{calcLabel}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditModal(group)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#64748B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFF1F1' }]}
                    onPress={() => setConfirmDeleteGroup(group)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#c10015" />
                  </TouchableOpacity>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#94A3B8"
                    style={inlineStyle_540_20}
                  />
                </View>
              </TouchableOpacity>
              {/* Conteúdo expandido: modificadores */}
              {isExpanded && (
                <View style={styles.cardBody}>
                  <View style={styles.divider} />
                  <ProductGroupProducts
                    key={gid}
                    products={group.products}
                    productGroup={group['@id'] || group.id}
                    ProductId={ProductId}
                    brandColors={brandColors}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      {/* Barra inferior: adicionar grupo */}
      {!!ProductId && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarRow}>
            <TouchableOpacity
              style={styles.importGroupBtn}
              onPress={openImportModal}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="tray-arrow-down" size={20} color={brandColors?.primary} />
              <Text style={[styles.importGroupBtnText, { color: brandColors?.primary }]}>Importar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addGroupBtn, { backgroundColor: brandColors?.primary }]}
              onPress={openCreateModal}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addGroupBtnText}>Adicionar Grupo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Modal de edição */}
      <GroupEditModal
        visible={modalVisible}
        group={editingGroup}
        draft={modalDraft}
        onClose={closeModal}
        onSave={handleSaveModal}
        saving={modalSaving}
        error={modalError}
        fieldErrors={fieldErrors}
        onChangeDraft={handleChangeDraft}
        brandColors={brandColors}
      />
      <GroupImportModal
        visible={importModalVisible}
        groups={importCandidates}
        loading={importLoading}
        importingId={importingId}
        error={importError}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImportGroup}
        brandColors={brandColors}
      />
      {/* Modal de confirmação de exclusão */}
      <AnimatedModal
        visible={!!confirmDeleteGroup}
        onRequestClose={() => setConfirmDeleteGroup(null)}
        style={inlineStyle_595_8}
      >
        <View style={styles.confirmModal}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={40}
            color="#c10015"
            style={inlineStyle_602_12}
          />
          <Text style={styles.confirmTitle}>Excluir grupo?</Text>
          <Text style={styles.confirmSubtitle}>
            O grupo <Text style={inlineStyle_606_26}>{confirmDeleteGroup?.productGroup || ''}</Text> será desvinculado deste produto. Se for o único vínculo ativo, o grupo inteiro será excluído.
          </Text>
          <View style={styles.confirmFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDeleteGroup(null)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, removing && { opacity: 0.6 }]}
              onPress={handleConfirmDelete}
              disabled={removing}
            >
              <Text style={styles.deleteBtnText}>{removing ? 'Excluindo...' : 'Excluir'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
};

export default ProductGroups;
