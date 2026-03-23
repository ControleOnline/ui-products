import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import ProductGroupProducts from './ProductGroupProducts';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';

const PRICE_CALCULATION_OPTIONS = [
  { value: 'sum', label: 'Soma' },
  { value: 'average', label: 'Média' },
  { value: 'biggest', label: 'Maior' },
  { value: 'free', label: 'Brinde' },
];

const parseNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const parseInteger = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
};

const isValidIsoDate = value => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [y, m, d] = String(value)
    .split('-')
    .map(v => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

const normalizeGroupDraft = group => ({
  productGroup: String(group?.productGroup || ''),
  required: Boolean(group?.required),
  minimum: String(group?.minimum ?? ''),
  maximum: String(group?.maximum ?? ''),
  groupOrder: String(group?.groupOrder ?? ''),
  priceCalculation: String(group?.priceCalculation || 'sum'),
  bomVersion: String(group?.extraData?.bomVersion ?? ''),
  validFrom: String(group?.extraData?.validFrom || ''),
  validTo: String(group?.extraData?.validTo || ''),
});

const SelectField = ({ label, value, options, onSelect }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={{ marginBottom: 12 }}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.selectButtonText}>
          {selected ? selected.label : 'Selecionar...'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>
      <AnimatedModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={label || 'Selecionar'}
      >
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.selectOption,
              opt.value === value && styles.selectOptionActive,
            ]}
            onPress={() => {
              onSelect(opt.value);
              setModalVisible(false);
            }}
          >
            <Text
              style={[
                styles.selectOptionText,
                opt.value === value && styles.selectOptionTextActive,
              ]}
            >
              {opt.label}
            </Text>
            {opt.value === value && (
              <MaterialCommunityIcons name="check" size={18} color="#0F172A" />
            )}
          </TouchableOpacity>
        ))}
      </AnimatedModal>
    </View>
  );
};

const GroupSkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={{ width, height, borderRadius: 7, backgroundColor: '#E2E8F0', marginBottom: mb }} />
)

const GroupTabSkeleton = () => (
  <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
    {[1, 2].map(i => (
      <View key={i} style={{
        backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <GroupSkeletonLine width="50%" height={14} mb={0} />
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#E2E8F0' }} />
        </View>
        <GroupSkeletonLine height={40} mb={8} />
        <GroupSkeletonLine width="70%" height={13} mb={0} />
      </View>
    ))}
  </ScrollView>
)

const ProductGroups = ({ ProductId }) => {
  const productGroupStore = useStore('product_group');
  const peopleStore = useStore('people');

  const { actions } = productGroupStore;
  const { currentCompany } = peopleStore.getters;

  const brandColors = useMemo(() => resolveThemePalette(), []);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [groupDrafts, setGroupDrafts] = useState({});
  const [savingByGroup, setSavingByGroup] = useState({});
  const [removingByGroup, setRemovingByGroup] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    if (!ProductId || !currentCompany?.id) {
      setLoadingGroups(false);
      return Promise.resolve([]);
    }
    setLoadingGroups(true);
    return actions
      .getItems({
        parentProduct: `/products/${ProductId}`,
        people: currentCompany?.id,
      })
      .then(response => {
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.['hydra:member'])
            ? response['hydra:member']
            : [];
        setGroups(items);
        setLoadingGroups(false);
        setGroupDrafts(prev => {
          const next = { ...prev };
          items.forEach((g, i) => {
            const id = String(g['@id'] || g.id || i);
            if (!next[id]) next[id] = normalizeGroupDraft(g);
          });
          return next;
        });
        setExpanded(prev => {
          const next = {};
          items.forEach((g, i) => {
            const id = g['@id'] || g.id || String(i);
            next[id] = !!prev[id];
          });
          return next;
        });
        return items;
      });
  }, [ProductId, currentCompany?.id, actions]);

  const updateDraft = (groupKey, field, value) => {
    setGroupDrafts(prev => ({
      ...prev,
      [groupKey]: {
        ...(prev[groupKey] || {}),
        [field]: value,
      },
    }));
  };

  const saveGroup = useCallback(async group => {
    const gid = String(group['@id'] || group.id || '');
    const draft = groupDrafts[gid] || normalizeGroupDraft(group);
    setStatus('');
    setError('');
    setSavingByGroup(prev => ({ ...prev, [gid]: true }));
    try {
      const minimum = parseInteger(draft.minimum);
      const maximum = parseInteger(draft.maximum);
      const groupOrder = parseInteger(draft.groupOrder);
      if (minimum !== null && maximum !== null && minimum > maximum) {
        throw new Error('Mínimo não pode ser maior que máximo.');
      }
      if (minimum !== null && minimum < 0) {
        throw new Error('Mínimo de escolhas não pode ser negativo.');
      }
      if (maximum !== null && maximum < 0) {
        throw new Error('Máximo de escolhas não pode ser negativo.');
      }
      if (groupOrder !== null && groupOrder < 0) {
        throw new Error('Ordem do grupo não pode ser negativa.');
      }
      if (
        draft.required &&
        (minimum === null || minimum < 1)
      ) {
        throw new Error('Grupo obrigatório precisa de mínimo de escolhas >= 1.');
      }
      if (draft.validFrom && !isValidIsoDate(draft.validFrom)) {
        throw new Error('Vigência início inválida. Use YYYY-MM-DD.');
      }
      if (draft.validTo && !isValidIsoDate(draft.validTo)) {
        throw new Error('Vigência fim inválida. Use YYYY-MM-DD.');
      }
      if (draft.validFrom && draft.validTo && draft.validFrom > draft.validTo) {
        throw new Error('Vigência início não pode ser maior que vigência fim.');
      }

      const bomVersionRaw = String(draft.bomVersion || '').replace(/\D/g, '');
      const bomVersion = bomVersionRaw ? parseInt(bomVersionRaw, 10) : null;
      if (bomVersion !== null && bomVersion <= 0) {
        throw new Error('Versão da BOM deve ser maior que zero.');
      }
      const payload = {
        ...group,
        minimum,
        maximum,
        groupOrder,
        productGroup: String(draft.productGroup || '').trim(),
        required: Boolean(draft.required),
        priceCalculation: draft.priceCalculation || 'sum',
        extraData: {
          ...(group.extraData || {}),
          bomVersion: Number.isNaN(bomVersion) ? null : bomVersion,
          validFrom: draft.validFrom || null,
          validTo: draft.validTo || null,
        },
      };
      delete payload.products;
      await actions.save(payload);
      await loadData();
      setStatus('Grupo salvo com sucesso.');
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId: group.id || group['@id'] || null,
        source: 'ProductGroups.saveGroup',
      });
    } catch (e) {
      setError(e?.message || 'Falha ao salvar grupo.');
    } finally {
      setSavingByGroup(prev => ({ ...prev, [gid]: false }));
    }
  }, [ProductId, actions, groupDrafts, loadData]);

  const createGroup = async () => {
    if (!ProductId) return;
    setStatus('');
    setError('');
    try {
      const saved = await actions.save({
        parentProduct: `/products/${ProductId}`,
        people: currentCompany?.id,
        productGroup: 'Novo Grupo',
        minimum: 0,
        maximum: 1,
        required: false,
        priceCalculation: 'sum',
        extraData: {
          bomVersion: 1,
          validFrom: null,
          validTo: null,
        },
      });
      const items = await loadData();
      const newGroupId = String(saved?.['@id'] || saved?.id || '');
      if ((items?.length || 0) === 0 && newGroupId) {
        setGroups(prev => [saved, ...prev.filter(g => String(g?.id || g?.['@id'] || '') !== newGroupId)]);
        setGroupDrafts(prev => ({
          ...prev,
          [newGroupId]: normalizeGroupDraft(saved),
        }));
      }
      if (newGroupId) {
        setExpanded(prev => ({ ...prev, [newGroupId]: true }));
      }
      setStatus('Grupo criado.');
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        source: 'ProductGroups.createGroup',
      });
    } catch (e) {
      setError(e?.message || 'Falha ao criar grupo.');
    }
  };

  const askConfirmDelete = group => {
    const label = group?.productGroup || 'este grupo';
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`);
    }
    return true;
  };

  const removeGroup = useCallback(async group => {
    if (!ProductId) return;
    const gid = String(group?.id || group?.['@id'] || '').replace(/\D/g, '');
    if (!gid) return;
    if (!askConfirmDelete(group)) return;

    setStatus('');
    setError('');
    setRemovingByGroup(prev => ({ ...prev, [gid]: true }));
    try {
      await actions.remove(gid);
      await loadData();
      setStatus('Grupo excluído.');
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId: gid,
        source: 'ProductGroups.removeGroup',
      });
    } catch (e) {
      setError(e?.message || 'Falha ao excluir grupo.');
    } finally {
      setRemovingByGroup(prev => ({ ...prev, [gid]: false }));
    }
  }, [ProductId, actions, loadData]);

  useEffect(() => {
    if (currentCompany?.id) loadData();
    else setLoadingGroups(false);
  }, [currentCompany?.id, loadData]);

  const toggleExpand = id => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loadingGroups) return (
    <View style={styles.container}><GroupTabSkeleton /></View>
  );

  return (
    <View style={styles.container}>
      {!productGroupStore.getters?.isLoading && <StateStore store="product_group" />}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!ProductId && (
          <Text style={styles.disabledText}>
            Salve o produto para habilitar grupos e modificadores.
          </Text>
        )}

        {!!status && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{status}</Text>
          </View>
        )}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {groups.length === 0 && (
          <Text style={styles.emptyText}>Nenhum grupo cadastrado ainda.</Text>
        )}

        {groups.map((group, index) => {
          const gid = group['@id'] || group.id || String(index);
          const draft = groupDrafts[String(gid)] || normalizeGroupDraft(group);
          const isExpanded = !!expanded[gid];
          const isSaving = Boolean(savingByGroup[String(gid)]);
          const removeKey = String(group.id || group['@id'] || '').replace(/\D/g, '');
          const isRemoving = Boolean(removingByGroup[removeKey]);

          return (
            <View key={gid} style={styles.card}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleExpand(gid)}
                activeOpacity={0.7}
              >
                <Text style={styles.groupTitle} numberOfLines={1}>
                  {group.productGroup || 'Grupo'}
                </Text>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-down' : 'chevron-right'}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.groupBody}>
                  <Text style={styles.fieldLabel}>Nome do grupo</Text>
                  <TextInput
                    value={draft.productGroup}
                    onChangeText={text => updateDraft(String(gid), 'productGroup', text)}
                    placeholder="Grupo"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Obrigatório</Text>
                    <View style={styles.switchRight}>
                      <Text style={styles.switchValue}>
                        {draft.required ? 'Sim' : 'Não'}
                      </Text>
                      <Switch
                        value={Boolean(draft.required)}
                        onValueChange={val => updateDraft(String(gid), 'required', val)}
                        trackColor={{ false: '#E2E8F0', true: brandColors?.primary || '#0F172A' }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Mínimo de escolhas</Text>
                  <TextInput
                    value={String(draft.minimum || '')}
                    onChangeText={text => updateDraft(String(gid), 'minimum', text)}
                    placeholder="Mínimo"
                    keyboardType="numeric"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.fieldLabel}>Máximo de escolhas</Text>
                  <TextInput
                    value={String(draft.maximum || '')}
                    onChangeText={text => updateDraft(String(gid), 'maximum', text)}
                    placeholder="Máximo"
                    keyboardType="numeric"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.fieldLabel}>Ordem do grupo no cardápio</Text>
                  <TextInput
                    value={String(draft.groupOrder || '')}
                    onChangeText={text => updateDraft(String(gid), 'groupOrder', text)}
                    placeholder="Ordem do grupo"
                    keyboardType="numeric"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />

                  <SelectField
                    label="Cálculo de preço do grupo"
                    value={draft.priceCalculation || 'sum'}
                    options={PRICE_CALCULATION_OPTIONS}
                    onSelect={val => updateDraft(String(gid), 'priceCalculation', val)}
                  />

                  <Text style={styles.fieldLabel}>Versão da BOM</Text>
                  <TextInput
                    value={String(draft.bomVersion || '')}
                    onChangeText={text => updateDraft(String(gid), 'bomVersion', text)}
                    placeholder="Versão BOM"
                    keyboardType="numeric"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.fieldLabel}>Vigência início</Text>
                  <TextInput
                    value={String(draft.validFrom || '')}
                    onChangeText={text => updateDraft(String(gid), 'validFrom', text)}
                    placeholder="YYYY-MM-DD"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.fieldLabel}>Vigência fim</Text>
                  <TextInput
                    value={String(draft.validTo || '')}
                    onChangeText={text => updateDraft(String(gid), 'validTo', text)}
                    placeholder="YYYY-MM-DD"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />

                  <TouchableOpacity
                    onPress={() => saveGroup(group)}
                    disabled={isSaving}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: brandColors?.primary || '#0F172A' },
                      isSaving && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.btnText}>
                      {isSaving ? 'Salvando...' : 'Salvar Grupo'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => removeGroup(group)}
                    disabled={isRemoving}
                    style={[styles.btnDestructive, isRemoving && styles.btnDisabled]}
                  >
                    <Text style={styles.btnText}>
                      {isRemoving ? 'Excluindo...' : 'Excluir Grupo'}
                    </Text>
                  </TouchableOpacity>

                  <ProductGroupProducts
                    key={group['@id'] || group.id}
                    products={group.products}
                    productGroup={group['@id'] || group.id}
                    ProductId={ProductId}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={createGroup}
          disabled={!ProductId}
          style={[
            styles.btnPrimary,
            { backgroundColor: ProductId ? (brandColors?.primary || '#0F172A') : '#94A3B8' },
            styles.btnFullWidth,
          ]}
        >
          <Text style={styles.btnText}>Adicionar Grupo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  disabledText: {
    color: '#64748B',
    marginBottom: 8,
    fontSize: 14,
  },
  emptyText: {
    color: '#64748B',
    marginBottom: 8,
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#9e1b1b',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  groupBody: {
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  switchRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchValue: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 4,
  },
  selectButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 15,
    color: '#0F172A',
  },
  selectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  selectOptionText: {
    fontSize: 15,
    color: '#0F172A',
  },
  selectOptionTextActive: {
    fontWeight: '700',
  },
  btnPrimary: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnFullWidth: {
    width: '100%',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    backgroundColor: '#fff',
  },
});

export default ProductGroups;
