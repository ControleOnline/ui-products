import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';

const INTEGRATIONS = [
  {key: 'pos', label: 'POS'},
  {key: 'shop', label: 'Shop'},
  {key: 'ifood', label: 'iFood'},
  {key: '99food', label: '99'},
  {key: 'mercado_livre', label: 'Mercado Livre'},
  {key: 'shopee', label: 'Shopee'},
  {key: 'amazon', label: 'Amazon'},
];

const normalizeCollection = response => {
  const items =
    response?.member ||
    response?.['hydra:member'] ||
    response?.items ||
    response;
  return Array.isArray(items) ? items : [];
};

const normalizeId = value =>
  String(value?.id || value?.['@id'] || value || '').replace(/\D+/g, '');

const getProductName = item => {
  const product = item?.product || {};
  return String(product.product || product.description || `Produto #${normalizeId(product)}`).trim();
};

const getInventoryName = item => {
  const inventory = item?.outInventory || item?.product?.defaultOutInventory;
  return String(inventory?.inventory || inventory?.name || '').trim() || 'Sem estoque vinculado';
};

const getShowcaseName = item => {
  const showcase = item?.showcase || {};
  return String(showcase.name || `Vitrine #${normalizeId(showcase)}`).trim();
};

const formatPrice = value => {
  if (Formatter?.formatMoney) {
    return Formatter.formatMoney(Number(value || 0));
  }
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const ProductShowcasesPage = () => {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const [integrationKey, setIntegrationKey] = useState('pos');
  const [showcases, setShowcases] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const palette = useMemo(
    () =>
      resolveThemePalette({
        ...themeColors,
        ...(currentCompany?.theme?.colors || {}),
      }, colors),
    [themeColors, currentCompany?.id],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);

  const loadDistribution = useCallback(async () => {
    if (!currentCompany?.id) {
      setShowcases([]);
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const [showcaseResponse, itemResponse] = await Promise.all([
        api.fetch('/product_showcases', {
          params: {
            company: `/people/${currentCompany.id}`,
            integrationKey,
            'order[name]': 'ASC',
          },
        }),
        api.fetch('/product_showcase_items', {
          params: {
            'showcase.company': `/people/${currentCompany.id}`,
            'showcase.integrationKey': integrationKey,
            'order[showcase.name]': 'ASC',
            'order[product.product]': 'ASC',
            itemsPerPage: 200,
          },
        }),
      ]);
      setShowcases(normalizeCollection(showcaseResponse));
      setItems(normalizeCollection(itemResponse));
    } catch {
      setShowcases([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, integrationKey]);

  useFocusEffect(
    useCallback(() => {
      loadDistribution();
    }, [loadDistribution]),
  );

  const activeItems = items.filter(item => item.active !== false);
  const inactiveItems = Math.max(0, items.length - activeItems.length);

  const renderItem = ({item, index}) => (
    <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
      <View style={styles.productBlock}>
        <Text style={styles.productName} numberOfLines={1}>
          {getProductName(item)}
        </Text>
        <Text style={styles.productMeta} numberOfLines={1}>
          {item?.product?.sku || item?.externalCode || 'Sem código externo'}
        </Text>
      </View>
      <Text style={styles.cell} numberOfLines={1}>
        {getShowcaseName(item)}
      </Text>
      <Text style={styles.cell} numberOfLines={1}>
        {getInventoryName(item)}
      </Text>
      <Text style={[styles.cell, styles.priceCell]} numberOfLines={1}>
        {formatPrice(item?.price)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Vitrines</Text>
          <Text style={styles.summaryValue}>{showcases.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Produtos</Text>
          <Text style={styles.summaryValue}>{activeItems.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Inativos</Text>
          <Text style={styles.summaryValue}>{inactiveItems}</Text>
        </View>
      </View>

      <View style={styles.filtersBlock}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {INTEGRATIONS.map(option => {
              const selected = option.key === integrationKey;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.82}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => setIntegrationKey(option.key)}>
                  <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={palette.primary} />
          <Text style={styles.loadingText}>Carregando distribuição...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item?.id || item?.['@id'])}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadDistribution} />
          }
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.productBlock]}>Produto</Text>
              <Text style={styles.headerCell}>Vitrine</Text>
              <Text style={styles.headerCell}>Estoque</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>Preço</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="grid" size={20} color={palette.textSecondary} />
              <Text style={styles.emptyText}>Nenhum produto distribuído</Text>
            </View>
          }
          contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = palette =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      padding: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    summaryCard: {
      flex: 1,
      minHeight: 72,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBackground || palette.white,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    summaryLabel: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    summaryValue: {
      color: palette.textPrimary || palette.text,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 4,
    },
    filtersBlock: {
      marginBottom: 12,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 8,
    },
    filterChip: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: palette.cardBackground || palette.white,
    },
    filterChipActive: {
      borderColor: palette.primary,
      backgroundColor: withOpacity(palette.primary, 0.1),
    },
    filterText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    filterTextActive: {
      color: palette.primary,
    },
    loadingBox: {
      alignItems: 'center',
      flex: 1,
      gap: 10,
      justifyContent: 'center',
    },
    loadingText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    listContent: {
      paddingBottom: 32,
    },
    emptyContent: {
      flexGrow: 1,
    },
    tableHeader: {
      alignItems: 'center',
      borderBottomColor: palette.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    headerCell: {
      color: palette.textSecondary,
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    row: {
      alignItems: 'center',
      borderBottomColor: palette.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 10,
      minHeight: 58,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    rowAlt: {
      backgroundColor: withOpacity(palette.textPrimary || palette.text, 0.025),
    },
    productBlock: {
      flex: 1.35,
      minWidth: 120,
    },
    productName: {
      color: palette.textPrimary || palette.text,
      fontSize: 14,
      fontWeight: '800',
    },
    productMeta: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 3,
    },
    cell: {
      color: palette.textPrimary || palette.text,
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    priceCell: {
      flex: 0.8,
      textAlign: 'right',
    },
    emptyBox: {
      alignItems: 'center',
      flex: 1,
      gap: 10,
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
  });

export default ProductShowcasesPage;
