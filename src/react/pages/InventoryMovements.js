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
  Alert,
} from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { getMovements, clearMovements } from '@controleonline/ui-products/src/react/services/inventoryMovementLog';

/* ─── configurações ────────────────────────────────────────────────── */

const OP_CONFIG = {
  in:       { label: 'Entrada',       icon: 'arrow-down-circle',    color: '#16A34A', bg: '#F0FDF4' },
  out:      { label: 'Saída',         icon: 'arrow-up-circle',      color: '#DC2626', bg: '#FEF2F2' },
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

/* ─── componente de item ────────────────────────────────────────────── */

const MovementItem = ({ item }) => {
  const op = OP_CONFIG[item.type] || OP_CONFIG.in;
  return (
    <View style={styles.item}>
      {/* ícone operação */}
      <View style={[styles.itemIcon, { backgroundColor: op.bg }]}>
        <MaterialCommunityIcons name={op.icon} size={22} color={op.color} />
      </View>

      {/* corpo */}
      <View style={styles.itemBody}>
        <Text style={styles.itemProduct} numberOfLines={1}>{item.productName || `#${item.productId}`}</Text>

        <View style={styles.itemMeta}>
          <View style={[styles.opChip, { backgroundColor: op.bg }]}>
            <Text style={[styles.opChipText, { color: op.color }]}>{op.label}</Text>
          </View>
          {item.productType && PRODUCT_TYPE_LABELS[item.productType] && (
            <Text style={styles.metaText}>{PRODUCT_TYPE_LABELS[item.productType]}</Text>
          )}
        </View>

        <View style={styles.itemLocations}>
          <MaterialCommunityIcons name="warehouse" size={12} color="#94A3B8" />
          <Text style={styles.itemLocationText} numberOfLines={1}>
            {item.inventoryName}
            {item.type === 'transfer' && item.destInventoryName
              ? ` → ${item.destInventoryName}`
              : ''}
          </Text>
        </View>

        <Text style={styles.itemDate}>{fmtDate(item.timestamp)}</Text>
      </View>

      {/* quantidade */}
      <View style={styles.itemRight}>
        <Text style={[
          styles.itemQty,
          item.type === 'in'       && { color: '#16A34A' },
          item.type === 'out'      && { color: '#DC2626' },
          item.type === 'transfer' && { color: '#7C3AED' },
        ]}>
          {item.type === 'in' ? '+' : item.type === 'out' ? '-' : '↕'}
          {fmtN(item.quantity)}
        </Text>
        <View style={styles.balanceWrap}>
          <Text style={styles.balanceBefore}>{fmtN(item.availableBefore)}</Text>
          <MaterialCommunityIcons name="arrow-right" size={10} color="#CBD5E1" />
          <Text style={styles.balanceAfter}>{fmtN(item.availableAfter)}</Text>
        </View>
      </View>
    </View>
  );
};

/* ─── página ────────────────────────────────────────────────────────── */

const PAGE_SIZE = 30;

const InventoryMovementsPage = ({ route }) => {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 860);

  const peopleStore = useStore('people');
  const themeStore  = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  /* filtros pré-aplicados via params (quando vem do InventoryDetail) */
  const preInventoryId   = route.params?.inventoryId   || null;
  const preInventoryName = route.params?.inventoryName || null;

  const [movements, setMovements]         = useState([]);
  const [search, setSearch]               = useState('');
  const [filterType, setFilterType]       = useState(null);   /* null = todos */
  const [filterInvId, setFilterInvId]     = useState(preInventoryId);
  const [page, setPage]                   = useState(1);

  useFocusEffect(useCallback(() => {
    setMovements(getMovements());
    /* mantém filtro de inventário se veio pré-filtrado */
    if (preInventoryId) setFilterInvId(preInventoryId);
  }, []));

  /* inventários únicos presentes no log */
  const uniqueInventories = useMemo(() => {
    const map = new Map();
    movements.forEach(m => {
      if (m.inventoryId && m.inventoryName)
        map.set(String(m.inventoryId), m.inventoryName);
      if (m.destInventoryId && m.destInventoryName)
        map.set(String(m.destInventoryId), m.destInventoryName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [movements]);

  /* filtragem */
  const filtered = useMemo(() => {
    return movements.filter(m => {
      if (filterType && m.type !== filterType) return false;
      if (filterInvId) {
        const matches =
          String(m.inventoryId) === String(filterInvId) ||
          String(m.destInventoryId) === String(filterInvId);
        if (!matches) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!(m.productName || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [movements, filterType, filterInvId, search]);

  const displayed = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore   = displayed.length < filtered.length;

  const handleClear = () => {
    Alert.alert(
      'Limpar histórico',
      'Deseja apagar todo o histórico de movimentações? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: () => { clearMovements(); setMovements([]); },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Barra de busca */}
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
        {/* Tipo de operação */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
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

        {/* Local de estoque */}
        {uniqueInventories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            <TouchableOpacity
              style={[styles.filterChip, !filterInvId && styles.filterChipActive]}
              onPress={() => { setFilterInvId(null); setPage(1); }}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="warehouse" size={13} color={!filterInvId ? '#fff' : '#94A3B8'} />
              <Text style={[styles.filterChipText, !filterInvId && styles.filterChipTextActive]}>
                Todos os locais
              </Text>
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
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {inv.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Contador */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} {filtered.length === 1 ? 'movimentação' : 'movimentações'}
          {(filterType || filterInvId || search)
            ? ` · filtrado${filtered.length !== 1 ? 's' : ''}`
            : ''}
        </Text>
        {movements.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={15} color="#EF4444" />
            <Text style={styles.clearBtnText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
      >
        <View style={{ width: maxW, paddingHorizontal: 16, paddingTop: 4 }}>

          {/* Empty */}
          {movements.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="history" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma movimentação</Text>
              <Text style={styles.emptySubtitle}>
                O histórico registra entradas, saídas e transferências feitas por este aplicativo.
              </Text>
            </View>
          )}

          {movements.length > 0 && filtered.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="magnify-close" size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Sem resultados</Text>
              <Text style={styles.emptySubtitle}>Nenhuma movimentação para os filtros selecionados.</Text>
            </View>
          )}

          {/* Lista */}
          {displayed.length > 0 && (
            <View style={styles.card}>
              {displayed.map((item, idx) => (
                <View key={item.id} style={idx < displayed.length - 1 && styles.itemDivider}>
                  <MovementItem item={item} />
                </View>
              ))}
            </View>
          )}

          {/* Carregar mais */}
          {hasMore && (
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
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
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
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

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

  /* item */
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

  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemQty: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  balanceWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  balanceBefore: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  balanceAfter:  { fontSize: 10, color: '#475569', fontWeight: '700' },

  /* empty */
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
