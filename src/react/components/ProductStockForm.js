import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStore } from '@store';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors as baseColors } from '@controleonline/../../src/styles/colors';
import { MovementModal } from '@controleonline/ui-products/src/react/pages/InventoryDetail';

/* ─── helpers ──────────────────────────────────────────────────────── */

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const toIRI = v => (typeof v === 'string' ? v : v?.['@id'] || null);
const iriToId = iri => { const s = toIRI(iri); return s ? (parseInt(s.split('/').pop(), 10) || null) : null; };

const resolveInvIRI = field => {
  if (!field) return null;
  const iri = toIRI(field);
  if (iri) return iri;
  if (field?.id) return `/inventories/${field.id}`;
  return null;
};

/* ─── skeleton ─────────────────────────────────────────────────────── */

const SkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={{ width, height, borderRadius: 7, backgroundColor: '#E2E8F0', marginBottom: mb }} />
);

const StockTabSkeleton = () => (
  <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
    {[1, 2].map(i => (
      <View key={i} style={styles.card}>
        <SkeletonLine width="40%" height={13} mb={14} />
        {[1, 2, 3].map(j => (
          <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SkeletonLine width="50%" height={13} mb={0} />
            <SkeletonLine width="25%" height={13} mb={0} />
          </View>
        ))}
      </View>
    ))}
  </ScrollView>
);

/* ─── componente ────────────────────────────────────────────────────── */

const ProductStockForm = ({ ProductId, rootNavigation }) => {
  const innerNavigation = useNavigation();
  const navigation = rootNavigation || innerNavigation;
  const peopleStore     = useStore('people');
  const themeStore      = useStore('theme');
  const productInvStore = useStore('product_inventories');
  const inventoriesStore = useStore('inventories');
  const productsStore   = useStore('products');

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      baseColors,
    ),
    [themeColors, currentCompany?.id],
  );

  const [piRows, setPiRows]         = useState(null);
  const [inventories, setInventories] = useState([]);
  const [invMap, setInvMap]         = useState({});
  const [movRow, setMovRow]         = useState(null);   /* row aberto no MovementModal */
  const [movInv, setMovInv]         = useState(null);   /* currentInventory para o modal */

  /* produto atual (nome para exibir no modal) */
  const productItem = productsStore.getters.item;

  const loadData = useCallback(async () => {
    if (!ProductId || !currentCompany?.id) return;
    try {
      const [piData, invData] = await Promise.all([
        productInvStore.actions.getItems({ product: `/products/${ProductId}` }).catch(() => []),
        inventoriesStore.actions.getItems({
          people: `/people/${currentCompany.id}`,
          itemsPerPage: 200,
        }).catch(() => []),
      ]);
      const map = {};
      (invData || []).forEach(inv => { if (inv.id) map[String(inv.id)] = inv.inventory; });
      setInvMap(map);
      setInventories(invData || []);
      setPiRows(piData || []);
    } catch (_) {
      setPiRows([]);
    }
  }, [ProductId, currentCompany?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  /* atualização otimista de saldo após movimentação */
  const handleMoved = ({ rowId, delta }) => {
    setPiRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, available: Math.max(0, parseFloat(r.available ?? 0) + delta) }
        : r
    ));
  };

  /* monta o row no formato esperado por MovementModal */
  const openMovement = piRow => {
    const invIRI = resolveInvIRI(piRow.inventory);
    const invId  = iriToId(invIRI) || piRow.inventory?.id;
    setMovInv({ id: invId, inventory: invMap[String(invId)] || `Depósito ${invId}` });
    setMovRow({
      id:             piRow.id,
      product:        {
        id:      ProductId,
        product: productItem?.product || null,
        type:    productItem?.type    || null,
        sku:     productItem?.sku     || null,
      },
      available:      piRow.available,
      minimum:        piRow.minimum,
      _inventoryIRI:  invIRI,
    });
  };

  const openPurchaseFromStock = useCallback((params) => {
    let navRef = navigation;
    let guard = 0;
    while (navRef && guard < 10) {
      try {
        const routeNames = navRef?.getState?.()?.routeNames || [];
        if (Array.isArray(routeNames) && routeNames.includes('PurchaseFormPage')) {
          navRef.navigate('PurchaseFormPage', params);
          return true;
        }
      } catch (_) {}
      navRef = navRef?.getParent?.();
      guard += 1;
    }

    try {
      navigation.navigate('PurchaseFormPage', params);
      return true;
    } catch (_) {}

    return false;
  }, [navigation]);

  /* ── guards ─────────────────────────────────────────────────────── */
  if (!ProductId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Salve o produto para visualizar o estoque.</Text>
      </View>
    );
  }

  if (piRows === null) {
    return <View style={styles.container}><StockTabSkeleton /></View>;
  }

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Estoque por Depósito</Text>

          {piRows.length === 0 ? (
            <View style={styles.emptyBlock}>
              <MaterialCommunityIcons name="archive-outline" size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyCardText}>Nenhum registro de estoque para este produto.</Text>
            </View>
          ) : (
            piRows.map((row, idx) => {
              const invIRI  = resolveInvIRI(row.inventory);
              const invId   = iriToId(invIRI) || row.inventory?.id;
              const invName = invMap[String(invId)] || `Depósito ${invId}`;
              const avail   = parseFloat(row.available ?? 0);
              const min     = parseFloat(row.minimum   ?? 0);
              const isBelowMin = min > 0 && avail < min;

              return (
                <View key={row.id || idx} style={styles.snapshotCard}>
                  {/* cabeçalho do card */}
                  <View style={styles.snapshotCardHeader}>
                    <MaterialCommunityIcons name="warehouse" size={16} color="#166534" style={{ marginRight: 6 }} />
                    <Text style={styles.snapshotCardTitle}>{invName}</Text>

                    {/* botão movimentar */}
                    <TouchableOpacity
                      style={[styles.movBtn, { backgroundColor: brandColors.primary + '18' }]}
                      onPress={() => openMovement(row)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons name="swap-vertical" size={15} color={brandColors.primary} />
                      <Text style={[styles.movBtnText, { color: brandColors.primary }]}>Movimentar</Text>
                    </TouchableOpacity>
                  </View>

                  {/* grid de valores */}
                  <View style={styles.snapshotGrid}>
                    <View style={[styles.snapshotCell, isBelowMin && styles.snapshotCellWarn]}>
                      <Text style={styles.snapshotCellLabel}>Disponível</Text>
                      <Text style={[styles.snapshotCellValue, { color: isBelowMin ? '#DC2626' : '#166534' }]}>
                        {fmtN(row.available)}
                      </Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Vendas</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(row.sales)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Pedidos</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(row.ordered)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Trânsito</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(row.transit)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Mínimo</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(row.minimum)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Máximo</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(row.maximum)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* Modal de movimentação — reutilizado de InventoryDetail */}
      <MovementModal
        visible={!!movRow}
        row={movRow}
        inventories={inventories}
        brandColors={brandColors}
        productInvStore={productInvStore}
        currentInventory={movInv}
        onOpenPurchase={openPurchaseFromStock}
        onClose={() => { setMovRow(null); setMovInv(null); }}
        onMoved={delta => {
          handleMoved(delta);
          setMovRow(null);
          setMovInv(null);
        }}
      />
    </View>
  );
};

/* ─── estilos ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: { padding: 16 },
  emptyText:     { fontSize: 14, color: '#64748B' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
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

  emptyBlock:    { alignItems: 'center', paddingVertical: 24 },
  emptyCardText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  snapshotCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  snapshotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  snapshotCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    flex: 1,
  },
  movBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  movBtnText: { fontSize: 12, fontWeight: '700' },

  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  snapshotCell: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  snapshotCellWarn: {
    backgroundColor: '#FEF2F2',
  },
  snapshotCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  snapshotCellValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
});

export default ProductStockForm;
