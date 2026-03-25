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
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';

const TYPE_CONFIG = {
  default:      { label: 'Padrão',       color: '#3B82F6', bg: '#EFF6FF' },
  warehouse:    { label: 'Depósito',     color: '#D97706', bg: '#FFFBEB' },
};

const PRODUCT_TYPE_CONFIG = {
  product:      { label: 'Produto',       color: '#3B82F6', bg: '#EFF6FF' },
  service:      { label: 'Serviço',       color: '#8B5CF6', bg: '#F5F3FF' },
  component:    { label: 'Componente',    color: '#F97316', bg: '#FFF7ED' },
  feedstock:    { label: 'Matéria Prima', color: '#16A34A', bg: '#F0FDF4' },
  package:      { label: 'Embalagem',     color: '#0891B2', bg: '#ECFEFF' },
  custom:       { label: 'Custom',        color: '#DB2777', bg: '#FDF2F8' },
  manufactured: { label: 'Fabricado',     color: '#D97706', bg: '#FFFBEB' },
};

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const SkeletonRow = () => (
  <View style={skeletonStyles.row}>
    <View style={{ flex: 1, gap: 6 }}>
      <View style={[skeletonStyles.line, { width: '60%', height: 13 }]} />
      <View style={[skeletonStyles.line, { width: '35%', height: 10 }]} />
    </View>
    <View style={[skeletonStyles.line, { width: 48, height: 28 }]} />
  </View>
);

const InventoryDetailPage = ({ route }) => {
  const { inventory } = route.params;
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const productInventoriesStore = useStore('product_inventories');
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');

  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  /* modal de ajuste de saldo */
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editAvailable, setEditAvailable] = useState('');
  const [editMinimum, setEditMinimum] = useState('');
  const [editMaximum, setEditMaximum] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const maxContentWidth = 860;
  const containerWidth = Math.min(width, maxContentWidth);

  const loadRows = useCallback(async () => {
    if (!currentCompany?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const invId = String(inventory.id);

      /* carrega dados de estoque e registros do product_inventories em paralelo */
      const [stockData, piData] = await Promise.all([
        productsStore.actions.getInventory({ company: currentCompany.id }),
        productInventoriesStore.actions.getItems({ 'inventory.id': invId }).catch(() => []),
      ]);

      /* monta mapa de product_id → product_inventory_id */
      const piMap = {};
      (piData || []).forEach(pi => {
        const pid = String(pi.product?.id || pi.product?.['@id']?.replace(/\D/g, '') || '');
        if (pid) piMap[pid] = pi.id;
      });

      const filtered = (stockData || [])
        .filter(r => String(r.inventory_id) === invId)
        .map(r => ({
          ...r,
          product_inventory_id: r.product_inventory_id || piMap[String(r.product_id)] || null,
        }));

      setRows(filtered);
    } catch (_) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, inventory.id]);

  useFocusEffect(useCallback(() => { loadRows(); }, [loadRows]));

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r => (r.product_name || '').toLowerCase().includes(q));
  }, [rows, search]);

  /* abre modal de ajuste */
  const openEdit = row => {
    setEditRow(row);
    setEditAvailable(String(row.available ?? 0));
    setEditMinimum(String(row.minimum ?? 0));
    setEditMaximum(String(row.maximum ?? 0));
    setSaveError('');
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditRow(null);
    setSaveError('');
  };

  const handleSaveStock = async () => {
    if (!editRow) return;
    setSaving(true);
    setSaveError('');
    try {
      /* usa o product_inventories store para PUT */
      await productInventoriesStore.actions.save({
        id: editRow.product_inventory_id,
        available: parseFloat(String(editAvailable).replace(',', '.')) || 0,
        minimum:   parseFloat(String(editMinimum).replace(',', '.')) || 0,
        maximum:   parseFloat(String(editMaximum).replace(',', '.')) || 0,
      });

      /* atualiza localmente */
      setRows(prev => prev.map(r =>
        r.product_inventory_id === editRow.product_inventory_id
          ? {
              ...r,
              available: parseFloat(String(editAvailable).replace(',', '.')) || 0,
              minimum:   parseFloat(String(editMinimum).replace(',', '.')) || 0,
              maximum:   parseFloat(String(editMaximum).replace(',', '.')) || 0,
            }
          : r
      ));
      closeEditModal();
    } catch (e) {
      setSaveError(
        e?.response?.data?.['hydra:description'] ||
        e?.message ||
        'Erro ao salvar'
      );
    } finally {
      setSaving(false);
    }
  };

  const typeConf = TYPE_CONFIG[inventory.type] || TYPE_CONFIG.default;

  return (
    <SafeAreaView style={styles.container}>

      {/* Cabeçalho do inventário */}
      <View style={styles.inventoryHeader}>
        <View style={[styles.inventoryIconWrap, { backgroundColor: typeConf.bg }]}>
          <MaterialCommunityIcons
            name={inventory.type === 'warehouse' ? 'warehouse' : 'home-outline'}
            size={22}
            color={typeConf.color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inventoryName}>{inventory.inventory}</Text>
          <View style={[styles.typeChip, { backgroundColor: typeConf.bg }]}>
            <Text style={[styles.typeChipText, { color: typeConf.color }]}>{typeConf.label}</Text>
          </View>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeLabel}>produtos</Text>
          <Text style={styles.totalBadgeCount}>{rows.length}</Text>
        </View>
      </View>

      {/* Busca */}
      {!loading && rows.length > 0 && (
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar produto..."
            placeholderTextColor="#CBD5E1"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
      >
        <View style={{ width: containerWidth, paddingHorizontal: 16, paddingTop: 8 }}>

          {/* Skeleton */}
          {loading && (
            <View style={styles.card}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </View>
          )}

          {/* Empty */}
          {!loading && rows.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="archive-outline" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum produto</Text>
              <Text style={styles.emptySubtitle}>
                Este local ainda não possui saldos de estoque registrados.
              </Text>
            </View>
          )}

          {/* Lista de saldos */}
          {!loading && filteredRows.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>Saldos de Estoque</Text>
                <Text style={styles.cardHeaderCount}>
                  {filteredRows.length} {filteredRows.length === 1 ? 'produto' : 'produtos'}
                  {search ? ` · "${search}"` : ''}
                </Text>
              </View>

              {filteredRows.map((row, idx) => {
                const ptConf = PRODUCT_TYPE_CONFIG[row.product_type] || null;
                const isLow = row.minimum > 0 && row.available <= row.minimum;
                return (
                  <View
                    key={`${row.product_inventory_id || row.product_id}-${idx}`}
                    style={[styles.productRow, idx < filteredRows.length - 1 && styles.productRowDivider]}
                  >
                    <View style={styles.productRowLeft}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {row.product_name || `Produto #${row.product_id}`}
                      </Text>
                      <View style={styles.productMeta}>
                        {ptConf && (
                          <View style={[styles.miniChip, { backgroundColor: ptConf.bg }]}>
                            <Text style={[styles.miniChipText, { color: ptConf.color }]}>{ptConf.label}</Text>
                          </View>
                        )}
                        {row.product_sku ? (
                          <Text style={styles.skuText}>SKU {row.product_sku}</Text>
                        ) : null}
                      </View>

                      {/* Grid de saldos */}
                      <View style={styles.stockGrid}>
                        <View style={styles.stockCell}>
                          <Text style={styles.stockCellLabel}>Vendas</Text>
                          <Text style={styles.stockCellValue}>{fmtN(row.sales)}</Text>
                        </View>
                        <View style={styles.stockCell}>
                          <Text style={styles.stockCellLabel}>Pedidos</Text>
                          <Text style={styles.stockCellValue}>{fmtN(row.ordered)}</Text>
                        </View>
                        <View style={styles.stockCell}>
                          <Text style={styles.stockCellLabel}>Trânsito</Text>
                          <Text style={styles.stockCellValue}>{fmtN(row.transit)}</Text>
                        </View>
                        <View style={styles.stockCell}>
                          <Text style={styles.stockCellLabel}>Mínimo</Text>
                          <Text style={styles.stockCellValue}>{fmtN(row.minimum)}</Text>
                        </View>
                        <View style={styles.stockCell}>
                          <Text style={styles.stockCellLabel}>Máximo</Text>
                          <Text style={styles.stockCellValue}>{fmtN(row.maximum)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Disponível + botão editar */}
                    <View style={styles.productRowRight}>
                      <View style={[styles.availableBadge, isLow && styles.availableBadgeLow]}>
                        <Text style={[styles.availableValue, isLow && styles.availableValueLow]}>
                          {fmtN(row.available)}
                        </Text>
                        <Text style={[styles.availableLabel, isLow && styles.availableLabelLow]}>
                          disp.
                        </Text>
                      </View>
                      {!!row.product_inventory_id && (
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => openEdit(row)}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={15} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Sem resultado de busca */}
          {!loading && rows.length > 0 && filteredRows.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="magnify-close" size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Nenhum resultado</Text>
              <Text style={styles.emptySubtitle}>
                Nenhum produto encontrado para "{search}".
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de ajuste de saldo */}
      <AnimatedModal
        visible={editModalVisible}
        onRequestClose={closeEditModal}
        style={{ justifyContent: 'flex-end' }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Ajustar Saldo</Text>
              {editRow && (
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {editRow.product_name}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={closeEditModal} style={styles.headerCloseButton}>
              <MaterialCommunityIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              {!!saveError && (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{saveError}</Text>
                </View>
              )}

              <View style={styles.editFieldsGrid}>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Disponível</Text>
                  <TextInput
                    style={[styles.editInput, styles.editInputHighlight]}
                    value={editAvailable}
                    onChangeText={setEditAvailable}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Mínimo</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editMinimum}
                    onChangeText={setEditMinimum}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Máximo</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editMaximum}
                    onChangeText={setEditMaximum}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={styles.editInfoBox}>
                <MaterialCommunityIcons name="information-outline" size={14} color="#64748B" />
                <Text style={styles.editInfoText}>
                  Vendas, pedidos e trânsito são atualizados automaticamente pelo sistema.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={closeEditModal}>
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: brandColors.primary }, saving && styles.modalSaveButtonDisabled]}
              onPress={handleSaveStock}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSaveButtonText}>Salvar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </SafeAreaView>
  );
};

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  line: {
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* cabeçalho inventário */
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  inventoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  typeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  totalBadge: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  totalBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalBadgeCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },

  /* busca */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 6,
  },
  searchClear: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },

  /* card lista */
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardHeaderCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },

  /* linha de produto */
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  productRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  productRowLeft: { flex: 1 },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  miniChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  miniChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skuText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* grid saldos */
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stockCell: {
    backgroundColor: '#F8FAFC',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 52,
  },
  stockCellLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  stockCellValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  productRowRight: {
    alignItems: 'center',
    gap: 8,
  },
  availableBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 56,
  },
  availableBadgeLow: {
    backgroundColor: '#FFF7ED',
  },
  availableValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  availableValueLow: {
    color: '#D97706',
  },
  availableLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#86EFAC',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  availableLabelLow: {
    color: '#FCD34D',
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
  },

  /* modal */
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  modalScroll: { flexShrink: 1 },
  modalBody: { padding: 24, gap: 16 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: { fontSize: 13, color: '#DC2626', flex: 1 },

  editFieldsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  editField: { flex: 1, gap: 6 },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  editInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
  },
  editInputHighlight: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
  },
  editInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  editInfoText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 17,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.7,
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default InventoryDetailPage;
