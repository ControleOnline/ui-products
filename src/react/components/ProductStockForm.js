import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const toInt = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};

const fmtBRL = v => { const n = parseFloat(String(v || 0).replace(',', '.')); return isNaN(n) ? '0,00' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

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
  const inventoriesRequestCompanyRef = useRef(null);

  const brandColors = useMemo(() => resolveThemePalette(), []);

  useEffect(() => {
    if (!ProductId) return;
    productActions.get(ProductId).then(data => setProduct(data));
  }, [ProductId]);

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
    const companyId = String(currentCompany.id);
    const hasLoaded = Array.isArray(inventoriesGetters.items) && inventoriesGetters.items.length > 0;
    if (hasLoaded) return;
    if (inventoriesRequestCompanyRef.current === companyId) return;
    inventoriesRequestCompanyRef.current = companyId;
    inventoriesActions
      .getItems({company: currentCompany.id})
      .catch(() => {
        inventoriesRequestCompanyRef.current = null;
      });
  }, [currentCompany?.id, inventoriesGetters.items?.length]);

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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Salve o produto para habilitar a aba Estoque.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StateStore store="products" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Mensagens de status e erro */}
        {!!status && (
          <View style={styles.msgSuccess}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color="#166534" style={{marginRight: 6}} />
            <Text style={styles.msgSuccessText}>{status}</Text>
          </View>
        )}
        {!!error && (
          <View style={styles.msgError}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={{marginRight: 6}} />
            <Text style={styles.msgErrorText}>{error}</Text>
          </View>
        )}

        {/* Card: Configurações de Estoque (switches) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Configurações de Estoque</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelBlock}>
              <MaterialCommunityIcons name="package-variant-closed" size={18} color="#475569" style={{marginRight: 10}} />
              <Text style={styles.switchLabel}>Controla estoque</Text>
            </View>
            <Switch
              value={Boolean(stock.controlsStock)}
              onValueChange={v => updateStock('controlsStock', v)}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelBlock}>
              <MaterialCommunityIcons name="minus-circle-outline" size={18} color="#475569" style={{marginRight: 10}} />
              <Text style={styles.switchLabel}>Permitir estoque negativo</Text>
            </View>
            <Switch
              value={Boolean(stock.allowNegativeStock)}
              onValueChange={v => updateStock('allowNegativeStock', v)}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelBlock}>
              <MaterialCommunityIcons name="bookmark-outline" size={18} color="#475569" style={{marginRight: 10}} />
              <Text style={styles.switchLabel}>Reservar no pedido</Text>
            </View>
            <Switch
              value={Boolean(stock.reserveOnOrder)}
              onValueChange={v => updateStock('reserveOnOrder', v)}
            />
          </View>

          <View style={[styles.switchRow, {borderBottomWidth: 0}]}>
            <View style={styles.switchLabelBlock}>
              <MaterialCommunityIcons name="check-all" size={18} color="#475569" style={{marginRight: 10}} />
              <Text style={styles.switchLabel}>Baixa automática no confirmado</Text>
            </View>
            <Switch
              value={Boolean(stock.autoDeductOnConfirm)}
              onValueChange={v => updateStock('autoDeductOnConfirm', v)}
            />
          </View>
        </View>

        {/* Card: Parâmetros por Inventário */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Parâmetros por Inventário</Text>

          <Text style={styles.cardHint}>
            Os limites mínimos/máximos devem ser definidos por inventário (depósito, geladeira, almoxarifado).
          </Text>

          {inventoryPolicyRows.length === 0 ? (
            <Text style={styles.emptyCardText}>Sem inventários disponíveis para configurar.</Text>
          ) : (
            inventoryPolicyRows.map((row, idx) => {
              const inventoryId = String(row.inventoryId || '').trim();
              if (!inventoryId) return null;
              const policy = inventoryPolicies[inventoryId] || {};
              const available = row?.snapshot?.available;
              const unit = row?.snapshot?.productUnit || '';
              const availableText =
                available === undefined || available === null
                  ? '-'
                  : `${fmtBRL(available)}${unit ? ` ${unit}` : ''}`;

              return (
                <View key={`policy-${inventoryId}-${idx}`} style={styles.inventoryCard}>
                  <View style={styles.inventoryCardHeader}>
                    <View style={styles.inventoryCardTitleBlock}>
                      <MaterialCommunityIcons name="warehouse" size={16} color="#475569" style={{marginRight: 6}} />
                      <Text style={styles.inventoryCardTitle}>
                        {row.inventoryName || `Inventário ${inventoryId}`}
                      </Text>
                    </View>
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableBadgeText}>{availableText}</Text>
                    </View>
                  </View>

                  <View style={styles.row2col}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Mínimo</Text>
                      <TextInput
                        style={styles.input}
                        value={String(policy.minimum || '')}
                        onChangeText={v => updateInventoryPolicy(inventoryId, 'minimum', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                    <View style={[styles.col, {marginLeft: 10}]}>
                      <Text style={styles.label}>Máximo</Text>
                      <TextInput
                        style={styles.input}
                        value={String(policy.maximum || '')}
                        onChangeText={v => updateInventoryPolicy(inventoryId, 'maximum', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                  </View>

                  <View style={styles.row2col}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Ponto de reposição</Text>
                      <TextInput
                        style={styles.input}
                        value={String(policy.reorderPoint || '')}
                        onChangeText={v => updateInventoryPolicy(inventoryId, 'reorderPoint', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                    <View style={[styles.col, {marginLeft: 10}]}>
                      <Text style={styles.label}>Lead time (dias)</Text>
                      <TextInput
                        style={styles.input}
                        value={String(policy.leadTimeDays || '')}
                        onChangeText={v => updateInventoryPolicy(inventoryId, 'leadTimeDays', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Card: Snapshot por Inventário */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Snapshot por Inventário</Text>

          {inventoryRows.length === 0 ? (
            <View style={styles.snapshotEmpty}>
              <MaterialCommunityIcons name="archive-outline" size={28} color="#CBD5E1" style={{marginBottom: 6}} />
              <Text style={styles.emptyCardText}>Sem registros de estoque para este produto.</Text>
            </View>
          ) : (
            inventoryRows.map((row, idx) => (
              <View key={`${row.inventory_name}-${idx}`} style={styles.snapshotCard}>
                <View style={styles.snapshotCardHeader}>
                  <MaterialCommunityIcons name="cube-outline" size={16} color="#166534" style={{marginRight: 6}} />
                  <Text style={styles.snapshotCardTitle}>{row.inventory_name}</Text>
                </View>
                <View style={styles.snapshotRow}>
                  <Text style={styles.snapshotItem}>Disponível</Text>
                  <Text style={styles.snapshotValue}>
                    {`${fmtBRL(row.available)} ${row.productUnit || ''}`}
                  </Text>
                </View>
                <View style={styles.snapshotRow}>
                  <Text style={styles.snapshotItem}>Empresa</Text>
                  <Text style={styles.snapshotValue}>{row.company_name || '-'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Footer fixo com botão Salvar */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={saveStock}
          disabled={saving}
          style={[styles.footerBtnPrimary, {backgroundColor: brandColors?.primary || '#2563EB'}, saving && styles.btnDisabled]}>
          <MaterialCommunityIcons name="content-save-outline" size={15} color="#fff" style={{marginRight: 6}} />
          <Text style={styles.btnText}>{saving ? 'Salvando...' : 'Salvar Estoque'}</Text>
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
  emptyContainer: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  label: {
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
  row2col: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  switchLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  cardHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
    lineHeight: 18,
  },
  emptyCardText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  inventoryCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  inventoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inventoryCardTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inventoryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  availableBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  availableBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  snapshotEmpty: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  snapshotCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  snapshotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  snapshotCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  snapshotItem: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  snapshotValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    backgroundColor: '#fff',
  },
  footerBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  msgSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  msgSuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
  msgError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  msgErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#9e1b1b',
  },
});

export default ProductStockForm;
