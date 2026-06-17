import React, { useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors as baseColors } from '@controleonline/../../src/styles/colors';
import { api } from '@controleonline/ui-common/src/api';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import styles from './PurchaseSuggestions.styles';

import {
  inlineStyle_125_14,
  inlineStyle_284_14,
  inlineStyle_384_20,
  inlineStyle_410_28,
  inlineStyle_479_18,
  inlineStyle_481_20,
} from './PurchaseSuggestions.styles';

/* ─── helpers ──────────────────────────────────────────────────────── */

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const PRODUCT_TYPE_LABELS = {
  product: 'Produto', service: 'Serviço', component: 'Componente',
  feedstock: 'Matéria Prima', package: 'Embalagem',
  custom: 'Custom', manufactured: 'Fabricado', recipe: 'Preparo',
};

const PRODUCT_TYPE_COLORS = {
  product: '#3B82F6', service: '#8B5CF6', component: '#F97316',
  feedstock: '#16A34A', package: '#0891B2', custom: '#DB2777', manufactured: '#D97706', recipe: '#6B7280',
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

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, baseColors),
    [themeColors, currentCompany?.id],
  );

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(new Set()); /* set de piId */
  const [collapsed, setCollapsed]   = useState(new Set()); /* categorias recolhidas */
  const [visibleCount, setVisibleCount] = useState(50);   /* paginação client-side */
  const loadingMoreRef = useRef(false);
  const runningRef     = useRef(false); /* guard contra chamadas duplicadas */

  const [printFeedback, setPrintFeedback] = useState(null); /* { ok: bool, msg: string } */

  const showPrintFeedback = useCallback((ok, msg) => {
    setPrintFeedback({ok, msg});
    setTimeout(() => setPrintFeedback(null), 4000);
  }, []);

  const handlePrintSuccess = useCallback(completedRequest => {
    const targetDeviceId = String(completedRequest?.targetDeviceId || '').trim();
    showPrintFeedback(
      true,
      targetDeviceId
        ? `Enviado para ${targetDeviceId}`
        : 'Impressao solicitada com sucesso.',
    );
  }, [showPrintFeedback]);

  const handlePrintError = useCallback(completedRequest => {
    showPrintFeedback(
      false,
      completedRequest?.error || 'Erro ao imprimir',
    );
  }, [showPrintFeedback]);

  /* botão de impressão no header */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={inlineStyle_125_14}>
          <PrintButton
            job={{type: 'purchasing-suggestion'}}
            store="products"
            compact
            iconColor="#64748B"
            printerSelection={{enabled: true}}
            onSuccess={handlePrintSuccess}
            onError={handlePrintError}
          />
        </View>
      ),
    });
  }, [handlePrintError, handlePrintSuccess, navigation]);

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
    } catch {
      setItems([]);
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

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
        <View style={inlineStyle_284_14({
          maxW: maxW,
        })}>

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
                    style={inlineStyle_384_20}
                  />
                </TouchableOpacity>
                {/* linhas de produto */}
                {!isCollapsed && group.rows.map((item, idx) => {
                  const isSel = selected.has(item.id);
                  const typeColor = PRODUCT_TYPE_COLORS[item._prodType];
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
                      <View style={inlineStyle_410_28}>
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
            <View style={inlineStyle_479_18}>
              <ActivityIndicator size="small" color={brandColors.primary} />
              <Text style={inlineStyle_481_20}>
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
    </SafeAreaView>
  );
};

/* ─── estilos ───────────────────────────────────────────────────────── */

export default PurchaseSuggestionsPage;
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
