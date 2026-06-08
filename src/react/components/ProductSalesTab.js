import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { withOpacity } from '@controleonline/../../src/styles/branding';
import {
  formatCurrency,
  normalizeEntityId,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import styles from './ProductSalesTab.styles';

const RANGE_PRESETS = [
  { key: '7d', label: '7 dias', description: 'Últimos 7 dias' },
  { key: '30d', label: '30 dias', description: 'Últimos 30 dias' },
  { key: '90d', label: '90 dias', description: 'Últimos 90 dias' },
  { key: 'custom', label: 'Personalizado', description: 'Escolher datas' },
];

const CHART_PERIODS = [
  { key: 'day', label: 'Dia', icon: 'calendar-today' },
  { key: 'week', label: 'Semana', icon: 'view-week' },
  { key: 'month', label: 'Mês', icon: 'calendar-month' },
];

const CHART_METRICS = [
  { key: 'revenue', label: 'Receita', icon: 'cash-multiple' },
  { key: 'units', label: 'Unidades', icon: 'package-variant-closed' },
  { key: 'orders', label: 'Pedidos', icon: 'receipt-text-outline' },
];

const pad2 = value => String(value).padStart(2, '0');

const extractId = value => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    const match = value.match(/(\d+)$/);
    return match ? match[1] : value.replace(/\D+/g, '');
  }

  if (typeof value === 'object') {
    return extractId(value.id || value['@id'] || value.value || '');
  }

  return '';
};

const toNumber = value => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const createDayStart = date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const createDayEnd = date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
};

const formatDateShort = date => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('pt-BR');
};

const formatDateApi = date => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const normalizeRange = (start, end) => {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return {
      start: null,
      end: null,
      label: '',
    };
  }

  const from = start <= end ? createDayStart(start) : createDayStart(end);
  const to = start <= end ? createDayEnd(end) : createDayEnd(start);

  return {
    start: from,
    end: to,
    label: `${formatDateShort(from)} - ${formatDateShort(to)}`,
  };
};

const resolvePresetRange = preset => {
  const today = new Date();

  switch (preset) {
    case '7d':
      return {
        start: createDayStart(addDays(today, -6)),
        end: createDayEnd(today),
        label: 'Últimos 7 dias',
      };
    case '30d':
      return {
        start: createDayStart(addDays(today, -29)),
        end: createDayEnd(today),
        label: 'Últimos 30 dias',
      };
    case '90d':
      return {
        start: createDayStart(addDays(today, -89)),
        end: createDayEnd(today),
        label: 'Últimos 90 dias',
      };
    default:
      return {
        start: createDayStart(addDays(today, -29)),
        end: createDayEnd(today),
        label: 'Últimos 30 dias',
      };
  }
};

const resolveSalesSummary = response => {
  const summary =
    response?.summary?.sales ||
    response?.summary?.report?.sales ||
    response?.sales ||
    null;

  if (!summary || typeof summary !== 'object') {
    return null;
  }

  if (summary.sales && typeof summary.sales === 'object' && !Array.isArray(summary.sales)) {
    return summary.sales;
  }

  return summary;
};

const extractApiError = (error, fallback) => {
  const message = String(
    error?.response?.data?.['hydra:description'] ||
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      '',
  ).trim();

  return message || fallback;
};

const formatMetricValue = (value, metric) => {
  if (metric === 'revenue') {
    return formatCurrency(value);
  }

  return toNumber(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
  });
};

const resolvePeriodLabel = period =>
  CHART_PERIODS.find(item => item.key === period)?.label || 'Dia';

const resolveMetricLabel = metric =>
  CHART_METRICS.find(item => item.key === metric)?.label || 'Receita';

const ProductSalesTab = ({ product, isLoading = false, brandColors = {} }) => {
  const { width } = useWindowDimensions();
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;
  const accentColor = brandColors.primary || '#0EA5E9';
  const requestIdRef = useRef(0);

  const productId = useMemo(
    () => extractId(product?.id || product?.['@id']),
    [product?.id, product?.['@id']],
  );

  const companyId = useMemo(
    () =>
      extractId(product?.company?.id || product?.company?.['@id'] || product?.company || currentCompany?.id || currentCompany?.['@id']) ||
      '',
    [
      currentCompany?.['@id'],
      currentCompany?.id,
      product?.company,
      product?.company?.['@id'],
      product?.company?.id,
    ],
  );

  const productName = useMemo(
    () => product?.product || product?.name || `#${productId || ''}`,
    [product?.name, product?.product, productId],
  );

  const companyLabel = useMemo(
    () => {
      const resolvedLabel = String(
        product?.company?.alias ||
          product?.company?.name ||
          currentCompany?.alias ||
          currentCompany?.name ||
          '',
      ).trim();

      return resolvedLabel || (companyId ? `Empresa #${companyId}` : 'Empresa');
    },
    [
      currentCompany?.alias,
      currentCompany?.name,
      companyId,
      product?.company?.alias,
      product?.company?.name,
    ],
  );

  const [rangePreset, setRangePreset] = useState('30d');
  const [customRange, setCustomRange] = useState(() => {
    const base = resolvePresetRange('30d');
    return {
      start: base.start,
      end: base.end,
    };
  });
  const [chartPeriod, setChartPeriod] = useState('day');
  const [chartMetric, setChartMetric] = useState('revenue');
  const [salesSummary, setSalesSummary] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activePicker, setActivePicker] = useState(null);

  const selectedRange = useMemo(() => {
    if (rangePreset === 'custom') {
      return normalizeRange(customRange.start, customRange.end);
    }

    return resolvePresetRange(rangePreset);
  }, [customRange.end, customRange.start, rangePreset]);

  const series = useMemo(() => {
    const seriesKey =
      chartPeriod === 'week'
        ? 'weekly'
        : chartPeriod === 'month'
          ? 'monthly'
          : 'daily';

    return Array.isArray(salesSummary?.[seriesKey]) ? salesSummary[seriesKey] : [];
  }, [chartPeriod, salesSummary]);

  const maxValue = useMemo(
    () =>
      series.reduce(
        (highest, item) => Math.max(highest, toNumber(item?.[chartMetric])),
        0,
      ),
    [chartMetric, series],
  );

  const summaryTotals = salesSummary?.totals || {};
  const totalOrders = toNumber(summaryTotals.orders);
  const totalUnits = toNumber(summaryTotals.units);
  const totalRevenue = toNumber(summaryTotals.revenue);
  const averageTicket =
    toNumber(summaryTotals.averageTicket) ||
    (totalOrders > 0 ? totalRevenue / totalOrders : 0);

  const isInitialLoading = isRefreshing && !salesSummary && !error;
  const chartWidth = Math.max(width - 32, Math.max(series.length, 1) * 66);
  const chartTitle = `${resolveMetricLabel(chartMetric)} por ${resolvePeriodLabel(chartPeriod).toLowerCase()}`;
  const chartSubtitle = selectedRange.label || 'Período selecionado';

  const loadSales = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    if (!productId || !companyId) {
      setSalesSummary(null);
      setError('Abra um produto vinculado a uma empresa para visualizar as vendas.');
      setIsRefreshing(false);
      return;
    }

    setIsRefreshing(true);
    setError('');
    setSalesSummary(null);

    try {
      const params = {
        summary: 'sales',
        provider: `/people/${companyId}`,
        orderType: 'sale',
        'status.realStatus': 'closed',
        product: `/products/${productId}`,
        productId,
        'orderProducts.product': `/products/${productId}`,
        itemsPerPage: 1,
        page: 1,
      };

      if (selectedRange.start) {
        params['orderDate[after]'] = formatDateApi(selectedRange.start);
      }

      if (selectedRange.end) {
        params['orderDate[before]'] = formatDateApi(selectedRange.end);
      }

      const response = await api.fetch('orders', { params });

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setSalesSummary(resolveSalesSummary(response));
    } catch (fetchError) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setError(
        extractApiError(fetchError, 'Nao foi possivel carregar as vendas do periodo.'),
      );
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [companyId, productId, selectedRange.end, selectedRange.start]);

  useFocusEffect(
    useCallback(() => {
      loadSales();
      return undefined;
    }, [loadSales]),
  );

  const handlePresetPress = preset => {
    setActivePicker(null);
    setRangePreset(preset);

    if (preset !== 'custom') {
      const nextRange = resolvePresetRange(preset);
      setCustomRange({
        start: nextRange.start,
        end: nextRange.end,
      });
    }
  };

  const handlePickerChange = (field, _event, selectedDate) => {
    if (!selectedDate) {
      setActivePicker(null);
      return;
    }

    const normalizedDate =
      field === 'start' ? createDayStart(selectedDate) : createDayEnd(selectedDate);

    setCustomRange(current => {
      const nextStart = field === 'start' ? normalizedDate : current.start;
      const nextEnd = field === 'end' ? normalizedDate : current.end;
      const normalized = normalizeRange(nextStart || normalizedDate, nextEnd || normalizedDate);
      return {
        start: normalized.start,
        end: normalized.end,
      };
    });

    setRangePreset('custom');
    setActivePicker(null);
  };

  const renderChip = (option, currentValue, onPress, extraStyle = null) => {
    const active = currentValue === option.key;

    return (
      <TouchableOpacity
        key={option.key}
        style={[
          styles.chip,
          active && [styles.chipActive, extraStyle],
        ]}
        onPress={() => onPress(option.key)}
        activeOpacity={0.8}
      >
        {option.icon ? (
          <MaterialCommunityIcons
            name={option.icon}
            size={14}
            color={active ? '#0369A1' : '#475569'}
          />
        ) : null}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const summaryCards = [
    {
      key: 'orders',
      label: 'Pedidos fechados',
      value: totalOrders,
      helper: rangePreset === 'custom' ? 'Pedidos no intervalo' : 'Pedidos no período',
    },
    {
      key: 'units',
      label: 'Unidades vendidas',
      value: totalUnits,
      helper: 'Quantidade total vendida',
    },
    {
      key: 'revenue',
      label: 'Receita',
      value: totalRevenue,
      helper: 'Soma das vendas fechadas',
    },
    {
      key: 'ticket',
      label: 'Ticket médio',
      value: averageTicket,
      helper: 'Receita média por pedido',
    },
  ];

  if (isLoading && !product) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.emptyTitle}>Carregando produto...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadSales} tintColor={accentColor} colors={[accentColor]} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.eyebrow}>Vendas fechadas</Text>
            <Text style={styles.title} numberOfLines={2}>
              {productName}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {companyLabel} · {selectedRange.label || 'Sem período selecionado'}
            </Text>
          </View>

          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              O resumo considera apenas pedidos de venda fechados da empresa vinculada ao produto.
            </Text>
          </View>
        </View>

        <View style={styles.controlsCard}>
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Range de datas</Text>
            <View style={styles.chipsRow}>
              {RANGE_PRESETS.map(option => renderChip(option, rangePreset, handlePresetPress, { borderColor: withOpacity(accentColor, 0.22) }))}
            </View>
          </View>

          {rangePreset === 'custom' ? (
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>Selecionar intervalo</Text>
              <View style={styles.rangeRow}>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    activePicker === 'start' && styles.dateButtonActive,
                  ]}
                  onPress={() => setActivePicker('start')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dateButtonLabel}>Início</Text>
                  <Text
                    style={[
                      styles.dateButtonValue,
                      activePicker === 'start' && styles.dateButtonValueActive,
                    ]}
                    numberOfLines={1}
                  >
                    {formatDateShort(selectedRange.start) || 'Selecionar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    activePicker === 'end' && styles.dateButtonActive,
                  ]}
                  onPress={() => setActivePicker('end')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dateButtonLabel}>Fim</Text>
                  <Text
                    style={[
                      styles.dateButtonValue,
                      activePicker === 'end' && styles.dateButtonValueActive,
                    ]}
                    numberOfLines={1}
                  >
                    {formatDateShort(selectedRange.end) || 'Selecionar'}
                  </Text>
                </TouchableOpacity>
              </View>

              {activePicker ? (
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerLabel}>
                    {activePicker === 'start' ? 'Selecionar data inicial' : 'Selecionar data final'}
                  </Text>
                  <Text style={styles.pickerHint}>
                    {activePicker === 'start'
                      ? 'Toque em uma data para começar a janela.'
                      : 'Toque em uma data para encerrar a janela.'}
                  </Text>
                  <DateTimePicker
                    value={activePicker === 'start' ? (selectedRange.start || new Date()) : (selectedRange.end || new Date())}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) =>
                      handlePickerChange(activePicker, event, selectedDate)
                    }
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Agrupamento</Text>
            <View style={styles.chipsRow}>
              {CHART_PERIODS.map(option => renderChip(option, chartPeriod, setChartPeriod, { borderColor: withOpacity(accentColor, 0.22) }))}
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Métrica do gráfico</Text>
            <View style={styles.chipsRow}>
              {CHART_METRICS.map(option => renderChip(option, chartMetric, setChartMetric, { borderColor: withOpacity(accentColor, 0.22) }))}
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSales} activeOpacity={0.85}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={accentColor} />
            <Text style={styles.loadingText}>Carregando resumo de vendas...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              {summaryCards.map(card => (
                <View
                  key={card.key}
                  style={[
                    styles.summaryCard,
                    {
                      borderColor: withOpacity(accentColor, 0.16),
                      backgroundColor: withOpacity(accentColor, 0.04),
                    },
                  ]}
                >
                  <View>
                    <Text style={styles.summaryValue}>
                      {formatMetricValue(card.value, card.key === 'revenue' || card.key === 'ticket' ? 'revenue' : 'units')}
                    </Text>
                    <Text style={styles.summaryLabel}>{card.label}</Text>
                  </View>
                  <Text style={styles.summaryHint}>{card.helper}</Text>
                </View>
              ))}
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderCopy}>
                  <Text style={styles.panelTitle}>{chartTitle}</Text>
                  <Text style={styles.panelSubtitle}>{chartSubtitle}</Text>
                </View>
                <MaterialCommunityIcons name="chart-line" size={20} color={accentColor} />
              </View>

              {series.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartShell}
                >
                  <View style={[styles.chartContent, { width: chartWidth }]}>
                    {series.map((item, index) => {
                      const value = toNumber(item?.[chartMetric]);
                      const barHeight =
                        maxValue > 0
                          ? Math.max(8, Math.round((value / maxValue) * 118))
                          : 8;

                      return (
                        <View key={item.key || index} style={styles.chartColumn}>
                          <Text style={styles.chartValue} numberOfLines={1}>
                            {formatMetricValue(value, chartMetric)}
                          </Text>
                          <View
                            style={[
                              styles.chartTrack,
                              { backgroundColor: withOpacity(accentColor, 0.12) },
                            ]}
                          >
                            <View
                              style={[
                                styles.chartFill,
                                {
                                  height: barHeight,
                                  backgroundColor: withOpacity(
                                    accentColor,
                                    Math.min(0.34 + index * 0.08, 0.92),
                                  ),
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.chartLabel} numberOfLines={2}>
                            {item.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="chart-box-outline" size={28} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>Sem vendas para este filtro</Text>
                  <Text style={styles.emptySubtitle}>
                    Ajuste o intervalo ou tente outro agrupamento para visualizar a evolução.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default ProductSalesTab;
