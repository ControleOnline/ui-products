import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';

/* ─── configurações ─────────────────────────────────────────────────── */

const OP_CONFIG = {
  in:       { label: 'Entrada',       icon: 'arrow-down-circle',     color: '#16A34A', bg: '#F0FDF4' },
  out:      { label: 'Saída',         icon: 'arrow-up-circle',       color: '#DC2626', bg: '#FEF2F2' },
  transfer: { label: 'Transferência', icon: 'swap-horizontal-circle', color: '#7C3AED', bg: '#F5F3FF' },
};

const PRODUCT_TYPE_LABELS = {
  product:      'Produto',
  service:      'Serviço',
  component:    'Componente',
  feedstock:    'Matéria Prima',
  package:      'Embalagem',
  custom:       'Custom',
  manufactured: 'Fabricado',
};

const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const toIRI  = v => (typeof v === 'string' ? v : v?.['@id'] || null);
const iriToId = iri => { const s = toIRI(iri); return s ? (parseInt(s.split('/').pop(), 10) || null) : null; };

const resolveOpType = item => {
  if (item.inInventory && item.outInventory) return 'transfer';
  if (item.inInventory) return 'in';
  return 'out';
};

/* ─── componente de item ────────────────────────────────────────────── */

const MovementItem = ({ item }) => {
  const opType = item._opType || resolveOpType(item);
  const op = OP_CONFIG[opType] || OP_CONFIG.out;

  const productName = item.product?.product || item.product?.name
    || (typeof item.product === 'string' ? `#${iriToId(item.product)}` : '—');
  const productType = item.product?.type;
  const inInvName   = item._inInvName  || item.inInventory?.inventory  || null;
  const outInvName  = item._outInvName || item.outInventory?.inventory || null;
  const locationLabel = opType === 'transfer'
    ? `${outInvName || '?'} → ${inInvName || '?'}`
    : (outInvName || inInvName || '—');

  return (
    <View style={styles.item}>
      <View style={[styles.itemIcon, { backgroundColor: op.bg }]}>
        <MaterialCommunityIcons name={op.icon} size={22} color={op.color} />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemProduct} numberOfLines={1}>{productName}</Text>
        <View style={styles.itemMeta}>
          <View style={[styles.opChip, { backgroundColor: op.bg }]}>
            <Text style={[styles.opChipText, { color: op.color }]}>{op.label}</Text>
          </View>
          {productType && PRODUCT_TYPE_LABELS[productType] && (
            <Text style={styles.metaText}>{PRODUCT_TYPE_LABELS[productType]}</Text>
          )}
        </View>
        <View style={styles.itemLocations}>
          <MaterialCommunityIcons name="warehouse" size={12} color="#94A3B8" />
          <Text style={styles.itemLocationText} numberOfLines={1}>{locationLabel}</Text>
        </View>
        <Text style={styles.itemDate}>
          {item._orderDate ? fmtDate(item._orderDate) : `Pedido #${iriToId(item._orderIRI) || item.id}`}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[
          styles.itemQty,
          opType === 'in'       && { color: '#16A34A' },
          opType === 'out'      && { color: '#DC2626' },
          opType === 'transfer' && { color: '#7C3AED' },
        ]}>
          {opType === 'in' ? '+' : opType === 'out' ? '-' : '↕'}
          {fmtN(item.quantity)}
        </Text>
      </View>
    </View>
  );
};

/* ─── helper: merge + deduplicação por id ──────────────────────────── */

function mergeDedup(arr) {
  const seen = new Set();
  const out  = [];
  for (const item of arr) {
    if (item?.id != null && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/* ─── página ────────────────────────────────────────────────────────── */

const PAGE_SIZE = 30;

const InventoryMovementsPage = ({ route }) => {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 860);

  const peopleStore      = useStore('people');
  const themeStore       = useStore('theme');
  const orderProdStore   = useStore('order_products');
  const ordersStore      = useStore('orders');
  const inventoriesStore = useStore('inventories');

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  const preInventoryId   = route.params?.inventoryId   || null;
  const preInventoryName = route.params?.inventoryName || null;

  const [movements, setMovements]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState(null);
  const [filterInvId, setFilterInvId] = useState(preInventoryId ? String(preInventoryId) : null);
  const [page, setPage]               = useState(1);

  /* ── carregamento ──────────────────────────────────────────────── */
  const loadMovements = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      /* sempre carrega inventários para montar mapa id → nome */
      const invData = await inventoriesStore.actions.getItems({
        people: `/people/${currentCompany.id}`,
      }).catch(() => []);
      const invList = invData || [];
      const invMap  = {};
      invList.forEach(inv => { if (inv.id) invMap[String(inv.id)] = inv.inventory; });
      /* inclui nome pré-filtrado (caso venha via params e não esteja na lista) */
      if (preInventoryId && preInventoryName) invMap[String(preInventoryId)] = preInventoryName;

      let rawItems = [];

      if (preInventoryId) {
        const invIRI = `/inventories/${preInventoryId}`;
        const [inData, outData] = await Promise.all([
          orderProdStore.actions.getItems({ 'inInventory':  invIRI, 'order[id]': 'DESC' }).catch(() => []),
          orderProdStore.actions.getItems({ 'outInventory': invIRI, 'order[id]': 'DESC' }).catch(() => []),
        ]);
        rawItems = mergeDedup([...(inData || []), ...(outData || [])]);
      } else {
        const pairs = await Promise.all(
          invList.map(inv => {
            const iri = `/inventories/${inv.id}`;
            return Promise.all([
              orderProdStore.actions.getItems({ 'inInventory':  iri, 'order[id]': 'DESC' }).catch(() => []),
              orderProdStore.actions.getItems({ 'outInventory': iri, 'order[id]': 'DESC' }).catch(() => []),
            ]);
          })
        );
        rawItems = mergeDedup(pairs.flatMap(([a, b]) => [...(a || []), ...(b || [])]));
      }

      rawItems.sort((a, b) => b.id - a.id);

      /* busca datas das orders (dedup por IRI) */
      const orderIRIs = [...new Set(rawItems.map(m => toIRI(m.order)).filter(Boolean))];
      const orderIds  = orderIRIs.map(iri => iri.split('/').pop()).filter(Boolean);
      const orderDetails = await Promise.all(
        orderIds.map(id => ordersStore.actions.get(id).catch(() => null))
      );
      const orderMap = {};
      orderDetails.forEach(o => { if (o?.id) orderMap[String(o.id)] = o; });

      /* resolve nome do inventário a partir do IRI (já que a API não retorna o nome embutido) */
      const resolveInvName = field => {
        if (!field) return null;
        const iri = toIRI(field);
        const id  = iri ? String(iriToId(iri)) : (field?.id ? String(field.id) : null);
        return id ? (invMap[id] || null) : null;
      };

      const enriched = rawItems.map(item => {
        const orderIRI   = toIRI(item.order);
        const orderId    = orderIRI ? String(orderIRI.split('/').pop()) : null;
        const order      = orderId ? orderMap[orderId] : null;
        const inInvName  = resolveInvName(item.inInventory);
        const outInvName = resolveInvName(item.outInventory);
        return {
          ...item,
          _opType:     resolveOpType(item),
          _orderIRI:   orderIRI,
          _orderId:    orderId,
          _orderDate:  order?.orderDate || order?.alterDate || null,
          _inInvName:  inInvName,
          _outInvName: outInvName,
        };
      });

      setMovements(enriched);
    } catch (_) {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, preInventoryId, preInventoryName]);

  useFocusEffect(useCallback(() => { loadMovements(); }, [loadMovements]));

  /* ── inventários únicos ─────────────────────────────────────────── */
  const uniqueInventories = useMemo(() => {
    const map = new Map();
    movements.forEach(m => {
      const inId  = m.inInventory?.id  || iriToId(toIRI(m.inInventory));
      const outId = m.outInventory?.id || iriToId(toIRI(m.outInventory));
      if (inId  && m._inInvName)  map.set(String(inId),  m._inInvName);
      if (outId && m._outInvName) map.set(String(outId), m._outInvName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [movements]);

  /* ── filtragem ──────────────────────────────────────────────────── */
  const filtered = useMemo(() => movements.filter(m => {
    if (filterType && m._opType !== filterType) return false;
    if (filterInvId) {
      const inId  = String(m.inInventory?.id  || iriToId(toIRI(m.inInventory))  || '');
      const outId = String(m.outInventory?.id || iriToId(toIRI(m.outInventory)) || '');
      if (inId !== String(filterInvId) && outId !== String(filterInvId)) return false;
    }
    if (search.trim()) {
      const q    = search.trim().toLowerCase();
      const name = m.product?.product || m.product?.name || '';
      if (!name.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [movements, filterType, filterInvId, search]);

  const displayed = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore   = displayed.length < filtered.length;

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.container}>

      {/* Busca */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar produto..."
          placeholderTextColor="#CBD5E1"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterType && styles.filterChipActive]}
            onPress={() => { setFilterType(null); setPage(1); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, !filterType && styles.filterChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {Object.entries(OP_CONFIG).map(([key, conf]) => {
            const active = filterType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, active && { backgroundColor: conf.bg, borderColor: conf.color }]}
                onPress={() => { setFilterType(active ? null : key); setPage(1); }}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name={conf.icon} size={14} color={active ? conf.color : '#94A3B8'} />
                <Text style={[styles.filterChipText, active && { color: conf.color }]}>{conf.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {uniqueInventories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            <TouchableOpacity
              style={[styles.filterChip, !filterInvId && styles.filterChipActive]}
              onPress={() => { setFilterInvId(null); setPage(1); }}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="warehouse" size={13} color={!filterInvId ? '#fff' : '#94A3B8'} />
              <Text style={[styles.filterChipText, !filterInvId && styles.filterChipTextActive]}>Todos os locais</Text>
            </TouchableOpacity>
            {uniqueInventories.map(inv => {
              const active = String(filterInvId) === String(inv.id);
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => { setFilterInvId(active ? null : inv.id); setPage(1); }}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="warehouse" size={13} color={active ? '#fff' : '#94A3B8'} />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{inv.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Contador */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {loading ? 'Carregando...' : (
            `${filtered.length} ${filtered.length === 1 ? 'movimentação' : 'movimentações'}`
            + ((filterType || filterInvId || search) ? ` · filtrado${filtered.length !== 1 ? 's' : ''}` : '')
          )}
        </Text>
        <TouchableOpacity onPress={loadMovements} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}>
        <View style={{ width: maxW, paddingHorizontal: 16, paddingTop: 4 }}>

          {loading && (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={brandColors.primary} />
              <Text style={[styles.emptySubtitle, { marginTop: 16 }]}>Carregando histórico...</Text>
            </View>
          )}

          {!loading && movements.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="history" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma movimentação</Text>
              <Text style={styles.emptySubtitle}>
                Entradas, saídas e transferências feitas pelo app aparecem aqui.
              </Text>
            </View>
          )}

          {!loading && movements.length > 0 && filtered.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="magnify-close" size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Sem resultados</Text>
              <Text style={styles.emptySubtitle}>Nenhuma movimentação para os filtros selecionados.</Text>
            </View>
          )}

          {!loading && displayed.length > 0 && (
            <View style={styles.card}>
              {displayed.map((item, idx) => (
                <View key={item.id} style={idx < displayed.length - 1 && styles.itemDivider}>
                  <MovementItem item={item} />
                </View>
              ))}
            </View>
          )}

          {!loading && hasMore && (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { borderColor: brandColors.primary }]}
              onPress={() => setPage(p => p + 1)}
              activeOpacity={0.75}
            >
              <Text style={[styles.loadMoreText, { color: brandColors.primary }]}>
                Carregar mais ({filtered.length - displayed.length} restantes)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─── estilos ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 6 },

  filtersWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingVertical: 8, gap: 6,
  },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  filterChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  countText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  refreshBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },

  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, marginTop: 12, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },

  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  itemIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemBody: { flex: 1, gap: 3 },
  itemProduct: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  opChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  opChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  metaText: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  itemLocations: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemLocationText: { fontSize: 11, color: '#64748B', flex: 1 },
  itemDate: { fontSize: 10, color: '#CBD5E1', fontWeight: '500' },

  itemRight: { alignItems: 'flex-end' },
  itemQty: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },

  loadMoreBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});

export default InventoryMovementsPage;
