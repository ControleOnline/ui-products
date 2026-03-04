import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductGroupProducts from './ProductGroupProducts';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';

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

const ProductGroups = ({ ProductId }) => {
  const productGroupStore = useStore('product_group');
  const peopleStore = useStore('people');

  const { actions } = productGroupStore;
  const { currentCompany } = peopleStore.getters;

  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [groupDrafts, setGroupDrafts] = useState({});
  const [savingByGroup, setSavingByGroup] = useState({});
  const [removingByGroup, setRemovingByGroup] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    if (!ProductId || !currentCompany?.id) return Promise.resolve([]);
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
        setGroupDrafts(prev => {
          const next = { ...prev };
          items.forEach((g, i) => {
            const id = String(g['@id'] || g.id || i);
            if (!next[id]) next[id] = normalizeGroupDraft(g);
          });
          return next;
        });
        // preserve expanded state by group id when possible
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
  }, [currentCompany?.id, loadData]);

  const toggleExpand = id => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <StateStore store="product_group" />
      {!ProductId && (
        <Text style={{ color: '#666', marginBottom: 8 }}>
          Salve o produto para habilitar grupos e modificadores.
        </Text>
      )}

      <TouchableOpacity
        onPress={createGroup}
        disabled={!ProductId}
        style={{
          backgroundColor: ProductId ? '#000' : '#666',
          padding: 12,
          borderRadius: 6,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          Adicionar Grupo
        </Text>
      </TouchableOpacity>
      {!!status && <Text style={{ color: '#1b7f34', marginBottom: 8 }}>{status}</Text>}
      {!!error && <Text style={{ color: '#b00020', marginBottom: 8 }}>{error}</Text>}
      {groups.length === 0 && (
        <Text style={{ color: '#666', marginBottom: 8 }}>
          Nenhum grupo cadastrado ainda.
        </Text>
      )}

      {groups.map((group, index) => {
        const gid = group['@id'] || group.id || String(index);
        const draft = groupDrafts[String(gid)] || normalizeGroupDraft(group);
        return (
          <View key={gid} style={{ marginBottom: 20 }}>
            <TouchableOpacity onPress={() => toggleExpand(gid)}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                {group.productGroup}
              </Text>
            </TouchableOpacity>

            {expanded[gid] && (
              <View style={{ marginTop: 12 }}>
              <TextInput
                value={draft.productGroup}
                onChangeText={text => updateDraft(String(gid), 'productGroup', text)}
                placeholder="Grupo"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 6,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ marginRight: 10 }}>Obrigatório</Text>
                <Switch
                  value={Boolean(draft.required)}
                  onValueChange={val => updateDraft(String(gid), 'required', val)}
                />
                <Text style={{ marginLeft: 10, color: '#666' }}>
                  {draft.required ? 'Sim' : 'Não'}
                </Text>
              </View>

              <Text style={{ marginBottom: 4 }}>Mínimo de escolhas</Text>
              <TextInput
                value={String(draft.minimum || '')}
                onChangeText={text => updateDraft(String(gid), 'minimum', text)}
                placeholder="Mínimo"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 6,
                }}
              />

              <Text style={{ marginBottom: 4 }}>Máximo de escolhas</Text>
              <TextInput
                value={String(draft.maximum || '')}
                onChangeText={text => updateDraft(String(gid), 'maximum', text)}
                placeholder="Máximo"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  borderRadius: 6,
                }}
              />

              <Text style={{ marginBottom: 4 }}>Ordem do grupo no cardápio</Text>
              <TextInput
                value={String(draft.groupOrder || '')}
                onChangeText={text => updateDraft(String(gid), 'groupOrder', text)}
                placeholder="Ordem do grupo"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  borderRadius: 6,
                  marginTop: 10,
                  marginBottom: 10,
                }}
              />

              <Text style={{ marginBottom: 4 }}>Cálculo de preço do grupo</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 10 }}>
                <Picker
                  selectedValue={draft.priceCalculation || 'sum'}
                  onValueChange={val => updateDraft(String(gid), 'priceCalculation', val)}
                >
                  <Picker.Item label="Soma" value="sum" />
                  <Picker.Item label="Média" value="average" />
                  <Picker.Item label="Maior" value="biggest" />
                  <Picker.Item label="Brinde" value="free" />
                </Picker>
              </View>

              <Text style={{ marginBottom: 4 }}>Versão da BOM</Text>
              <TextInput
                value={String(draft.bomVersion || '')}
                onChangeText={text => updateDraft(String(gid), 'bomVersion', text)}
                placeholder="Versão BOM"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  borderRadius: 6,
                  marginBottom: 10,
                }}
              />

              <Text style={{ marginBottom: 4 }}>Vigência início</Text>
              <TextInput
                value={String(draft.validFrom || '')}
                onChangeText={text => updateDraft(String(gid), 'validFrom', text)}
                placeholder="Vigência início (YYYY-MM-DD)"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  borderRadius: 6,
                  marginBottom: 10,
                }}
              />

              <Text style={{ marginBottom: 4 }}>Vigência fim</Text>
              <TextInput
                value={String(draft.validTo || '')}
                onChangeText={text => updateDraft(String(gid), 'validTo', text)}
                placeholder="Vigência fim (YYYY-MM-DD)"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  borderRadius: 6,
                  marginBottom: 10,
                }}
              />
              <TouchableOpacity
                onPress={() => saveGroup(group)}
                disabled={Boolean(savingByGroup[String(gid)])}
                style={{
                  backgroundColor: '#000',
                  padding: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: '#fff' }}>
                  {savingByGroup[String(gid)] ? 'Salvando...' : 'Salvar Grupo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeGroup(group)}
                disabled={Boolean(removingByGroup[String(group.id || group['@id'] || '').replace(/\D/g, '')])}
                style={{
                  backgroundColor: '#b00020',
                  padding: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: '#fff' }}>
                  {removingByGroup[String(group.id || group['@id'] || '').replace(/\D/g, '')]
                    ? 'Excluindo...'
                    : 'Excluir Grupo'}
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
  );
};

export default ProductGroups;
