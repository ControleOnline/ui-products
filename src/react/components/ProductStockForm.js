import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, TextInput, TouchableOpacity, View, Switch} from 'react-native';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';

const toInt = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};

const toInventoryId = row =>
  String(
    row?.inventory_id ||
      row?.inventoryId ||
      row?.inventory?.id ||
      row?.inventory ||
      '',
  ).trim();

const ProductStockForm = ({ProductId}) => {
  const productsStore = useStore('products');
  const peopleStore = useStore('people');
  const inventoriesStore = useStore('inventories');
  const {actions: productActions} = productsStore;
  const {currentCompany} = peopleStore.getters;
  const {actions: inventoriesActions, getters: inventoriesGetters} = inventoriesStore;

  const [product, setProduct] = useState(null);
  const [inventoryRows, setInventoryRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ProductId) return;
    productActions.get(ProductId).then(data => setProduct(data));
  }, [ProductId, productActions]);

  useEffect(() => {
    if (!currentCompany?.id || !ProductId) return;
    productActions
      .getInventory({company: currentCompany.id})
      .then(data => {
        const pid = String(ProductId).replace(/\D/g, '');
        const filtered = (data || []).filter(row => String(row.product_id) === pid);
        setInventoryRows(filtered);
      })
      .catch(() => setInventoryRows([]));
  }, [currentCompany?.id, ProductId]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    const hasLoaded = Array.isArray(inventoriesGetters.items) && inventoriesGetters.items.length > 0;
    if (hasLoaded) return;
    inventoriesActions.getItems({company: currentCompany.id}).catch(() => {});
  }, [currentCompany?.id, inventoriesActions, inventoriesGetters.items]);

  const stock = useMemo(() => {
    const extraData = product?.extraData || {};
    const currentStock = extraData.stock || {};
    return {
      ...currentStock,
    };
  }, [product]);

  const inventoryPolicies = useMemo(() => {
    const source = product?.extraData?.stockByInventory || {};
    if (Array.isArray(source)) {
      return source.reduce((acc, item) => {
        const id = toInventoryId(item);
        if (!id) return acc;
        acc[id] = {
          minimum: item?.minimum ?? '',
          maximum: item?.maximum ?? '',
          reorderPoint: item?.reorderPoint ?? '',
          leadTimeDays: item?.leadTimeDays ?? '',
        };
        return acc;
      }, {});
    }
    return source;
  }, [product?.extraData?.stockByInventory]);

  const inventorySnapshotById = useMemo(() => {
    return (inventoryRows || []).reduce((acc, row) => {
      const id = toInventoryId(row);
      if (!id) return acc;
      acc[id] = row;
      return acc;
    }, {});
  }, [inventoryRows]);

  const inventoryPolicyRows = useMemo(() => {
    const rows = [];
    const seen = new Set();

    (inventoriesGetters.items || []).forEach(inv => {
      const id = String(inv?.id || toInventoryId(inv) || '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      rows.push({
        inventoryId: id,
        inventoryName: inv?.inventory || inv?.name || `Inventário ${id}`,
        snapshot: inventorySnapshotById[id] || null,
      });
    });

    Object.keys(inventoryPolicies || {}).forEach(id => {
      const inventoryId = String(id || '').trim();
      if (!inventoryId || seen.has(inventoryId)) return;
      seen.add(inventoryId);
      const snapshot = inventorySnapshotById[inventoryId] || null;
      rows.push({
        inventoryId,
        inventoryName: snapshot?.inventory_name || `Inventário ${inventoryId}`,
        snapshot,
      });
    });

    Object.keys(inventorySnapshotById || {}).forEach(id => {
      const inventoryId = String(id || '').trim();
      if (!inventoryId || seen.has(inventoryId)) return;
      seen.add(inventoryId);
      const snapshot = inventorySnapshotById[inventoryId];
      rows.push({
        inventoryId,
        inventoryName: snapshot?.inventory_name || `Inventário ${inventoryId}`,
        snapshot,
      });
    });

    return rows.sort((a, b) => String(a.inventoryName).localeCompare(String(b.inventoryName)));
  }, [inventoriesGetters.items, inventoryPolicies, inventorySnapshotById]);

  const updateStock = (field, value) => {
    setProduct(prev => ({
      ...(prev || {}),
      extraData: {
        ...(prev?.extraData || {}),
        stock: {
          ...(prev?.extraData?.stock || {}),
          [field]: value,
        },
      },
    }));
  };
  const updateInventoryPolicy = (inventoryId, field, value) => {
    if (!inventoryId) return;
    setProduct(prev => ({
      ...(prev || {}),
      extraData: {
        ...(prev?.extraData || {}),
        stockByInventory: {
          ...(prev?.extraData?.stockByInventory || {}),
          [inventoryId]: {
            ...((prev?.extraData?.stockByInventory || {})[inventoryId] || {}),
            [field]: value,
          },
        },
      },
    }));
  };

  const saveStock = async () => {
    if (!ProductId || !product) return;
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const perInventoryRaw = product?.extraData?.stockByInventory || {};
      const perInventoryEntries = Object.entries(perInventoryRaw || {});
      const stockByInventory = {};
      for (const [inventoryId, policy] of perInventoryEntries) {
        const pMin = toInt(policy?.minimum);
        const pMax = toInt(policy?.maximum);
        const pReorder = toInt(policy?.reorderPoint);
        const pLead = toInt(policy?.leadTimeDays);
        if (pMin !== null && pMin < 0) {
          throw new Error(`Mínimo inválido no inventário ${inventoryId}.`);
        }
        if (pMax !== null && pMax < 0) {
          throw new Error(`Máximo inválido no inventário ${inventoryId}.`);
        }
        if (pMin !== null && pMax !== null && pMin > pMax) {
          throw new Error(`Mínimo maior que máximo no inventário ${inventoryId}.`);
        }
        if (
          pReorder !== null &&
          pMin !== null &&
          pMax !== null &&
          (pReorder < pMin || pReorder > pMax)
        ) {
          throw new Error(`Reposição fora da faixa no inventário ${inventoryId}.`);
        }
        stockByInventory[inventoryId] = {
          minimum: pMin,
          maximum: pMax,
          reorderPoint: pReorder,
          leadTimeDays: pLead,
        };
      }

      const payload = {
        id: ProductId,
        extraData: {
          ...(product.extraData || {}),
          stockByInventory,
          stock: {
            ...(product.extraData?.stock || {}),
            controlsStock: Boolean(product?.extraData?.stock?.controlsStock),
            allowNegativeStock: Boolean(product?.extraData?.stock?.allowNegativeStock),
            reserveOnOrder: Boolean(product?.extraData?.stock?.reserveOnOrder),
            autoDeductOnConfirm: Boolean(product?.extraData?.stock?.autoDeductOnConfirm),
          },
        },
      };
      delete payload.extraData.stockMin;
      delete payload.extraData.stockMax;
      delete payload.extraData.leadTimeDays;
      const saved = await productActions.save(payload);
      if (saved) setProduct(prev => ({...(prev || {}), ...saved}));
      setStatus('Politicas de estoque salvas.');
    } catch (e) {
      setError(e?.message || 'Falha ao salvar estoque.');
    } finally {
      setSaving(false);
    }
  };

  if (!ProductId) {
    return (
      <View style={{padding: 16}}>
        <Text>Salve o produto para habilitar a aba Estoque.</Text>
      </View>
    );
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  };

  return (
    <View style={{flex: 1}}>
      <StateStore store="products" />
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text style={{marginBottom: 8, fontWeight: '600'}}>Políticas de Estoque</Text>
        <Text style={{color: '#666', marginBottom: 8}}>
          Mínimos e reposição operacionais devem ser configurados por inventário abaixo.
        </Text>

        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
          <Text style={{flex: 1}}>Controla estoque</Text>
          <Switch
            value={Boolean(stock.controlsStock)}
            onValueChange={v => updateStock('controlsStock', v)}
          />
        </View>

        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
          <Text style={{flex: 1}}>Permitir estoque negativo</Text>
          <Switch
            value={Boolean(stock.allowNegativeStock)}
            onValueChange={v => updateStock('allowNegativeStock', v)}
          />
        </View>

        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
          <Text style={{flex: 1}}>Reservar no pedido</Text>
          <Switch
            value={Boolean(stock.reserveOnOrder)}
            onValueChange={v => updateStock('reserveOnOrder', v)}
          />
        </View>

        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
          <Text style={{flex: 1}}>Baixa automática no confirmado</Text>
          <Switch
            value={Boolean(stock.autoDeductOnConfirm)}
            onValueChange={v => updateStock('autoDeductOnConfirm', v)}
          />
        </View>

        <Text style={{color: '#666', marginBottom: 8}}>
          Os limites mínimos/máximos devem ser definidos por inventário (depósito, geladeira, almoxarifado).
        </Text>

        <Text style={{fontWeight: '600', marginBottom: 8}}>Parâmetros por Inventário</Text>
        {inventoryPolicyRows.length === 0 ? (
          <Text style={{color: '#666', marginBottom: 12}}>Sem inventários disponíveis para configurar.</Text>
        ) : (
          inventoryPolicyRows.map((row, idx) => {
            const inventoryId = String(row.inventoryId || '').trim();
            if (!inventoryId) return null;
            const policy = inventoryPolicies[inventoryId] || {};
            const available = row?.snapshot?.available;
            const unit = row?.snapshot?.productUnit || '';
            return (
              <View key={`policy-${inventoryId}-${idx}`} style={{borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10}}>
                <Text style={{fontWeight: '600', marginBottom: 6}}>{row.inventoryName || `Inventário ${inventoryId}`}</Text>
                <Text style={{color: '#666', marginBottom: 6}}>
                  {`Disponível atual: ${available === undefined || available === null ? '-' : available} ${unit}`}
                </Text>
                <Text>Mínimo neste inventário</Text>
                <TextInput
                  style={inputStyle}
                  value={String(policy.minimum || '')}
                  onChangeText={v => updateInventoryPolicy(inventoryId, 'minimum', v)}
                  keyboardType="numeric"
                />
                <Text>Máximo neste inventário</Text>
                <TextInput
                  style={inputStyle}
                  value={String(policy.maximum || '')}
                  onChangeText={v => updateInventoryPolicy(inventoryId, 'maximum', v)}
                  keyboardType="numeric"
                />
                <Text>Ponto de reposição neste inventário</Text>
                <TextInput
                  style={inputStyle}
                  value={String(policy.reorderPoint || '')}
                  onChangeText={v => updateInventoryPolicy(inventoryId, 'reorderPoint', v)}
                  keyboardType="numeric"
                />
                <Text>Lead time (dias) neste inventário</Text>
                <TextInput
                  style={inputStyle}
                  value={String(policy.leadTimeDays || '')}
                  onChangeText={v => updateInventoryPolicy(inventoryId, 'leadTimeDays', v)}
                  keyboardType="numeric"
                />
              </View>
            );
          })
        )}

        {!!status && <Text style={{color: '#1b7f34', marginBottom: 8}}>{status}</Text>}
        {!!error && <Text style={{color: '#b00020', marginBottom: 8}}>{error}</Text>}

        <TouchableOpacity
          onPress={saveStock}
          disabled={saving}
          style={{backgroundColor: '#000', padding: 12, borderRadius: 6, alignItems: 'center', marginBottom: 18}}>
          <Text style={{color: '#fff'}}>{saving ? 'Salvando...' : 'Salvar Estoque'}</Text>
        </TouchableOpacity>

        <Text style={{fontWeight: '600', marginBottom: 8}}>Snapshot por Inventário</Text>
        {inventoryRows.length === 0 ? (
          <Text style={{color: '#666'}}>Sem registros de estoque para este produto.</Text>
        ) : (
          inventoryRows.map((row, idx) => (
            <View key={`${row.inventory_name}-${idx}`} style={{borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8}}>
              <Text style={{fontWeight: '600'}}>{row.inventory_name}</Text>
              <Text>{`Disponível: ${row.available} ${row.productUnit || ''}`}</Text>
              <Text>{`Empresa: ${row.company_name || '-'}`}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default ProductStockForm;
