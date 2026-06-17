import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useStore } from '@store';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors as baseColors } from '@controleonline/../../src/styles/colors';
import styles from './ProductStockForm.styles';

import {
  MovementModal,
  EditStockModal,
} from '@controleonline/ui-products/src/react/pages/InventoryDetail';

import {
  inlineStyle_40_8,
  inlineStyle_49_24,
  inlineStyle_242_87,
  inlineStyle_269_89,
} from './ProductStockForm.styles';

import { inlineStyle_57_14 } from './ProductStockForm.styles';

/* ─── helpers ──────────────────────────────────────────────────────── */

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const toIRI = v => (typeof v === 'string' ? v : v?.['@id'] || null);

const iriToId = iri => {
  const s = toIRI(iri);
  if (!s) return null;
  const m = s.match(/\/(\d+)(?:\?.*)?$/);
  return m?.[1] ? m[1] : (s.replace(/\D/g, '') || null);
};

const resolveInvIRI = field => {
  if (!field) return null;
  const iri = toIRI(field);
  if (iri) return iri;
  if (field?.id) return `/inventories/${field.id}`;
  return null;
};

/* ─── skeleton ─────────────────────────────────────────────────────── */

const SkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={inlineStyle_40_8({
    height: height,
    mb: mb,
    width: width,
  })} />
);

const StockTabSkeleton = () => (
  <ScrollView contentContainerStyle={inlineStyle_57_14} showsVerticalScrollIndicator={false}>
    {[1, 2, 3].map(i => (
      <View key={i} style={styles.card}>
        <SkeletonLine width="40%" height={13} mb={14} />
        {[1, 2, 3].map(j => (
          <View key={j} style={inlineStyle_49_24}>
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
  const navigation      = rootNavigation || innerNavigation;

  const peopleStore      = useStore('people');
  const themeStore       = useStore('theme');
  const productInvStore  = useStore('product_inventories');
  const inventoriesStore = useStore('inventories');
  const productsStore    = useStore('products');

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      baseColors,
    ),
    [themeColors, currentCompany?.id],
  );

  const [piRows, setPiRows]           = useState(null);
  const [inventories, setInventories] = useState([]);
  const [invMap, setInvMap]           = useState({});
  const [movRow, setMovRow]           = useState(null);
  const [movInv, setMovInv]           = useState(null);
  const [editRow, setEditRow]         = useState(null);

  const productItem = productsStore.getters.item;

  /* IDs padrão de entrada e saída do produto */
  const defaultInId = useMemo(() => {
    const v = productItem?.defaultInInventory;
    if (!v) return null;
    const iri = toIRI(v);
    return iri ? String(iriToId(iri) || '') : String(v?.id || '');
  }, [productItem?.defaultInInventory]);

  const defaultOutId = useMemo(() => {
    const v = productItem?.defaultOutInventory;
    if (!v) return null;
    const iri = toIRI(v);
    return iri ? String(iriToId(iri) || '') : String(v?.id || '');
  }, [productItem?.defaultOutInventory]);

  /* ── carregamento ────────────────────────────────────────────────── */

  const loadData = useCallback(async () => {
    if (!ProductId || !currentCompany?.id) return;
    try {
      const [piData, invData] = await Promise.all([
        productInvStore.actions.getItems({ product: `/products/${ProductId}` }).catch(() => []),
        inventoriesStore.actions.getItems({
          people: `/people/${currentCompany.id}`,
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

  /* todos os inventários com seu piRow opcional */
  const mergedRows = useMemo(() => {
    const piMap = new Map();
    (piRows || []).forEach(r => {
      const invIRI = resolveInvIRI(r.inventory);
      const invId  = iriToId(invIRI) || String(r.inventory?.id || '');
      if (invId) piMap.set(String(invId), r);
    });
    return inventories.map(inv => ({
      inv,
      piRow: piMap.get(String(inv.id)) || null,
    }));
  }, [inventories, piRows]);

  /* ── callbacks ───────────────────────────────────────────────────── */

  const handleMoved = ({ rowId, delta }) => {
    setPiRows(prev => (prev || []).map(r =>
      r.id === rowId
        ? { ...r, available: Math.max(0, parseFloat(r.available ?? 0) + delta) }
        : r
    ));
  };

  const openMovement = piRow => {
    const invIRI = resolveInvIRI(piRow.inventory);
    const invId  = iriToId(invIRI) || piRow.inventory?.id;
    setMovInv({ id: invId, inventory: invMap[String(invId)] || `Depósito ${invId}` });
    setMovRow({
      id:            piRow.id,
      product:       {
        id:      ProductId,
        product: productItem?.product || null,
        type:    productItem?.type    || null,
        sku:     productItem?.sku     || null,
      },
      available:     piRow.available,
      minimum:       piRow.minimum,
      _inventoryIRI: invIRI,
    });
  };

  const openEdit = ({ inv, piRow }) => {
    if (piRow) {
      setEditRow({ ...piRow, product: productItem });
    } else {
      setEditRow({
        id:             null,
        _inventoryIRI:  `/inventories/${inv.id}`,
        _productIRI:    `/products/${ProductId}`,
        product:        productItem,
        minimum:        0,
        maximum:        0,
      });
    }
  };

  const handleEditSaved = savedRow => {
    if (savedRow?.id) {
      setPiRows(prev => {
        const list   = prev || [];
        const exists = list.some(r => r.id === savedRow.id);
        if (exists) return list.map(r => r.id === savedRow.id ? { ...r, ...savedRow } : r);
        return [...list, savedRow];
      });
    }
    setEditRow(null);
  };

  const openPurchaseFromStock = useCallback((params) => {
    let navRef = navigation;
    let guard  = 0;
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
    try { navigation.navigate('PurchaseFormPage', params); return true; } catch (_) {}
    return false;
  }, [navigation]);

  /* ── guards ──────────────────────────────────────────────────────── */

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

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Estoque por Depósito</Text>

          {mergedRows.length === 0 ? (
            <View style={styles.emptyBlock}>
              <MaterialCommunityIcons name="archive-outline" size={32} color="#CBD5E1" style={inlineStyle_242_87} />
              <Text style={styles.emptyCardText}>Nenhum local de estoque cadastrado.</Text>
            </View>
          ) : (
            mergedRows.map(({ inv, piRow }) => {
              const isDefaultIn  = !!defaultInId  && String(inv.id) === defaultInId;
              const isDefaultOut = !!defaultOutId && String(inv.id) === defaultOutId;
              const avail        = parseFloat(piRow?.available ?? 0);
              const min          = parseFloat(piRow?.minimum   ?? 0);
              const hasStock     = !!piRow && avail > 0;
              const hasPi        = !!piRow;
              const isBelowMin   = min > 0 && avail < min;

              const cardBg    = hasStock ? '#F0FDF4' : '#FFFFFF';
              const titleColor = hasStock ? '#166534' : '#475569';
              const iconColor  = hasStock ? '#166534' : '#94A3B8';
              /* disponível: verde se tem, vermelho se zerado */
              const availColor = hasStock ? '#166534' : '#DC2626';
              const availCellBg = hasStock
                ? (isBelowMin ? '#FEF2F2' : undefined)
                : '#FEF2F2';

              return (
                <View key={inv.id} style={[styles.snapshotCard, { backgroundColor: cardBg }]}>
                  {/* cabeçalho */}
                  <View style={styles.snapshotCardHeader}>
                    <MaterialCommunityIcons name="warehouse" size={16} color={iconColor} style={inlineStyle_269_89} />
                    <Text style={[styles.snapshotCardTitle, { color: titleColor }]}>{inv.inventory}</Text>
                  </View>
                  {/* badges padrão */}
                  {(isDefaultIn || isDefaultOut) && (
                    <View style={styles.badgesRow}>
                      {isDefaultOut && (
                        <View style={[styles.badge, { backgroundColor: '#FFF7ED' }]}>
                          <MaterialCommunityIcons name="arrow-up-circle-outline" size={10} color="#D97706" />
                          <Text style={[styles.badgeText, { color: '#D97706' }]}>Saída Padrão</Text>
                        </View>
                      )}
                      {isDefaultIn && (
                        <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                          <MaterialCommunityIcons name="arrow-down-circle-outline" size={10} color="#2563EB" />
                          <Text style={[styles.badgeText, { color: '#2563EB' }]}>Entrada Padrão</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {/* grid de valores — sempre exibido, zeros em vermelho quando sem estoque */}
                  <View style={styles.snapshotGrid}>
                    <View style={[styles.snapshotCell, availCellBg && { backgroundColor: availCellBg }]}>
                      <Text style={styles.snapshotCellLabel}>Disponível</Text>
                      <Text style={[styles.snapshotCellValue, { color: availColor }]}>
                        {fmtN(piRow?.available ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Vendas</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(piRow?.sales ?? 0)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Pedidos</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(piRow?.ordered ?? 0)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Trânsito</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(piRow?.transit ?? 0)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Mínimo</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(piRow?.minimum ?? 0)}</Text>
                    </View>
                    <View style={styles.snapshotCell}>
                      <Text style={styles.snapshotCellLabel}>Máximo</Text>
                      <Text style={styles.snapshotCellValue}>{fmtN(piRow?.maximum ?? 0)}</Text>
                    </View>
                  </View>
                  {/* botões de ação */}
                  <View style={styles.actionRow}>
                    {hasPi && (
                      <TouchableOpacity
                        style={[styles.movBtn, { backgroundColor: brandColors.primary + '18' }]}
                        onPress={() => openMovement(piRow)}
                        activeOpacity={0.75}
                      >
                        <MaterialCommunityIcons name="swap-vertical" size={14} color={brandColors.primary} />
                        <Text style={[styles.movBtnText, { color: brandColors.primary }]}>Movimentar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => openEdit({ inv, piRow })}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={14} color="#64748B" />
                      <Text style={styles.editBtnText}>Limites</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
      {/* Modal de movimentação */}
      <MovementModal
        visible={!!movRow}
        row={movRow}
        inventories={inventories}
        brandColors={brandColors}
        productInvStore={productInvStore}
        currentInventory={movInv}
        onOpenPurchase={openPurchaseFromStock}
        onOpenTransfer={openPurchaseFromStock}
        onClose={() => { setMovRow(null); setMovInv(null); }}
        onMoved={delta => {
          handleMoved(delta);
          setMovRow(null);
          setMovInv(null);
        }}
      />
      {/* Modal de edição de limites */}
      <EditStockModal
        visible={!!editRow}
        row={editRow}
        brandColors={brandColors}
        productInvStore={productInvStore}
        onClose={() => setEditRow(null)}
        onSaved={handleEditSaved}
      />
    </View>
  );
};

/* ─── estilos ───────────────────────────────────────────────────────── */

export default ProductStockForm;
