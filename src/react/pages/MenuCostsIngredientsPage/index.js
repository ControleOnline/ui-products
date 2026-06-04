import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import styles, { MENU_COLORS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/index.styles';
import {
  MAIN_TABS,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  RESOURCE_META,
  activeCostOptionsForRef,
  activeCostSummary,
  categoryName,
  comparableCostLabel,
  decimal,
  evidenceLabel,
  filterBySearch,
  formatDate,
  getById,
  money,
  resourceParentUsageRows,
  safeArray,
} from '@controleonline/ui-products/src/react/domain/menuCostsShared';
import { fetchLatestPurchasesByProductIds } from '@controleonline/ui-products/src/react/domain/productCosting';
import { MENU_COSTS_PAGE_SIZE } from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import { resolveMenuCostsTabRoute } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {
  resolveCategoryCoverUrl,
  resolveProductCoverUrl,
} from '@controleonline/ui-products/src/react/domain/productMedia';
import { buildLiveIngredientsDb } from '@controleonline/ui-products/src/react/domain/menuCostsIngredients';

const EMPTY_DB = {
  categories: [],
  ingredients: [],
  recipes: [],
  packaging: [],
  products: [],
  purchaseOrders: [],
  purchaseItems: [],
  inputs: [],
  suppliers: [],
  settings: {},
};

const IconButton = ({ icon, label, onPress, active, disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.iconButton,
      active && styles.iconButtonActive,
      disabled && { opacity: 0.6 },
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon
      name={icon}
      size={16}
      color={active ? MENU_COLORS.brandText : MENU_COLORS.muted}
    />
    {label ? (
      <Text style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>
        {label}
      </Text>
    ) : null}
  </TouchableOpacity>
);

const SearchBox = ({ value, onChangeText, placeholder }) => (
  <View style={styles.searchBox}>
    <Icon name="search" size={16} color={MENU_COLORS.muted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MENU_COLORS.muted}
      style={styles.searchInput}
    />
  </View>
);

const Badge = ({ label, tone = 'neutral' }) => {
  const toneStyle =
    tone === 'good'
      ? styles.toneGood
      : tone === 'warn'
        ? styles.toneWarn
        : tone === 'bad'
          ? styles.toneBad
          : styles.toneNeutral;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const InfoGrid = ({ rows }) => (
  <View style={styles.infoGrid}>
    {safeArray(rows).map(row => (
      <View key={`${row.label}-${row.value}`} style={styles.infoCell}>
        <Text style={styles.infoLabel}>{row.label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {row.value}
        </Text>
        {row.helper ? (
          <Text style={styles.infoHelper} numberOfLines={3}>
            {row.helper}
          </Text>
        ) : null}
      </View>
    ))}
  </View>
);

const EmptyState = ({ text = 'Nenhum registro encontrado.' }) => (
  <View style={styles.emptyState}>
    <Icon name="inbox" size={24} color={MENU_COLORS.muted} />
    <Text style={styles.emptyStateText}>{text}</Text>
  </View>
);

const buildImageSource = url => (url ? { uri: url } : null);

const imageForIngredient = (db, ingredient) =>
  buildImageSource(
    resolveProductCoverUrl(ingredient) ||
    resolveCategoryCoverUrl(getById(db, 'categories', ingredient?.categoryId)),
  );

const VisualThumb = ({ source, label, size = 'md' }) => (
  <View
    style={[
      styles.visualThumb,
      size === 'lg' && styles.visualThumbLarge,
      size === 'sm' && styles.visualThumbSmall,
    ]}
  >
    {source ? (
      <Image source={source} style={styles.visualImage} resizeMode="cover" />
    ) : (
      <Text style={styles.visualInitial}>{String(label || 'GY').slice(0, 2).toUpperCase()}</Text>
    )}
  </View>
);

const RowCard = ({ title, subtitle, meta, selected, onPress, right, badges, imageSource }) => (
  <TouchableOpacity
    style={[styles.rowCard, selected && styles.rowCardActive]}
    activeOpacity={onPress ? 0.84 : 1}
    onPress={onPress}
    disabled={!onPress}
  >
    {imageSource ? <VisualThumb source={imageSource} label={title} size="sm" /> : null}
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
      {badges?.length ? (
        <View style={styles.badgeLine}>
          {badges.map(badge => (
            <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>
          ))}
        </View>
      ) : null}
      {meta ? <Text style={styles.rowMeta} numberOfLines={2}>{meta}</Text> : null}
    </View>
    {right ? <View style={styles.rowRight}>{right}</View> : null}
  </TouchableOpacity>
);

const DetailShell = ({ title, subtitle, badges, children }) => (
  <View style={styles.detailPanel}>
    <View style={styles.detailHeader}>
      <View style={styles.detailHeaderText}>
        <View style={styles.badgeLine}>
          {safeArray(badges).map(badge => (
            <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>
          ))}
        </View>
        <Text style={styles.detailTitle}>{title}</Text>
        {subtitle ? <Text style={styles.detailSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {children}
  </View>
);

const ActiveCostPanel = ({ db, item }) => {
  const summary = activeCostSummary(db, 'ingredient', item);
  const options = activeCostOptionsForRef('ingredient');
  const modeLabel = options.find(option => option.value === summary.mode)?.label || summary.modeLabel;

  return (
    <View style={styles.activeCostPanel}>
      <View style={styles.activeCostHeader}>
        <View>
          <Text style={styles.panelTitle}>Custo ativo</Text>
          <Text style={styles.panelSubtitle}>
            Leitura atual do ERP, sem gravação nesta tela.
          </Text>
        </View>
        <Badge tone={summary.mode === 'review' ? 'warn' : 'good'}>{modeLabel}</Badge>
      </View>
      <InfoGrid
        rows={[
          {
            label: 'Custo canônico ativo',
            value: `${money(summary.activePrimaryCost)} / ${summary.primaryUnit}`,
            helper: summary.source,
          },
          {
            label: 'Leitura de cálculo',
            value: `${money(summary.activeBaseCost)} / ${summary.baseUnit}`,
            helper: 'Base usada no custo por unidade',
          },
          {
            label: 'Cadastro atual',
            value: `${money(summary.registeredPrimaryCost)} / ${summary.primaryUnit}`,
            helper: 'Valor cadastrado no ERP',
          },
          {
            label: 'Compras vinculadas',
            value: String(summary.purchaseCount),
            helper: summary.latest
              ? `${formatDate(summary.latest.date)} · ${summary.latest.supplierName}`
              : 'Sem compra vinculada',
          },
        ]}
      />
    </View>
  );
};

const PurchaseRows = ({ rows }) => {
  if (!safeArray(rows).length) {
    return <EmptyState text="Sem compras vinculadas para este ingrediente." />;
  }

  return (
    <View style={styles.panelNested}>
      <Text style={styles.panelTitle}>Histórico de compra</Text>
      {rows.map(row => (
        <RowCard
          key={row.id}
          title={row.description || row.resourceName || 'Item comprado'}
          subtitle={`${formatDate(row.date)} · ${row.supplierName || 'Fornecedor'}`}
          meta={`${decimal(row.quantity, 3)} ${row.unit || 'un'} · unit ${money(row.unitPrice)}`}
          right={<Text style={styles.rowMoney}>{money(row.totalPrice || row.totalAmount)}</Text>}
          badges={[{ label: `${safeArray(row.inputs).length} evid.`, tone: safeArray(row.inputs).length ? 'good' : 'warn' }]}
        />
      ))}
    </View>
  );
};

const resolveSectionTitle = () => 'Ingredientes cadastrados no ERP';

export default function MenuCostsIngredientsPage({ navigation }) {
  const messageApi = useMessage() || {};
  const { showError } = messageApi;
  const peopleStore = useStore('people');
  const productsStore = useStore('products');
  const productGroupProductStore = useStore('product_group_product');
  const categoriesStore = useStore('categories');
  const { currentCompany } = peopleStore.getters || {};
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;

  const [db, setDb] = useState(EMPTY_DB);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [visibleCount, setVisibleCount] = useState(MENU_COSTS_PAGE_SIZE);
  const [selectedPurchaseRows, setSelectedPurchaseRows] = useState([]);
  const requestIdRef = useRef(0);
  const purchaseRequestIdRef = useRef(0);
  const purchaseCacheRef = useRef(new Map());

  const loadLiveDb = useCallback(async () => {
    const companyId = currentCompany?.id;
    const companyIri = companyId ? `/people/${companyId}` : '';

    if (!companyId) {
      setDb(EMPTY_DB);
      setSelectedId(null);
      setLoadError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoadingDb(true);
    setLoadError('');

    try {
      const nextDb = await buildLiveIngredientsDb({
        companyId,
        companyIri,
        productsActions: productsStore.actions,
        productGroupProductActions: productGroupProductStore.actions,
        categoriesActions: categoriesStore.actions,
        includePurchaseHistory: false,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setDb(nextDb);
      setSelectedId(currentSelected =>
        currentSelected && safeArray(nextDb.ingredients).some(item => String(item.id) === String(currentSelected))
          ? currentSelected
          : safeArray(nextDb.ingredients)[0]?.id || null,
      );
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Falha ao carregar os ingredientes do ERP.';
      setDb(EMPTY_DB);
      setSelectedId(null);
      setLoadError(message);
      showError?.(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingDb(false);
      }
    }
  }, [
    categoriesStore.actions,
    currentCompany?.id,
    productGroupProductStore.actions,
    productsStore.actions,
    showError,
  ]);

  useFocusEffect(
    useCallback(() => {
      setQuery('');
      setVisibleCount(MENU_COSTS_PAGE_SIZE);
      void loadLiveDb();
      return undefined;
    }, [loadLiveDb]),
  );

  useEffect(() => {
    if (!safeArray(db.ingredients).length) return;
    if (!selectedId || !safeArray(db.ingredients).some(item => String(item.id) === String(selectedId))) {
      setSelectedId(safeArray(db.ingredients)[0]?.id || null);
    }
  }, [db, selectedId]);

  const rows = useMemo(
    () =>
      filterBySearch(safeArray(db.ingredients), query, [
        item => item.name,
        item => item.code,
        item => item.description,
        item => item.notes,
        item => item.supplier,
        item => categoryName(db, item.categoryId),
        item => item.sourceReference,
      ]).sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')),
    [db, query],
  );

  const selected = useMemo(
    () => rows.find(item => String(item.id) === String(selectedId)) || rows[0] || null,
    [rows, selectedId],
  );

  useEffect(() => {
    const ingredientId = String(selected?.id || '').trim();
    if (!ingredientId || !currentCompany?.id) {
      setSelectedPurchaseRows([]);
      return undefined;
    }

    const cachedRows = purchaseCacheRef.current.get(ingredientId);
    if (cachedRows) {
      setSelectedPurchaseRows(cachedRows);
      return undefined;
    }

    const requestId = ++purchaseRequestIdRef.current;
    setSelectedPurchaseRows([]);

    const loadPurchaseHistory = async () => {
      try {
        const latestPurchasesByProductId = await fetchLatestPurchasesByProductIds({
          companyId: currentCompany.id,
          productIds: [ingredientId],
          limitPerProduct: 3,
          maxPages: 1,
        });

        if (requestId !== purchaseRequestIdRef.current) {
          return;
        }

        const rowsForIngredient = safeArray(latestPurchasesByProductId?.[ingredientId]);
        purchaseCacheRef.current.set(ingredientId, rowsForIngredient);
        setSelectedPurchaseRows(rowsForIngredient);
      } catch {
        if (requestId === purchaseRequestIdRef.current) {
          setSelectedPurchaseRows([]);
        }
      }
    };

    loadPurchaseHistory();
  }, [currentCompany?.id, selected?.id]);

  const visibleRows = useMemo(
    () => rows.slice(0, visibleCount),
    [rows, visibleCount],
  );

  const hasMoreRows = visibleCount < rows.length;

  const loadMoreRows = useCallback(() => {
    if (!hasMoreRows) return;
    setVisibleCount(current => Math.min(current + MENU_COSTS_PAGE_SIZE, rows.length));
  }, [hasMoreRows, rows.length]);

  const handleContentScroll = useCallback(event => {
    if (isLoadingDb || !hasMoreRows) return;

    const layoutHeight = event?.nativeEvent?.layoutMeasurement?.height || 0;
    const contentOffsetY = event?.nativeEvent?.contentOffset?.y || 0;
    const contentHeight = event?.nativeEvent?.contentSize?.height || 0;

    if (layoutHeight + contentOffsetY >= contentHeight - 360) {
      loadMoreRows();
    }
  }, [hasMoreRows, isLoadingDb, loadMoreRows]);

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsIngredientsPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const duplicateCount = rows.reduce(
    (sum, item) => sum + Math.max(0, Number(item.duplicateCount || 1) - 1),
    0,
  );
  const reviewCount = rows.filter(item => ['review', 'estimated', 'manual'].includes(item.evidenceType || item.sourceType)).length;
  const documentedCount = rows.filter(item => (item.evidenceType || item.sourceType) === 'documented').length;

  const selectedWarnings = selected
    ? [
        selected.duplicateCount > 1
          ? `Este item consolida ${selected.duplicateCount} registros com o mesmo código ou nome.`
          : '',
        (selected.evidenceType || selected.sourceType) === 'review'
          ? 'Ainda não existe compra vinculada recente para este item.'
          : '',
        !selected.purchaseCost ? 'Sem custo de compra carregado.' : '',
      ].filter(Boolean)
    : [];

  const content = isLoadingDb ? (
    <View style={styles.emptyState}>
      <ActivityIndicator size="small" color={MENU_COLORS.brand} />
      <Text style={styles.emptyStateText}>Carregando ingredientes do ERP...</Text>
    </View>
  ) : loadError ? (
    <View style={styles.emptyState}>
      <Icon name="alert-circle" size={24} color={MENU_COLORS.muted} />
      <Text style={styles.emptyStateText}>{loadError}</Text>
    </View>
  ) : rows.length === 0 ? (
    <EmptyState text="Nenhum ingrediente encontrado no ERP." />
  ) : (
    <View style={styles.splitLayout}>
      <View style={styles.listPanel}>
        <View style={styles.activeCostHeader}>
          <View>
            <Text style={styles.panelTitle}>
              {RESOURCE_META.ingredients?.plural || 'Ingredientes'}
            </Text>
            <Text style={styles.panelSubtitle}>
              Itens comprados ou controlados como insumo de estoque e custo.
            </Text>
          </View>
          <Badge>{rows.length} item(ns)</Badge>
        </View>
        <View style={styles.badgeLine}>
          <Badge tone="good">{documentedCount} comprovado(s)</Badge>
          <Badge tone={reviewCount ? 'warn' : 'good'}>{reviewCount} para revisar</Badge>
          <Badge tone={duplicateCount ? 'warn' : 'good'}>{duplicateCount} duplicidade(s)</Badge>
        </View>
        {visibleRows.map(item => (
          <RowCard
            key={item.id}
            title={item.name}
            subtitle={item.description || item.notes || item.supplier || categoryName(db, item.categoryId)}
            imageSource={imageForIngredient(db, item)}
            selected={selected?.id === item.id}
            onPress={() => setSelectedId(item.id)}
            right={<Text style={styles.rowMoney}>{comparableCostLabel('ingredient', item)}</Text>}
            badges={[
              { label: evidenceLabel(item.evidenceType || item.sourceType), tone: (item.evidenceType || item.sourceType) === 'documented' ? 'good' : 'warn' },
              item.duplicateCount > 1
                ? { label: `Duplicado x${item.duplicateCount}`, tone: 'warn' }
                : { label: categoryName(db, item.categoryId), tone: 'neutral' },
            ]}
            meta={item.supplier || item.sourceReference || ''}
          />
        ))}
        {hasMoreRows ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
            <Text style={styles.emptyStateText}>Carregando mais ingredientes...</Text>
          </View>
        ) : null}
      </View>

      {selected ? (
        <DetailShell
          title={selected.name}
          subtitle={selected.description || selected.notes || selected.supplier || ''}
          badges={[
            { label: RESOURCE_META.ingredients?.singular || 'Ingrediente', tone: 'neutral' },
            { label: categoryName(db, selected.categoryId), tone: 'neutral' },
            { label: evidenceLabel(selected.evidenceType || selected.sourceType), tone: (selected.evidenceType || selected.sourceType) === 'documented' ? 'good' : 'warn' },
            selected.duplicateCount > 1
              ? { label: `Consolidado x${selected.duplicateCount}`, tone: 'warn' }
              : { label: selected.code || selected.id, tone: 'neutral' },
          ]}
        >
          <View style={styles.productHero}>
            <VisualThumb source={imageForIngredient(db, selected)} label={selected.name} size="lg" />
            <View style={styles.productHeroText}>
              <Text style={styles.productHeroTitle}>{categoryName(db, selected.categoryId)}</Text>
              <Text style={styles.productHeroSubtitle}>
                {selected.supplier || selected.sourceReference || 'ERP feedstock'}
              </Text>
            </View>
          </View>

          <ActiveCostPanel db={db} item={selected} />

          <InfoGrid
            rows={[
              {
                label: 'Custo de compra',
                value: `${money(selected.purchaseCost)} / ${decimal(selected.purchaseQty)} ${selected.baseUnit || 'un'}`,
                helper: selected.supplier || 'Sem fornecedor informado',
              },
              {
                label: 'Custo unitário',
                value: comparableCostLabel('ingredient', selected),
                helper: `ERP ${selected.erpUnit || 'UN'}`,
              },
              {
                label: 'Código ERP',
                value: selected.code || selected.sku || String(selected.id),
                helper: selected.sourceReference || 'Código consolidado',
              },
              {
                label: 'Compras',
                value: String(selectedPurchaseRows.length),
                helper: 'Últimas compras importadas do ERP',
              },
              {
                label: 'Pais vinculados',
                value: String(resourceParentUsageRows(db, 'ingredient', selected.id).length),
                helper: 'Produtos de venda que usam este insumo',
              },
              {
                label: 'Status',
                value: evidenceLabel(selected.evidenceType || selected.sourceType),
                helper: selected.duplicateCount > 1 ? `${selected.duplicateIds.length} duplicado(s) consolidado(s)` : selected.active ? 'Ativo' : 'Inativo',
              },
            ]}
          />

          {selectedWarnings.length ? (
            <View style={styles.panelNested}>
              <Text style={styles.panelTitle}>Atenção</Text>
              {selectedWarnings.map(message => (
                <Text key={message} style={styles.infoHelper}>{message}</Text>
              ))}
            </View>
          ) : null}

          <View style={styles.panelNested}>
            <Text style={styles.panelTitle}>Produtos-pai vinculados</Text>
            <Text style={styles.panelSubtitle}>
              O ingrediente abaixo aparece diretamente na engenharia de produtos.
            </Text>
            {resourceParentUsageRows(db, 'ingredient', selected.id).length ? resourceParentUsageRows(db, 'ingredient', selected.id).map(parentRow => (
              <RowCard
                key={parentRow.productId}
                title={parentRow.productName}
                subtitle={parentRow.category}
                meta={`${decimal(parentRow.qty, 3)} ${parentRow.unit || 'un'} · ${money(parentRow.cost)}`}
                right={<Text style={styles.rowMoney}>{parentRow.productCode}</Text>}
                badges={[{ label: 'Pai', tone: 'neutral' }]}
              />
            )) : <EmptyState text="Nenhum produto pai encontrado." />}
          </View>

          <PurchaseRows rows={selectedPurchaseRows} />
        </DetailShell>
      ) : (
        <EmptyState text="Selecione um ingrediente para ver custos, pais e compras." />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.page}>
        <View style={styles.toolbar}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Custos do cardápio</Text>
            <Text style={styles.pageTitle}>Engenharia de Produtos e Processos</Text>
          </View>
          <View style={styles.toolbarActions} />
        </View>

        <View style={[styles.body, !isWide && styles.bodyCompact]}>
          <View style={[styles.sidebar, !isWide && styles.sidebarCompact]}>
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
              <View style={[styles.menuList, !isWide && styles.menuListHorizontal]}>
                {MAIN_TABS.map(tab => (
                  <IconButton
                    key={tab.key}
                    icon={tab.icon}
                    label={tab.label}
                    active={tab.key === 'ingredients'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'ingredients'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Ingredientes</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar ingrediente, fornecedor ou código"
              />
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollBody}
              onScroll={handleContentScroll}
              scrollEventThrottle={200}
            >
              {content}
            </ScrollView>
          </View>
        </View>
      </View>
      <StateStore stores={['people', 'products', 'product_group_product', 'orders', 'categories']} />
    </SafeAreaView>
  );
}
