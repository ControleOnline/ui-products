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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import DateShortcutFilter from '@controleonline/ui-default/src/react/components/filters/DateShortcutFilter';
import { api } from '@controleonline/ui-common/src/api';
import {
  getDateRange,
  resolveDateRangeSummary,
} from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import { withOpacity } from '@controleonline/../../src/styles/branding';
import {
  formatCurrency,
  normalizeEntityId,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import styles from './ProductSalesTab.styles';

const CHART_PERIODS = [
  { key: 'day', label: 'Dia', icon: 'calendar-today' },
  { key: 'week', label: 'Semana', icon: 'view-week' },
  { key: 'month', label: 'Mês', icon: 'calendar-month' },
];

const DATE_FILTER_OPTION_KEYS = ['7d', '30d', '90d', 'custom'];

const CHART_METRICS = [
  { key: 'revenue', label: 'Receita', icon: 'cash-multiple' },
  { key: 'units', label: 'Unidades', icon: 'package-variant-closed' },
  { key: 'orders', label: 'Pedidos', icon: 'receipt-text-outline' },
];

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

const renderChip = (option, currentValue, onPress, palette) => {
  const active = currentValue === option.key;
  const chipStyle = {
    backgroundColor: active
      ? palette.buttonBackground
      : palette.buttonBackgroundSecondary,
    borderColor: active
      ? palette.buttonBorder
      : palette.buttonBorderSecondary,
  };

  return (
    <TouchableOpacity
      key={option.key}
      style={[
        styles.chip,
        chipStyle,
      ]}
      onPress={() => onPress(option.key)}
      activeOpacity={0.8}
    >
      {option.icon ? (
        <MaterialCommunityIcons
          name={option.icon}
          size={14}
          color={active ? palette.buttonIcon : palette.buttonIconSecondary}
        />
      ) : null}
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          { color: active ? palette.buttonText : palette.buttonTextSecondary },
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );
};

const ProductSalesTab = ({ product, isLoading = false, brandColors = {} }) => {
  const { width } = useWindowDimensions();
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const themeColors = themeStore?.getters?.colors || {};
  const buttonPalette = useMemo(() => ({
    buttonBackground: themeColors.buttonBackground,
    buttonBorder: themeColors.buttonBorder,
    buttonText: themeColors.buttonText,
    buttonIcon: themeColors.buttonIcon || themeColors.buttonText,
    buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
    buttonBorderSecondary: themeColors.buttonBorderSecondary,
    buttonTextSecondary: themeColors.buttonTextSecondary,
    buttonIconSecondary: themeColors.buttonIconSecondary || themeColors.buttonTextSecondary,
  }), [
    themeColors.buttonBackground,
    themeColors.buttonBackgroundSecondary,
    themeColors.buttonBorder,
    themeColors.buttonBorderSecondary,
    themeColors.buttonIcon,
    themeColors.buttonIconSecondary,
    themeColors.buttonText,
    themeColors.buttonTextSecondary,
  ]);
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

  const [dateFilterKey, setDateFilterKey] = useState('30d');
  const [customRange, setCustomRange] = useState({
    from: '',
    to: '',
  });
  const [chartPeriod, setChartPeriod] = useState('day');
  const [chartMetric, setChartMetric] = useState('revenue');
  const [salesSummary, setSalesSummary] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const dateRange = useMemo(
    () => getDateRange(dateFilterKey, customRange),
    [customRange.from, customRange.to, dateFilterKey],
  );
  const selectedRangeLabel = useMemo(
    () => resolveDateRangeSummary(dateFilterKey, customRange),
    [customRange.from, customRange.to, dateFilterKey],
  );

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
  const chartSubtitle = selectedRangeLabel || 'Período selecionado';

  const loadSales = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    if (!productId) {
      setSalesSummary(null);
      setError('Abra um produto para visualizar as vendas.');
      setIsRefreshing(false);
      return;
    }

    setIsRefreshing(true);
    setError('');
    setSalesSummary(null);

    try {
      const params = {};

      if (dateRange.after) {
        params['orderDate[after]'] = dateRange.after;
      }

      if (dateRange.before) {
        params['orderDate[before]'] = dateRange.before;
      }

      const response = await api.fetch(`/products/${productId}/summary`, { params });

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
  }, [dateRange.after, dateRange.before, productId]);

  useFocusEffect(
    useCallback(() => {
      loadSales();
      return undefined;
    }, [loadSales]),
  );

  const summaryCards = [
    {
      key: 'orders',
      label: 'Pedidos fechados',
      value: totalOrders,
      helper: dateFilterKey === 'custom' ? 'Pedidos no intervalo' : 'Pedidos no período',
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
              {companyLabel} · {selectedRangeLabel || 'Sem período selecionado'}
            </Text>
          </View>

          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              O resumo considera apenas pedidos de venda fechados do produto selecionado.
            </Text>
          </View>
        </View>

        <View style={styles.controlsCard}>
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Selecionar intervalo</Text>
            <DateShortcutFilter
              dense
              value={dateFilterKey}
              onChange={setDateFilterKey}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              labelCaption="Período"
              colors={{
                accent: accentColor,
                appBg: 'transparent',
                border: '#CBD5E1',
                borderSoft: '#E2E8F0',
                cardBg: '#FFFFFF',
                cardBgSoft: '#F8FAFC',
                danger: '#DC2626',
                isLight: true,
                panelBg: '#EFF6FF',
                pillTextDark: '#FFFFFF',
                textPrimary: '#0F172A',
                textSecondary: '#64748B',
              }}
              optionKeys={DATE_FILTER_OPTION_KEYS}
            />
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Agrupamento</Text>
            <View style={styles.chipsRow}>
              {CHART_PERIODS.map(option => renderChip(option, chartPeriod, setChartPeriod, buttonPalette))}
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Métrica do gráfico</Text>
            <View style={styles.chipsRow}>
              {CHART_METRICS.map(option => renderChip(option, chartMetric, setChartMetric, buttonPalette))}
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  backgroundColor: buttonPalette.buttonBackground,
                  borderColor: buttonPalette.buttonBorder,
                  borderWidth: 1,
                },
              ]}
              onPress={loadSales}
              activeOpacity={0.85}
            >
              <Text style={[styles.retryButtonText, { color: buttonPalette.buttonText }]}>Tentar novamente</Text>
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
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
