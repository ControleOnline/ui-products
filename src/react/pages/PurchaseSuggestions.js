import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, useWindowDimensions, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors as baseColors } from '@controleonline/../../src/styles/colors';
import { api } from '@controleonline/ui-common/src/api';
import { getPrinterOptions } from '@controleonline/ui-common/src/react/utils/printerDevices';

/* ─── helpers ──────────────────────────────────────────────────────── */

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const PRODUCT_TYPE_LABELS = {
  product: 'Produto', service: 'Serviço', component: 'Componente',
  feedstock: 'Matéria Prima', package: 'Embalagem',
  custom: 'Custom', manufactured: 'Fabricado',
};

const PRODUCT_TYPE_COLORS = {
  product: '#3B82F6', service: '#8B5CF6', component: '#F97316',
  feedstock: '#16A34A', package: '#0891B2', custom: '#DB2777', manufactured: '#D97706',
};

/* classifica criticidade: 'critical' (vermelho) ou 'low' (laranja) */
const getCriticality = (available, minimum) => {
  if (available < 0) return 'critical';
  if (available === 0) return 'critical';
  if (minimum <= 0) return 'low';
  return available / minimum < 0.3 ? 'critical' : 'low';
};


/* ─── SubComponentes ────────────────────────────────────────────────── */

const CriticalBadge = ({ level, count }) => (
  <View style={[
    styles.badge,
    level === 'critical' ? styles.badgeCritical : styles.badgeLow,
  ]}>
    <MaterialCommunityIcons
      name={level === 'critical' ? 'alert-circle' : 'alert'}
      size={11}
      color={level === 'critical' ? '#DC2626' : '#D97706'}
    />
    <Text style={[styles.badgeText, { color: level === 'critical' ? '#DC2626' : '#D97706' }]}>
      {count}
    </Text>
  </View>
);

const StockBar = ({ available, minimum }) => {
  const pct = minimum > 0 ? Math.min(1, Math.max(0, available / minimum)) : 0;
  const crit = getCriticality(available, minimum);
  return (
    <View style={styles.barTrack}>
      <View style={[
        styles.barFill,
        { width: `${Math.round(pct * 100)}%` },
        crit === 'critical' ? styles.barFillCritical : styles.barFillLow,
      ]} />
    </View>
  );
};


/* ─── Página ────────────────────────────────────────────────────────── */

const PurchaseSuggestionsPage = () => {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const maxW = Math.min(width, 860);

  const peopleStore       = useStore('people');
  const themeStore        = useStore('theme');
  const printerStore      = useStore('printer');
  const deviceConfigStore = useStore('device_config');

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { items: printers, item: selectedPrinter } = printerStore.getters;
  const {
    item: deviceConfig,
    items: companyDeviceConfigs = [],
  } = deviceConfigStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, baseColors),
    [themeColors, currentCompany?.id],
  );
  const printerOptions = useMemo(
    () =>
      getPrinterOptions({
        printers,
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id, printers],
  );

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(new Set()); /* set de piId */
  const [collapsed, setCollapsed]   = useState(new Set()); /* categorias recolhidas */
  const [visibleCount, setVisibleCount] = useState(50);   /* paginação client-side */
  const loadingMoreRef = useRef(false);
  const runningRef     = useRef(false); /* guard contra chamadas duplicadas */

  /* impressão */
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [printing,   setPrinting]   = useState(false);
  const [printFeedback, setPrintFeedback] = useState(null); /* { ok: bool, msg: string } */

  /* auto-seleciona impressora padrão do device_config */
  useEffect(() => {
    if (printerOptions?.length > 0 && deviceConfig?.configs?.printer) {
      const def = printerOptions.find(p => p.device === deviceConfig.configs.printer);
      if (def) printerStore.actions.setItem(def);
    }
  }, [deviceConfig, printerOptions, printerStore.actions]);

  const handleSelectPrinter = useCallback(async (printer) => {
    await deviceConfigStore.actions.addDeviceConfigs({
      configs: JSON.stringify({ printer: printer.device }),
      people: `/people/${currentCompany.id}`,
    }).catch(() => {});
    printerStore.actions.setItem(printer);
    setPrinterModalVisible(false);
  }, [currentCompany?.id]);

  const handlePrint = useCallback(async () => {
    if (!selectedPrinter?.device || !currentCompany?.id || printing) return;
    setPrinting(true);
    setPrintFeedback(null);
    try {
      await api.post('/products/purchasing-suggestion/print', {
        device: selectedPrinter.device,
        people: currentCompany.id,
      });
      setPrintFeedback({ ok: true, msg: `Enviado para ${selectedPrinter.alias || selectedPrinter.device}` });
    } catch (e) {
      const msg = e?.response?.data?.['hydra:description'] || e?.response?.data?.message || e?.message || 'Erro ao imprimir';
      setPrintFeedback({ ok: false, msg });
    } finally {
      setPrinting(false);
      setTimeout(() => setPrintFeedback(null), 4000);
    }
  }, [selectedPrinter, currentCompany?.id, printing]);

  /* botão de impressão no header */
  useLayoutEffect(() => {
    if (!printerOptions?.length) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 4 }}>
          <TouchableOpacity
            onPress={handlePrint}
            disabled={printing || !selectedPrinter}
            style={{ padding: 8 }}
            activeOpacity={0.7}
          >
            {printing
              ? <ActivityIndicator size="small" color="#64748B" />
              : <MaterialCommunityIcons
                  name="printer"
                  size={22}
                  color={selectedPrinter ? '#64748B' : '#CBD5E1'}
                />
            }
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPrinterModalVisible(true)}
            style={{ padding: 8 }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, selectedPrinter, printing, printerOptions, handlePrint]);

  /* ── carregamento ──────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!currentCompany?.id || runningRef.current) return;
    runningRef.current = true;
    setLoading(true);
    try {
      const response = await api.fetch('/products/purchasing-suggestion', {
        params: { company: currentCompany.id },
      });
      const raw = Array.isArray(response) ? response
        : Array.isArray(response?.['hydra:member']) ? response['hydra:member']
        : [];

      const enriched = raw.map(item => {
        const avail   = parseFloat(item.stock   ?? 0);
        const min     = parseFloat(item.minimum  ?? 0);
        const deficit = parseFloat(item.needed   ?? 0);
        return {
          id:        item.product_id,
          _prodId:   String(item.product_id),
          _prodName: item.product_name || `#${item.product_id}`,
          _prodType: item.type   || null,
          _prodUnit: item.unity  || '',
          _sku:      item.sku    || '',
          _avail:    avail,
          _min:      min,
          _deficit:  deficit,
          _level:    getCriticality(avail, min),
          _catName:  PRODUCT_TYPE_LABELS[item.type] || 'Outros',
        };
      });

      enriched.sort((a, b) => {
        if (a._level !== b._level) return a._level === 'critical' ? -1 : 1;
        return b._deficit - a._deficit;
      });

      setItems(enriched);
      setVisibleCount(50);
      setSelected(new Set(enriched.map(e => e.id)));
    } catch (_) {
      setItems([]);
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useFocusEffect(useCallback(() => {
    loadData();

    if (currentCompany?.id) {
      printerStore.actions.getPrinters({ people: currentCompany.id }).catch(() => {});
      deviceConfigStore.actions
        .getItems({ people: `/people/${currentCompany.id}` })
        .catch(() => {});
    }
  }, [currentCompany?.id, deviceConfigStore.actions, loadData, printerStore.actions]));

  /* ── scroll infinito ───────────────────────────────────────────── */
  const handleScroll = useCallback(({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
    if (nearBottom && !loadingMoreRef.current && visibleCount < items.length) {
      loadingMoreRef.current = true;
      setVisibleCount(prev => {
        const next = Math.min(prev + 50, items.length);
        loadingMoreRef.current = false;
        return next;
      });
    }
  }, [visibleCount, items.length]);

  /* ── agrupamento por categoria (apenas items visíveis) ──────────── */
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  const grouped = useMemo(() => {
    const map = new Map();
    visibleItems.forEach(item => {
      const key = item._catName;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    /* ordena grupos: os com itens críticos primeiro */
    return Array.from(map.entries())
      .map(([name, rows]) => ({
        name,
        rows,
        hasCritical: rows.some(r => r._level === 'critical'),
        critCount:   rows.filter(r => r._level === 'critical').length,
        lowCount:    rows.filter(r => r._level === 'low').length,
      }))
      .sort((a, b) => {
        if (a.hasCritical !== b.hasCritical) return a.hasCritical ? -1 : 1;
        return b.rows.length - a.rows.length;
      });
  }, [items]);

  const selectedItems = useMemo(() => visibleItems.filter(i => selected.has(i.id)), [visibleItems, selected]);

  const toggleItem = id => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCategory = (rows) => {
    const allSelected = rows.every(r => selected.has(r.id));
    setSelected(prev => {
      const next = new Set(prev);
      rows.forEach(r => allSelected ? next.delete(r.id) : next.add(r.id));
      return next;
    });
  };

  const toggleCollapse = name => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const goToPurchase = (preItems) => {
    navigation.navigate('PurchaseFormPage', {
      items: preItems.map(pi => ({
        piId:            null,
        productId:       pi._prodId,
        productName:     pi._prodName,
        productType:     pi._prodType,
        suggestedQty:    Math.ceil(pi._deficit),
        inInventoryId:   null,
        inInventoryName: null,
      })),
    });
  };

  /* ── summary ─────────────────────────────────────────────────────── */
  const critCount = items.filter(i => i._level === 'critical').length;
  const lowCount  = items.filter(i => i._level === 'low').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        scrollEventThrottle={200}
        onScroll={handleScroll}
      >
        <View style={{ width: maxW, paddingHorizontal: 16, paddingTop: 12 }}>

          {/* ── Print feedback ─────────────────────────────────────── */}
          {!!printFeedback && (
            <View style={[styles.printFeedback, printFeedback.ok ? styles.printFeedbackOk : styles.printFeedbackErr]}>
              <MaterialCommunityIcons
                name={printFeedback.ok ? 'printer-check' : 'printer-alert'}
                size={16}
                color={printFeedback.ok ? '#16A34A' : '#DC2626'}
              />
              <Text style={[styles.printFeedbackText, { color: printFeedback.ok ? '#16A34A' : '#DC2626' }]}>
                {printFeedback.msg}
              </Text>
            </View>
          )}

          {/* ── Summary Card ──────────────────────────────────────── */}
          {!loading && items.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: '#DC2626' }]}>{critCount}</Text>
                  <Text style={styles.summaryLabel}>Críticos</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: '#D97706' }]}>{lowCount}</Text>
                  <Text style={styles.summaryLabel}>Baixo estoque</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: '#0F172A' }]}>{grouped.length}</Text>
                  <Text style={styles.summaryLabel}>Categorias</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Loading ────────────────────────────────────────────── */}
          {loading && (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={brandColors.primary} />
              <Text style={[styles.emptySubtitle, { marginTop: 16 }]}>Analisando estoque...</Text>
            </View>
          )}

          {/* ── Empty ──────────────────────────────────────────────── */}
          {!loading && items.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="check-circle-outline" size={52} color="#86EFAC" />
              </View>
              <Text style={styles.emptyTitle}>Estoque em dia!</Text>
              <Text style={styles.emptySubtitle}>
                Nenhum produto abaixo do estoque mínimo no momento.
              </Text>
            </View>
          )}

          {/* ── Grupos por categoria ───────────────────────────────── */}
          {!loading && grouped.map(group => {
            const isCollapsed = collapsed.has(group.name);
            const allSel = group.rows.every(r => selected.has(r.id));
            const someSel = group.rows.some(r => selected.has(r.id));

            return (
              <View key={group.name} style={styles.groupCard}>
                {/* header da categoria */}
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => toggleCollapse(group.name)}
                  activeOpacity={0.75}
                >
                  <TouchableOpacity
                    style={[styles.groupCheckbox, allSel && styles.groupCheckboxActive]}
                    onPress={() => toggleCategory(group.rows)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {(allSel || someSel) && (
                      <MaterialCommunityIcons
                        name={allSel ? 'check' : 'minus'}
                        size={13}
                        color="#fff"
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.groupCategoryIcon}>
                    <MaterialCommunityIcons name="tag-outline" size={14} color="#64748B" />
                  </View>
                  <Text style={styles.groupName}>{group.name}</Text>

                  <View style={styles.groupBadges}>
                    {group.critCount > 0 && <CriticalBadge level="critical" count={group.critCount} />}
                    {group.lowCount  > 0 && <CriticalBadge level="low"      count={group.lowCount}  />}
                  </View>

                  <MaterialCommunityIcons
                    name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={18} color="#94A3B8"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>

                {/* linhas de produto */}
                {!isCollapsed && group.rows.map((item, idx) => {
                  const isSel = selected.has(item.id);
                  const typeColor = PRODUCT_TYPE_COLORS[item._prodType] || '#94A3B8';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.productRow,
                        idx === group.rows.length - 1 && styles.productRowLast,
                        isSel && item._level === 'critical' && styles.productRowCriticalSel,
                        isSel && item._level === 'low'      && styles.productRowLowSel,
                      ]}
                      onPress={() => toggleItem(item.id)}
                      activeOpacity={0.8}
                    >
                      {/* checkbox */}
                      <View style={[styles.checkbox, isSel && { backgroundColor: brandColors.primary, borderColor: brandColors.primary }]}>
                        {isSel && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                      </View>

                      {/* info */}
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.productRowTop}>
                          <Text style={styles.productName} numberOfLines={1}>{item._prodName}</Text>
                          {item._level === 'critical' && (
                            <MaterialCommunityIcons name="alert-circle" size={14} color="#DC2626" />
                          )}
                        </View>

                        <View style={styles.productMeta}>
                          {item._prodType && (
                            <View style={[styles.typeChip, { backgroundColor: typeColor + '18' }]}>
                              <Text style={[styles.typeChipText, { color: typeColor }]}>
                                {PRODUCT_TYPE_LABELS[item._prodType] || item._prodType}
                              </Text>
                            </View>
                          )}
                          {!!item._sku && (
                            <View style={styles.invChip}>
                              <MaterialCommunityIcons name="barcode" size={10} color="#64748B" />
                              <Text style={styles.invChipText} numberOfLines={1}>{item._sku}</Text>
                            </View>
                          )}
                          {!!item._prodUnit && (
                            <View style={styles.invChip}>
                              <MaterialCommunityIcons name="scale" size={10} color="#64748B" />
                              <Text style={styles.invChipText}>{item._prodUnit}</Text>
                            </View>
                          )}
                        </View>

                        {/* barra de estoque */}
                        <StockBar available={item._avail} minimum={item._min} />
                        <View style={styles.stockNumbers}>
                          <Text style={[styles.stockAvail, item._level === 'critical' && { color: '#DC2626' }]}>
                            {fmtN(item._avail)} disponível
                          </Text>
                          <Text style={styles.stockMin}>mín {fmtN(item._min)}</Text>
                        </View>
                      </View>

                      {/* deficit badge */}
                      <View style={[styles.deficitBadge, item._level === 'critical' ? styles.deficitBadgeCritical : styles.deficitBadgeLow]}>
                        <Text style={[styles.deficitText, { color: item._level === 'critical' ? '#DC2626' : '#D97706' }]}>
                          -{fmtN(item._deficit)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* botão comprar categoria */}
                {!isCollapsed && (
                  <TouchableOpacity
                    style={[styles.buyCatBtn, { borderColor: brandColors.primary + '50' }]}
                    onPress={() => goToPurchase(group.rows)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name="cart-plus" size={15} color={brandColors.primary} />
                    <Text style={[styles.buyCatBtnText, { color: brandColors.primary }]}>
                      Comprar {group.name}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* indicador de mais itens disponíveis */}
          {visibleCount < items.length && (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={brandColors.primary} />
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                Carregando mais... ({visibleCount}/{items.length})
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Botão flutuante Comprar Selecionados ─────────────────────── */}
      {selectedItems.length > 0 && (
        <View style={styles.fab}>
          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: brandColors.primary }]}
            onPress={() => goToPurchase(selectedItems)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="cart-check" size={20} color="#fff" />
            <Text style={styles.fabBtnText}>
              Comprar {selectedItems.length} {selectedItems.length === 1 ? 'produto' : 'produtos'}
            </Text>
            <View style={styles.fabCount}>
              <Text style={styles.fabCountText}>{selectedItems.length}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modal seleção de impressora ───────────────────────────────── */}
      <Modal
        visible={printerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrinterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Selecionar Impressora</Text>
            {!!selectedPrinter && (
              <View style={styles.modalCurrentPrinter}>
                <MaterialCommunityIcons name="printer-check" size={14} color="#16A34A" />
                <Text style={styles.modalCurrentText}>Atual: {selectedPrinter.alias || selectedPrinter.device}</Text>
              </View>
            )}
            <FlatList
              data={printerOptions || []}
              keyExtractor={p => p.device}
              renderItem={({ item: p }) => {
                const isActive = selectedPrinter?.device === p.device;
                return (
                  <TouchableOpacity
                    style={[styles.printerItem, isActive && styles.printerItemActive]}
                    onPress={() => handleSelectPrinter(p)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name="printer"
                      size={18}
                      color={isActive ? brandColors.primary : '#64748B'}
                    />
                    <Text style={[styles.printerName, isActive && { color: brandColors.primary, fontWeight: '700' }]}>
                      {p.alias || p.device}
                    </Text>
                    {isActive && (
                      <MaterialCommunityIcons name="check-circle" size={18} color={brandColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.printerSep} />}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPrinterModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ─── estilos ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:        { flex: 1 },
  scrollContent: { alignItems: 'center' },

  /* summary */
  summaryCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  summaryRow:    { flexDirection: 'row', alignItems: 'center' },
  summaryItem:   { flex: 1, alignItems: 'center', gap: 2 },
  summaryNum:    { fontSize: 26, fontWeight: '800' },
  summaryLabel:  { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#F1F5F9' },

  /* grupo */
  groupCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  groupCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  groupCheckboxActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  groupCategoryIcon: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  groupName:  { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  groupBadges: { flexDirection: 'row', gap: 4 },

  /* produto row */
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  productRowLast:        { borderBottomWidth: 0 },
  productRowCriticalSel: { backgroundColor: '#FEF2F2' },
  productRowLowSel:      { backgroundColor: '#FFFBEB' },
  productRowTop:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productName:    { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  productMeta:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  typeChip:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeChipText: { fontSize: 9, fontWeight: '700' },
  invChip:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  invChipText:  { fontSize: 10, color: '#64748B', fontWeight: '500' },

  /* barra de estoque */
  barTrack:    { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 2 },
  barFill:     { height: '100%', borderRadius: 2, minWidth: 3 },
  barFillCritical: { backgroundColor: '#DC2626' },
  barFillLow:      { backgroundColor: '#F59E0B' },
  stockNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 },
  stockAvail:   { fontSize: 10, fontWeight: '600', color: '#64748B' },
  stockMin:     { fontSize: 10, color: '#CBD5E1' },

  /* deficit */
  deficitBadge:         { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  deficitBadgeCritical: { backgroundColor: '#FEE2E2' },
  deficitBadgeLow:      { backgroundColor: '#FEF3C7' },
  deficitText:          { fontSize: 13, fontWeight: '800' },

  /* badge */
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeCritical: { backgroundColor: '#FEE2E2' },
  badgeLow:      { backgroundColor: '#FEF3C7' },
  badgeText:     { fontSize: 10, fontWeight: '700' },

  /* botão comprar categoria */
  buyCatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    margin: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
  },
  buyCatBtnText: { fontSize: 13, fontWeight: '700' },

  /* fab */
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, alignItems: 'center' },
  fabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16,
    width: '100%', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.2)' },
    }),
  },
  fabBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  fabCount: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  fabCountText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  /* empty */
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },

  /* print feedback banner */
  printFeedback: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  printFeedbackOk:   { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  printFeedbackErr:  { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  printFeedbackText: { fontSize: 13, fontWeight: '600', flex: 1 },

  /* modal impressora */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, maxHeight: '70%',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 12 },
      web:     { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  modalCurrentPrinter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 12,
  },
  modalCurrentText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
  printerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  printerItemActive: { },
  printerName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  printerSep:  { height: 1, backgroundColor: '#F1F5F9' },
  modalCloseBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
});

export default PurchaseSuggestionsPage;
