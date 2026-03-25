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

/* ─── Configurações visuais ─────────────────────────────────────────── */

const INV_TYPE_CONFIG = {
  default:      { label: 'Padrão',   icon: 'home-outline', color: '#3B82F6', bg: '#EFF6FF' },
  warehouse:    { label: 'Depósito', icon: 'warehouse',     color: '#D97706', bg: '#FFFBEB' },
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

/* extrai dados do campo `product` que pode ser IRI ou objeto */
const extractProduct = p => {
  if (!p) return { id: null, name: null, type: null, sku: null };
  if (typeof p === 'object') {
    return {
      id:   p.id || null,
      name: p.product || null,
      type: p.type || null,
      sku:  p.sku || null,
    };
  }
  /* é uma string IRI como "/products/15" */
  const id = String(p).replace(/\D/g, '') || null;
  return { id, name: null, type: null, sku: null };
};

/* ─── Skeleton ──────────────────────────────────────────────────────── */

const SkeletonRow = () => (
  <View style={skeletonStyles.row}>
    <View style={{ flex: 1, gap: 6 }}>
      <View style={[skeletonStyles.line, { width: '60%', height: 13 }]} />
      <View style={[skeletonStyles.line, { width: '35%', height: 10 }]} />
    </View>
    <View style={[skeletonStyles.line, { width: 48, height: 36 }]} />
  </View>
);

/* ═══════════════════════════════════════════════════════════════════════
   Página principal
   ═══════════════════════════════════════════════════════════════════════ */

const InventoryDetailPage = ({ route }) => {
  const { inventory } = route.params;
  const { width } = useWindowDimensions();

  const productsStore        = useStore('products');
  const productInvStore      = useStore('product_inventories');
  const peopleStore          = useStore('people');
  const themeStore           = useStore('theme');

  const { currentCompany }   = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  const maxContentWidth = 860;
  const containerWidth  = Math.min(width, maxContentWidth);

  /* ── estado principal ── */
  const [loading, setLoading]       = useState(true);
  const [rows, setRows]             = useState([]);   /* registros product_inventories */
  const [search, setSearch]         = useState('');

  /* ── modal ajuste de saldo ── */
  const [editVisible, setEditVisible]   = useState(false);
  const [editRow, setEditRow]           = useState(null);
  const [editAvailable, setEditAvailable] = useState('');
  const [editMinimum, setEditMinimum]   = useState('');
  const [editMaximum, setEditMaximum]   = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');

  /* ── modal adicionar produto ── */
  const [addVisible, setAddVisible]     = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addAvailable, setAddAvailable] = useState('0');
  const [addMinimum, setAddMinimum]     = useState('0');
  const [addMaximum, setAddMaximum]     = useState('0');
  const [addSaving, setAddSaving]       = useState(false);
  const [addError, setAddError]         = useState('');

  /* ── carrega product_inventories filtrado pelo inventory ── */
  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productInvStore.actions.getItems({
        'inventory': `/inventories/${inventory.id}`,
      });
      setRows(data || []);
    } catch (_) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [inventory.id]);

  useFocusEffect(useCallback(() => { loadRows(); }, [loadRows]));

  /* ── filtragem local por nome ── */
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const { name } = extractProduct(r.product);
      return (name || '').toLowerCase().includes(q);
    });
  }, [rows, search]);

  /* ── modal editar saldo ── */
  const openEdit = row => {
    setEditRow(row);
    setEditAvailable(String(row.available ?? 0));
    setEditMinimum(String(row.minimum ?? 0));
    setEditMaximum(String(row.maximum ?? 0));
    setSaveError('');
    setEditVisible(true);
  };
  const closeEdit = () => { setEditVisible(false); setEditRow(null); setSaveError(''); };

  const handleSaveStock = async () => {
    if (!editRow) return;
    setSaving(true);
    setSaveError('');
    try {
      await productInvStore.actions.save({
        id:        editRow.id,
        available: parseFloat(String(editAvailable).replace(',', '.')) || 0,
        minimum:   parseFloat(String(editMinimum).replace(',', '.'))   || 0,
        maximum:   parseFloat(String(editMaximum).replace(',', '.'))   || 0,
      });
      setRows(prev => prev.map(r =>
        r.id === editRow.id
          ? {
              ...r,
              available: parseFloat(String(editAvailable).replace(',', '.')) || 0,
              minimum:   parseFloat(String(editMinimum).replace(',', '.'))   || 0,
              maximum:   parseFloat(String(editMaximum).replace(',', '.'))   || 0,
            }
          : r
      ));
      closeEdit();
    } catch (e) {
      setSaveError(
        e?.response?.data?.['hydra:description'] || e?.message || 'Erro ao salvar'
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── modal adicionar produto ── */
  const openAdd = () => {
    setProductSearch('');
    setProductResults([]);
    setSelectedProduct(null);
    setAddAvailable('0');
    setAddMinimum('0');
    setAddMaximum('0');
    setAddError('');
    setAddVisible(true);
  };
  const closeAdd = () => { setAddVisible(false); setSelectedProduct(null); setAddError(''); };

  /* busca produtos enquanto digita */
  const searchProducts = useCallback(async (q) => {
    if (!q.trim() || !currentCompany?.id) { setProductResults([]); return; }
    setSearching(true);
    try {
      const data = await productsStore.actions.getItems({
        company: currentCompany.id,
        product: q.trim(),
        active: 1,
        itemsPerPage: 20,
      });
      /* exclui produtos já adicionados */
      const existingIds = new Set(rows.map(r => {
        const { id } = extractProduct(r.product);
        return String(id);
      }));
      const filtered = (data || []).filter(p => !existingIds.has(String(p.id)));
      setProductResults(filtered);
    } catch (_) {
      setProductResults([]);
    } finally {
      setSearching(false);
    }
  }, [currentCompany?.id, rows]);

  const handleProductSearchChange = (v) => {
    setProductSearch(v);
    if (selectedProduct) setSelectedProduct(null);
    clearTimeout(handleProductSearchChange._timer);
    handleProductSearchChange._timer = setTimeout(() => searchProducts(v), 350);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setProductSearch(product.product);
    setProductResults([]);
  };

  const handleAddToInventory = async () => {
    if (!selectedProduct) { setAddError('Selecione um produto'); return; }
    setAddSaving(true);
    setAddError('');
    try {
      const saved = await productInvStore.actions.save({
        inventory: `/inventories/${inventory.id}`,
        product:   `/products/${selectedProduct.id}`,
        available: parseFloat(String(addAvailable).replace(',', '.')) || 0,
        minimum:   parseFloat(String(addMinimum).replace(',', '.'))   || 0,
        maximum:   parseFloat(String(addMaximum).replace(',', '.'))   || 0,
      });
      /* insere com o objeto product inline para evitar re-fetch */
      setRows(prev => [...prev, {
        ...saved,
        product: selectedProduct,
      }]);
      closeAdd();
    } catch (e) {
      setAddError(
        e?.response?.data?.['hydra:description'] || e?.message || 'Erro ao adicionar'
      );
    } finally {
      setAddSaving(false);
    }
  };

  /* ── render ── */
  const invConf = INV_TYPE_CONFIG[inventory.type] || INV_TYPE_CONFIG.default;

  return (
    <SafeAreaView style={styles.container}>

      {/* Cabeçalho do inventário */}
      <View style={styles.inventoryHeader}>
        <View style={[styles.inventoryIconWrap, { backgroundColor: invConf.bg }]}>
          <MaterialCommunityIcons name={invConf.icon} size={22} color={invConf.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inventoryName}>{inventory.inventory}</Text>
          <View style={[styles.typeChip, { backgroundColor: invConf.bg }]}>
            <Text style={[styles.typeChipText, { color: invConf.color }]}>{invConf.label}</Text>
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
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar produto..."
            placeholderTextColor="#CBD5E1"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 84 }]}
      >
        <View style={{ width: containerWidth, paddingHorizontal: 16, paddingTop: 8 }}>

          {/* Skeleton */}
          {loading && (
            <View style={styles.card}>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
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
                Adicione produtos a este local para controlar os saldos.
              </Text>
            </View>
          )}

          {/* Lista */}
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
                const { name, type, sku } = extractProduct(row.product);
                const ptConf = PRODUCT_TYPE_CONFIG[type] || null;
                const isLow  = row.minimum > 0 && row.available <= row.minimum;

                return (
                  <View
                    key={row.id || idx}
                    style={[styles.productRow, idx < filteredRows.length - 1 && styles.productRowDivider]}
                  >
                    <View style={styles.productRowLeft}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {name || `Produto #${extractProduct(row.product).id}`}
                      </Text>
                      <View style={styles.productMeta}>
                        {ptConf && (
                          <View style={[styles.miniChip, { backgroundColor: ptConf.bg }]}>
                            <Text style={[styles.miniChipText, { color: ptConf.color }]}>{ptConf.label}</Text>
                          </View>
                        )}
                        {!!sku && <Text style={styles.skuText}>SKU {sku}</Text>}
                      </View>

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

                    <View style={styles.productRowRight}>
                      <View style={[styles.availableBadge, isLow && styles.availableBadgeLow]}>
                        <Text style={[styles.availableValue, isLow && styles.availableValueLow]}>
                          {fmtN(row.available)}
                        </Text>
                        <Text style={[styles.availableLabel, isLow && styles.availableLabelLow]}>
                          disp.
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(row)} activeOpacity={0.75}>
                        <MaterialCommunityIcons name="pencil-outline" size={15} color="#64748B" />
                      </TouchableOpacity>
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
              <Text style={styles.emptySubtitle}>Nenhum produto encontrado para "{search}".</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botão adicionar produto */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBarButton, { backgroundColor: brandColors.primary }]}
          onPress={openAdd}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.bottomBarButtonText}>Adicionar Produto</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal: ajuste de saldo ──────────────────────────────────── */}
      <AnimatedModal visible={editVisible} onRequestClose={closeEdit} style={{ justifyContent: 'flex-end' }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Ajustar Saldo</Text>
              {editRow && (
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {extractProduct(editRow?.product).name || `#${editRow?.id}`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={closeEdit} style={styles.headerCloseButton}>
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
            <TouchableOpacity style={styles.modalCancelButton} onPress={closeEdit}>
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: brandColors.primary }, saving && { opacity: 0.7 }]}
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

      {/* ── Modal: adicionar produto ────────────────────────────────── */}
      <AnimatedModal visible={addVisible} onRequestClose={closeAdd} style={{ justifyContent: 'flex-end' }}>
        <View style={[styles.modalContainer, { maxHeight: '92%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar Produto</Text>
            <TouchableOpacity onPress={closeAdd} style={styles.headerCloseButton}>
              <MaterialCommunityIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              {!!addError && (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{addError}</Text>
                </View>
              )}

              {/* Busca de produto */}
              <View style={styles.addField}>
                <Text style={styles.editFieldLabel}>
                  Produto <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={[
                  styles.addSearchWrap,
                  selectedProduct && { borderColor: brandColors.primary, backgroundColor: '#F0FDF4' }
                ]}>
                  {selectedProduct
                    ? <MaterialCommunityIcons name="check-circle" size={18} color={brandColors.primary} style={{ marginRight: 8 }} />
                    : <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  }
                  <TextInput
                    style={styles.addSearchInput}
                    value={productSearch}
                    onChangeText={handleProductSearchChange}
                    placeholder="Digite o nome do produto..."
                    placeholderTextColor="#CBD5E1"
                  />
                  {searching && <ActivityIndicator size="small" color="#94A3B8" style={{ marginLeft: 8 }} />}
                </View>

                {/* Resultados */}
                {productResults.length > 0 && (
                  <View style={styles.productDropdown}>
                    {productResults.map(p => {
                      const ptConf = PRODUCT_TYPE_CONFIG[p.type] || null;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.productDropdownItem}
                          onPress={() => handleProductSelect(p)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.productDropdownName} numberOfLines={1}>{p.product}</Text>
                          {ptConf && (
                            <View style={[styles.miniChip, { backgroundColor: ptConf.bg }]}>
                              <Text style={[styles.miniChipText, { color: ptConf.color }]}>{ptConf.label}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {!searching && productSearch.trim().length > 1 && !selectedProduct && productResults.length === 0 && (
                  <Text style={styles.noResultsText}>Nenhum produto encontrado.</Text>
                )}
              </View>

              {/* Saldos iniciais */}
              <View style={styles.editFieldsGrid}>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Disponível</Text>
                  <TextInput
                    style={[styles.editInput, styles.editInputHighlight]}
                    value={addAvailable}
                    onChangeText={setAddAvailable}
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
                    value={addMinimum}
                    onChangeText={setAddMinimum}
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
                    value={addMaximum}
                    onChangeText={setAddMaximum}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={closeAdd}>
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: brandColors.primary }, addSaving && { opacity: 0.7 }]}
              onPress={handleAddToInventory}
              disabled={addSaving}
            >
              {addSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSaveButtonText}>Adicionar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </SafeAreaView>
  );
};

/* ─── Skeletons ──────────────────────────────────────────────────────── */

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
    paddingHorizontal: 16,
  },
  line: { borderRadius: 6, backgroundColor: '#E2E8F0' },
});

/* ─── Estilos ────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* cabeçalho */
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
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  inventoryName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  typeChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  totalBadge: {
    alignItems: 'center', backgroundColor: '#F1F5F9',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  totalBadgeLabel: {
    fontSize: 10, fontWeight: '600', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  totalBadgeCount: { fontSize: 20, fontWeight: '800', color: '#1E293B' },

  /* busca */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 6 },

  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },

  /* card */
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardHeaderText: {
    fontSize: 12, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  cardHeaderCount: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },

  /* linha produto */
  productRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  productRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  productRowLeft: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  miniChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  miniChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  skuText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  stockCell: {
    backgroundColor: '#F8FAFC', borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 5,
    alignItems: 'center', minWidth: 50,
  },
  stockCellLabel: {
    fontSize: 9, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2,
  },
  stockCellValue: { fontSize: 12, fontWeight: '700', color: '#475569' },

  productRowRight: { alignItems: 'center', gap: 8 },
  availableBadge: {
    backgroundColor: '#F0FDF4', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    alignItems: 'center', minWidth: 56,
  },
  availableBadgeLow: { backgroundColor: '#FFF7ED' },
  availableValue: { fontSize: 18, fontWeight: '800', color: '#16A34A' },
  availableValueLow: { color: '#D97706' },
  availableLabel: {
    fontSize: 9, fontWeight: '700', color: '#86EFAC',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  availableLabelLow: { color: '#FCD34D' },
  editBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },

  /* empty */
  emptyContainer: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },

  /* bottom bar */
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 -2px 16px rgba(0,0,0,0.07)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  bottomBarButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  bottomBarButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  /* modal base */
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  headerCloseButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  modalScroll: { flexShrink: 1 },
  modalBody: { padding: 24, gap: 16 },
  modalFooter: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  modalCancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center',
  },
  modalCancelButtonText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  modalSaveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalSaveButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* modal: adicionar produto */
  addField: { gap: 6 },
  addSearchWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  addSearchInput: { flex: 1, fontSize: 15, color: '#0F172A', paddingVertical: 12 },
  productDropdown: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    backgroundColor: '#fff', marginTop: 4, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  productDropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
    gap: 8,
  },
  productDropdownName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  noResultsText: { fontSize: 12, color: '#94A3B8', marginTop: 6, paddingHorizontal: 2 },

  /* modal: ajuste */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorBannerText: { fontSize: 13, color: '#DC2626', flex: 1 },
  editFieldsGrid: { flexDirection: 'row', gap: 12 },
  editField: { flex: 1, gap: 6 },
  editFieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  editInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 18, fontWeight: '700', color: '#0F172A',
    backgroundColor: '#F8FAFC', textAlign: 'center',
  },
  editInputHighlight: {
    borderColor: '#16A34A', backgroundColor: '#F0FDF4', color: '#16A34A',
  },
  editInfoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginTop: 4,
  },
  editInfoText: { fontSize: 12, color: '#64748B', flex: 1, lineHeight: 17 },
});

export default InventoryDetailPage;
