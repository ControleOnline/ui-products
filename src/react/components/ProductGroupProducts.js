import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import ProductFeedStock from './ProductFeedStock';
import {
  buildProductCostBreakdown,
  formatCurrency,
  normalizeEntityId,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';
import styles from './ProductGroupProducts.styles';

import {
  inlineStyle_85_8,
  inlineStyle_159_75,
  inlineStyle_177_10,
  inlineStyle_206_22,
  inlineStyle_240_62,
  inlineStyle_249_20,
  inlineStyle_253_94,
  inlineStyle_262_98,
  inlineStyle_311_85,
  inlineStyle_355_14,
  inlineStyle_714_12,
  inlineStyle_805_8,
  inlineStyle_812_12,
  inlineStyle_816_18,
} from './ProductGroupProducts.styles';

/*
 * Hierarquia de dados (confirmada via banco):
 *
 * product_group_product.product_type  →  enum: 'feedstock' | 'component' | 'package'
 *
 * O campo "productType" aqui é diferente do "type" do produto filho:
 *  - product.type = 'product' | 'component' | 'feedstock' | 'manufactured' | 'custom' | 'service' | 'package'
 *  - product_group_product.product_type = 'feedstock' | 'component' | 'package'
 *
 * Mapeamento:
 *  product.type 'feedstock'           → productGroupProduct.productType 'feedstock'
 *  product.type 'package'             → productGroupProduct.productType 'package'
 *  qualquer outro (product/component/manufactured/etc) → productGroupProduct.productType 'component'
 */
/* Extrai sigla da unidade de medida do produto */
const extractUnit = p => {
  if (!p) return '';
  // API retorna productUnit.productUnit (campo homônimo dentro do objeto ProductUnity)
  const u = p?.productUnit?.productUnit || p?.productUnit?.unit || p?.productUnity?.productUnit || p?.productUnity?.unit || p?.unit;
  return u ? String(u).toUpperCase() : '';
};

const toGroupProductType = productType => {
  if (productType === 'feedstock') return 'feedstock';
  if (productType === 'package') return 'package';
  return 'component';
};

const TYPE_LABELS = {
  product: 'Produto',
  component: 'Componente',
  feedstock: 'Insumo',
  manufactured: 'Fabricado',
  package: 'Embalagem',
  custom: 'Personalizado',
  service: 'Serviço',
};

const getQueueLabel = queue => {
  if (!queue) return '';
  if (typeof queue === 'string') return '';
  return String(queue.queue || queue.name || '').trim();
};

const resolveItemQueueLabel = item => {
  const productQueue = getQueueLabel(item?.productChild?.queue);
  return productQueue ? `Fila: ${productQueue}` : 'Produto sem fila';
};

const shouldShowInParentQueue = item =>
  item?.showInParentQueue !== false &&
  item?.show_in_parent_queue !== false &&
  item?.showProductGroupInQueue !== false &&
  item?.show_product_group_in_queue !== false;

const toProductGroupIri = value => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (value.startsWith('/product_groups/')) return value;
    const id = String(value).replace(/\D/g, '');
    return id ? `/product_groups/${id}` : null;
  }
  const id = value?.id || String(value?.['@id'] || '').replace(/\D/g, '');
  return id ? `/product_groups/${id}` : null;
};

const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const mergeById = (base, incoming) => {
  const map = new Map();
  (base || []).forEach(item => map.set(String(item?.id || item?.['@id'] || ''), item));
  (incoming || []).forEach(item => map.set(String(item?.id || item?.['@id'] || ''), item));
  return Array.from(map.values());
};

/* ─── Skeleton ─── */
const SkeletonLine = ({ width = '100%', height = 14, mb = 8 }) => (
  <View style={inlineStyle_85_8({
    height: height,
    mb: mb,
    width: width,
  })} />
);

/* ─── Modal de busca de produto ─── */
const ProductSearchModal = ({
  visible,
  onClose,
  onSelect,
  products,
  loading,
  loadingMore,
  hasMore,
  onSearch,
  onLoadMore,
  title,
  excludeId,
}) => {
  const [search, setSearch] = useState('');
  const onSearchRef = useRef(onSearch);
  const loadingMoreLockRef = useRef(false);

  const normalizedSearch = String(search || '').trim();
  const minChars = 2;
  const requestQuery = normalizedSearch.length >= minChars ? normalizedSearch : '';

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => {
      if (onSearchRef.current) onSearchRef.current(requestQuery);
    }, 350);
    return () => clearTimeout(t);
  }, [visible, requestQuery]);

  useEffect(() => {
    if (!loadingMore) loadingMoreLockRef.current = false;
  }, [loadingMore, requestQuery]);

  const filtered = products.filter(p => {
    /* anti-loop: exclui o próprio produto da lista */
    if (excludeId && String(p.id) === String(excludeId)) return false;
    return true;
  });
  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const handleScroll = ({ nativeEvent }) => {
    if (!onLoadMore || loading || loadingMore || !hasMore || loadingMoreLockRef.current) return;
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 140;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (nearBottom) {
      loadingMoreLockRef.current = true;
      onLoadMore(requestQuery);
    }
  };

  return (
    <AnimatedModal visible={visible} onRequestClose={handleClose}>
      <View style={styles.searchModal}>
        <View style={styles.searchModalHeader}>
          <Text style={styles.searchModalTitle}>{title || 'Selecionar produto'}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.searchModalClose}>
            <MaterialCommunityIcons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchInputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={inlineStyle_159_75} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar produto..."
            placeholderTextColor="#CBD5E1"
            style={styles.searchInput}
            autoFocus={visible}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={inlineStyle_177_10}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          {loading && (
            <View style={styles.searchEmpty}>
              <ActivityIndicator size="small" color="#94A3B8" />
              <Text style={styles.searchEmptyText}>Buscando produtos...</Text>
            </View>
          )}
          {!loading && filtered.length === 0 && (
            <View style={styles.searchEmpty}>
              <MaterialCommunityIcons name="package-variant-remove" size={36} color="#CBD5E1" />
              <Text style={styles.searchEmptyText}>
                {requestQuery ? 'Nenhum produto encontrado' : 'Nenhum produto ativo disponível'}
              </Text>
            </View>
          )}
          {!loading && filtered.map(p => {
            const typeLabel = TYPE_LABELS[p.type] || p.type || '';
            const queueLabel = getQueueLabel(p.queue);
            return (
              <TouchableOpacity
                key={String(p.id)}
                style={styles.searchResultItem}
                onPress={() => { setSearch(''); onSelect(p); }}
                activeOpacity={0.7}
              >
                <View style={inlineStyle_206_22}>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {p.product || p.name || `#${p.id}`}
                  </Text>
                  {!!typeLabel && <Text style={styles.searchResultType}>{typeLabel}</Text>}
                  {!!queueLabel && <Text style={styles.searchResultQueue}>Fila: {queueLabel}</Text>}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })}
          {loadingMore && (
            <View style={styles.searchFooterLoading}>
              <ActivityIndicator size="small" color="#94A3B8" />
            </View>
          )}
        </ScrollView>
      </View>
    </AnimatedModal>
  );
};

/* ─── Modal de formulário add/editar item ─── */
const ItemFormModal = ({
  visible, title, draft, onClose, onSave, saving, error,
  fieldErrors, onChangeDraft, brandColors,
}) => {
  if (!draft) return null;

  const inputStyle = field => [
    styles.input,
    fieldErrors?.[field] && styles.inputError,
  ];

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={inlineStyle_240_62}>
      <View style={styles.formModal}>
        <View style={styles.formModalHeader}>
          <Text style={styles.formModalTitle} numberOfLines={1}>{title || 'Modificador'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.formModalClose}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={inlineStyle_249_20} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.formModalBody}>
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={inlineStyle_253_94} />
                <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
              </View>
            )}

            {!!draft.productName && (
              <View style={[styles.fieldWrap, { marginBottom: 16 }]}>
                <Text style={styles.fieldLabel}>Produto</Text>
                <View style={styles.productReadonly}>
                  <MaterialCommunityIcons name="package-variant-closed" size={16} color="#64748B" style={inlineStyle_262_98} />
                  <Text style={styles.productReadonlyText} numberOfLines={2}>{draft.productName}</Text>
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.halfField, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>
                  Preço (R$) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  value={String(draft.price)}
                  onChangeText={v => onChangeDraft('price', v)}
                  keyboardType="numeric"
                  style={inputStyle('price')}
                  placeholder="0,00"
                  placeholderTextColor="#CBD5E1"
                />
                {!!fieldErrors?.price && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.price}</Text>
                )}
              </View>
              <View style={[styles.halfField, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>
                  Qtd{draft.productUnit ? ` (${draft.productUnit})` : ''} <Text style={styles.required}>*</Text>
                </Text>
                <View style={[inputStyle('quantity'), styles.quantityRow]}>
                  <TextInput
                    value={String(draft.quantity)}
                    onChangeText={v => onChangeDraft('quantity', v)}
                    keyboardType="numeric"
                    style={styles.quantityInput}
                    placeholder="1"
                    placeholderTextColor="#CBD5E1"
                  />
                  {!!draft.productUnit && (
                    <Text style={styles.unitInline}>{draft.productUnit}</Text>
                  )}
                </View>
                {!!fieldErrors?.quantity && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.quantity}</Text>
                )}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.productReadonly}>
                <MaterialCommunityIcons name="tag-outline" size={16} color="#64748B" style={inlineStyle_311_85} />
                <Text style={styles.productReadonlyText}>
                  {TYPE_LABELS[draft.productType] || draft.productType || 'Componente'}
                </Text>
              </View>
            </View>

            <View style={styles.visibilityRow}>
              <View style={styles.visibilityTextWrap}>
                <Text style={styles.visibilityTitle}>Exibir na fila do produto pai</Text>
              </View>
              <Switch
                value={draft.showInParentQueue !== false}
                onValueChange={value => onChangeDraft('showInParentQueue', value)}
                trackColor={{ false: '#E2E8F0', true: brandColors?.primary || '#3B82F6' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.formModalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: brandColors?.primary || '#3B82F6' }, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
          >
            <MaterialCommunityIcons name="content-save-outline" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

/* ─── Card de item do grupo ─── */
const ItemCard = ({
  item,
  onEdit,
  onRemove,
  onToggleShowInParentQueue,
  toggling,
  brandColors,
  productGroupIri,
  costSummary,
  parentProductId,
}) => {
  const name =
    item.productChild?.name ||
    item.productChild?.product ||
    item.productChild?.title ||
    String(item.productChild?.id || item.productChild?.['@id'] || '');
  const type = item.productChild?.type || item.productType || '';
  const typeLabel = TYPE_LABELS[type] || type;
  const price = parseFloat(item.price ?? 0)
    .toFixed(2)
    .replace('.', ',');
  const qty = item.quantity ?? 1;
  const queueLabel = resolveItemQueueLabel(item);
  const showInParentQueue = shouldShowInParentQueue(item);
  const hasFeedstocks = Boolean(costSummary?.hasFeedstocks);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemCardRow}>
        <View style={inlineStyle_355_14}>
          <Text style={styles.itemCardName} numberOfLines={2}>{name}</Text>
          {!!queueLabel && (
            <View style={styles.itemQueueLine}>
              <MaterialCommunityIcons name="tray-full" size={12} color="#64748B" />
              <Text style={styles.itemQueueText} numberOfLines={1}>{queueLabel}</Text>
            </View>
          )}
          {!!typeLabel && (
            <View style={styles.itemCardBadges}>
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{typeLabel}</Text>
              </View>
            </View>
          )}
          <View style={styles.parentQueueVisibilityLine}>
            <MaterialCommunityIcons
              name={showInParentQueue ? 'eye-outline' : 'eye-off-outline'}
              size={12}
              color={showInParentQueue ? '#0E7490' : '#94A3B8'}
            />
            <Text
              style={[
                styles.parentQueueVisibilityText,
                !showInParentQueue && styles.parentQueueVisibilityTextMuted,
              ]}
              numberOfLines={1}
            >
              {showInParentQueue ? 'Aparece na fila do pai' : 'Nao aparece na fila do pai'}
            </Text>
          </View>
        </View>

        <View style={styles.itemCardRight}>
          <View style={styles.itemPriceWrap}>
            <Text style={styles.itemPrice}>R$ {price}</Text>
            {hasFeedstocks ? (
              <Text style={styles.itemCostText}>Custo {formatCurrency(costSummary?.cost)}</Text>
            ) : null}
            <Text style={styles.itemQty}>× {qty}</Text>
          </View>
          <View style={styles.itemCardActions}>
            <Switch
              value={showInParentQueue}
              disabled={toggling}
              onValueChange={value => onToggleShowInParentQueue(item, value)}
              trackColor={{ false: '#E2E8F0', true: brandColors?.primary || '#3B82F6' }}
              thumbColor="#fff"
            />
            <TouchableOpacity
              style={styles.itemActionBtn}
              onPress={onEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.itemActionBtn, { backgroundColor: '#FFF1F1' }]}
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Insumos do componente (feedstock) */}
      <ProductFeedStock
        row={item}
        productGroupIri={productGroupIri}
        parentProductId={parentProductId}
        brandColors={brandColors}
        targetLabel="este componente"
      />
    </View>
  );
};

/* ─── Componente principal ─── */
const ProductGroupProducts = ({ productGroup, ProductId, brandColors }) => {
  const productGroupProductStore = useStore('product_group_product');
  const productsStore = useStore('products');
  const peopleStore = useStore('people');

  const { currentCompany } = peopleStore.getters;

  const productGroupIri = toProductGroupIri(productGroup);
  const productGroupId = String(productGroupIri || '').replace(/\D/g, '');

  const [loaded, setLoaded] = useState(false);
  const [currentItems, setCurrentItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [productsPage, setProductsPage] = useState(1);
  const [productsQuery, setProductsQuery] = useState('');

  /* modais */
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formDraft, setFormDraft] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [togglingQueueItemId, setTogglingQueueItemId] = useState('');
  const [costByItemId, setCostByItemId] = useState({});
  const [costReloadToken, setCostReloadToken] = useState(0);

  const fetchItems = useCallback(async () => {
    if (!productGroupIri) { setCurrentItems([]); return []; }
    const response = await productGroupProductStore.actions.getItems({
      product: `/products/${ProductId}`,
      productGroup: productGroupIri,
    });
    const items = extractItems(response);
    setCurrentItems(items);
    return items;
  }, [productGroupIri, ProductId]);

  useEffect(() => {
    if (!ProductId) { setLoaded(false); return; }
    setLoaded(false);
    fetchItems()
      .then(() => setLoaded(true))
      .catch(() => setLoaded(true));
  }, [ProductId, productGroupIri]);

  useEffect(() => {
    if (!productGroupIri || !Array.isArray(currentItems) || currentItems.length === 0) {
      setCostByItemId({});
      return undefined;
    }

    let cancelled = false;

    const loadComponentCosts = async () => {
      try {
        const breakdown = await buildProductCostBreakdown({
          productId: ProductId,
          productGroupProductActions: productGroupProductStore.actions,
          productGroupIri,
        });

        if (!cancelled) {
          setCostByItemId(
            breakdown?.groupItemCosts && typeof breakdown.groupItemCosts === 'object'
              ? breakdown.groupItemCosts
              : {},
          );
        }
      } catch {
        if (!cancelled) {
          setCostByItemId({});
        }
      }
    };

    loadComponentCosts();

    return () => {
      cancelled = true;
    };
  }, [currentItems, productGroupIri, productGroupProductStore.actions, costReloadToken]);

  useEffect(() => {
    if (typeof window === 'undefined' || !productGroupId || !ProductId) return undefined;

    const handleBomChanged = event => {
      const changedGroupId = normalizeEntityId(event?.detail?.productGroupId);
      const changedParentProductId = normalizeEntityId(
        event?.detail?.parentProductId || event?.detail?.productId,
      );

      if (changedGroupId !== String(productGroupId)) return;
      if (changedParentProductId !== String(ProductId)) return;

      setCostReloadToken(current => current + 1);
    };

    window.addEventListener(PRODUCT_EVENTS.BOM_CHANGED, handleBomChanged);
    return () => {
      window.removeEventListener(PRODUCT_EVENTS.BOM_CHANGED, handleBomChanged);
    };
  }, [productGroupId, ProductId]);

  const searchAvailableProducts = useCallback(async (searchTerm, page = 1, append = false) => {
    const q = String(searchTerm || '').trim();
    if (!currentCompany?.id) {
      setAvailableProducts([]);
      setHasMoreProducts(false);
      setProductsPage(1);
      setProductsQuery('');
      setSearchingProducts(false);
      setLoadingMoreProducts(false);
      return;
    }

    if (append) {
      if (loadingMoreProducts || searchingProducts || !hasMoreProducts) return;
      setLoadingMoreProducts(true);
    } else {
      setSearchingProducts(true);
    }

    try {
      const response = await productsStore.actions.getItems({
        active: 1,
        company: currentCompany.id,
        'order[product]': 'ASC',
        itemsPerPage: 50,
        page,
        ...(q ? { product: q } : {}),
      });
      const list = extractItems(response);
      const existingChildIds = new Set(
        (currentItems || []).map(item =>
          String(item?.productChild?.id || String(item?.productChild || '').replace(/\D/g, '') || '')
        ).filter(Boolean)
      );
      const filtered = (list || []).filter(prod =>
          String(prod?.id || '') !== String(ProductId || '') &&
          !existingChildIds.has(String(prod?.id || ''))
      );
      setAvailableProducts(prev => (append ? mergeById(prev, filtered) : filtered));

      const hasNextByView = !!response?.['hydra:view']?.next;
      setHasMoreProducts(hasNextByView || (list || []).length >= 50);
      setProductsPage(page);
      setProductsQuery(q);
    } catch {
      if (!append) setAvailableProducts([]);
      setHasMoreProducts(false);
    } finally {
      setSearchingProducts(false);
      setLoadingMoreProducts(false);
    }
  }, [currentCompany?.id, currentItems, ProductId]);

  const handleSearchProducts = useCallback((searchTerm) => {
    const q = String(searchTerm || '').trim();
    const normalized = q.length >= 2 ? q : '';
    searchAvailableProducts(normalized, 1, false);
  }, [searchAvailableProducts]);

  const handleLoadMoreProducts = useCallback((searchTerm) => {
    const q = String(searchTerm || '').trim();
    const normalized = q.length >= 2 ? q : '';
    if (normalized !== productsQuery) return;
    if (!hasMoreProducts || searchingProducts || loadingMoreProducts) return;
    searchAvailableProducts(normalized, productsPage + 1, true);
  }, [productsQuery, hasMoreProducts, searchingProducts, loadingMoreProducts, searchAvailableProducts, productsPage]);

  const reloadItems = async () => {
    setLoaded(false);
    await fetchItems();
    setLoaded(true);
  };

  const openProductSearchModal = () => {
    setAvailableProducts([]);
    setHasMoreProducts(true);
    setProductsPage(1);
    setProductsQuery('');
    setSearchModalVisible(true);
  };

  /* ── Produto selecionado na busca → busca completo para obter productUnit aninhado ── */
  const handleProductSelected = async product => {
    setSearchModalVisible(false);

    /* segurança: feedstock não pode ser modificador de nível 1 */
    if (product.type === 'feedstock') {
      setFormError('Insumos não podem ser adicionados como modificadores. Adicione-os na seção de insumos do componente.');
      setFormModalVisible(true);
      setFormDraft(null);
      return;
    }

    let full = product;
    try {
      const data = await productsStore.actions.get(product.id);
      if (data) full = data;
    } catch { /* usa dados parciais se falhar */ }

    setEditingItem(null);
    setFormDraft({
      productChild: String(full.id),
      productName: full.product || full.name || `#${full.id}`,
      productType: toGroupProductType(full.type),
      productUnit: extractUnit(full),
      price: '0',
      quantity: '1',
      showInParentQueue: true,
    });
    setFormError('');
    setFieldErrors({});
    setFormModalVisible(true);
  };

  /* ── Editar item existente ── */
  const openEditItemModal = item => {
    const name =
      item.productChild?.name ||
      item.productChild?.product ||
      item.productChild?.title ||
      String(item.productChild?.id || '');
    setEditingItem(item);
    setFormDraft({
      productChild: String(item.productChild?.id || ''),
      productName: name,
      productType: item.productType || toGroupProductType(item.productChild?.type),
      productUnit: extractUnit(item.productChild),
      price: String(item.price ?? '0'),
      quantity: String(Number(item.quantity) > 0 ? item.quantity : 1),
      showInParentQueue: shouldShowInParentQueue(item),
    });
    setFormError('');
    setFieldErrors({});
    setFormModalVisible(true);
  };

  const closeFormModal = () => {
    setFormModalVisible(false);
    setEditingItem(null);
    setFormDraft(null);
    setFormError('');
    setFieldErrors({});
  };

  const handleChangeDraft = (field, value) => {
    setFormDraft(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  /* ── Validação por campo ── */
  const validateForm = draft => {
    const errs = {};
    const price = parseFloat(String(draft.price ?? '').replace(',', '.'));
    const qty = parseFloat(String(draft.quantity ?? '').replace(',', '.'));

    if (String(draft.price ?? '').trim() === '') {
      errs.price = 'Obrigatório. Use 0 para gratuito.';
    } else if (Number.isNaN(price) || price < 0) {
      errs.price = 'Valor inválido.';
    }

    if (String(draft.quantity ?? '').trim() === '') {
      errs.quantity = 'Obrigatória.';
    } else if (Number.isNaN(qty) || qty <= 0) {
      errs.quantity = 'Deve ser maior que zero.';
    }

    return errs;
  };

  /* ── Salvar (add ou edit) ── */
  const handleSaveForm = async () => {
    if (!formDraft) return;
    setFormError('');

    const errs = validateForm(formDraft);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    const nextPrice = parseFloat(String(formDraft.price).replace(',', '.'));
    const nextQty = parseFloat(String(formDraft.quantity).replace(',', '.'));

    setFormSaving(true);
    try {
      let payload;
      if (editingItem) {
        /*
         * PUT: incluir id para que o store use o método PUT.
         * Não incluir extraData (não existe na tabela product_group_product).
         */
        payload = {
          id: editingItem.id,
          product: toProductIri(editingItem.product) || `/products/${ProductId}`,
          productGroup: toProductGroupIri(editingItem.productGroup) || productGroupIri,
          productChild: toProductIri(editingItem.productChild),
          productType: editingItem.productType || toGroupProductType(editingItem.productChild?.type),
          price: nextPrice,
          quantity: nextQty,
          active: editingItem.active ?? true,
          showInParentQueue: formDraft.showInParentQueue !== false,
        };
      } else {
        /*
         * POST: campos obrigatórios conforme entidade PHP.
         * product_type enum: 'feedstock' | 'component' | 'package'
         */
        payload = {
          product: `/products/${ProductId}`,
          productGroup: productGroupIri,
          productChild: `/products/${String(formDraft.productChild).replace(/\D/g, '')}`,
          productType: formDraft.productType,
          price: nextPrice,
          quantity: nextQty,
          showInParentQueue: formDraft.showInParentQueue !== false,
        };
      }

      await productGroupProductStore.actions.save(payload);
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId,
        source: editingItem
          ? 'ProductGroupProducts.updateItem'
          : 'ProductGroupProducts.addItem',
      });
      await reloadItems();
      closeFormModal();
    } catch (e) {
      const raw =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';

      /* trata erro de duplicata (constraint único no banco) */
      if (raw.toLowerCase().includes('duplicate') || raw.toLowerCase().includes('unique')) {
        setFormError('Este produto já foi adicionado a este grupo.');
      } else {
        setFormError(raw || 'Falha ao salvar. Verifique os dados e tente novamente.');
      }
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleShowInParentQueue = async (item, showInParentQueue) => {
    const id = String(item?.id || item?.['@id'] || '').replace(/\D/g, '');
    if (!id) return;

    setTogglingQueueItemId(id);
    try {
      await productGroupProductStore.actions.save({
        id: item.id || id,
        product: toProductIri(item.product) || `/products/${ProductId}`,
        productGroup: toProductGroupIri(item.productGroup) || productGroupIri,
        productChild: toProductIri(item.productChild),
        productType: item.productType || toGroupProductType(item.productChild?.type),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        active: item.active ?? true,
        showInParentQueue,
      });

      setCurrentItems(prev => prev.map(current =>
        String(current?.id || current?.['@id'] || '').replace(/\D/g, '') === id
          ? { ...current, showInParentQueue }
          : current
      ));
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId,
        source: 'ProductGroupProducts.toggleParentQueueVisibility',
      });
    } finally {
      setTogglingQueueItemId('');
    }
  };

  /* ── Remover item ── */
  const handleConfirmRemove = async () => {
    if (!confirmDeleteItem) return;
    const id = String(
      confirmDeleteItem?.id || confirmDeleteItem?.['@id'] || '',
    ).replace(/\D/g, '');
    if (!id) { setConfirmDeleteItem(null); return; }
    setRemoving(true);
    try {
      await productGroupProductStore.actions.remove(id);
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId,
        source: 'ProductGroupProducts.removeItem',
      });
      await reloadItems();
    } catch {
      /* silent */
    } finally {
      setRemoving(false);
      setConfirmDeleteItem(null);
    }
  };

  /* ── Render ── */
  if (!loaded) {
    return (
      <View style={inlineStyle_714_12}>
        <SkeletonLine width="50%" height={12} mb={10} />
        <SkeletonLine height={60} mb={6} />
        <SkeletonLine height={60} mb={0} />
      </View>
    );
  }

  const deleteItemName =
    confirmDeleteItem?.productChild?.product ||
    confirmDeleteItem?.productChild?.name ||
    confirmDeleteItem?.productChild?.title ||
    'este item';

  return (
    <View style={styles.container}>
      {/* Lista de itens como cards */}
      {currentItems.length === 0 && (
        <View style={styles.emptyItems}>
          <MaterialCommunityIcons name="food-variant-off" size={26} color="#CBD5E1" />
          <Text style={styles.emptyItemsText}>Nenhum modificador adicionado</Text>
        </View>
      )}
      {currentItems.map((item, index) => {
        const key = String(item?.id || item?.['@id'] || index);
        const itemId = String(item?.id || item?.['@id'] || '').replace(/\D/g, '');
        return (
          <ItemCard
            key={key}
            item={item}
            onEdit={() => openEditItemModal(item)}
            onRemove={() => setConfirmDeleteItem(item)}
            onToggleShowInParentQueue={handleToggleShowInParentQueue}
            toggling={!!itemId && itemId === togglingQueueItemId}
            brandColors={brandColors}
            productGroupIri={productGroupIri}
            costSummary={costByItemId[normalizeEntityId(item)]}
            parentProductId={ProductId}
          />
        );
      })}
      {/* Botão adicionar */}
      <TouchableOpacity
        style={[styles.addItemBtn, { borderColor: brandColors?.primary || '#64748B' }]}
        onPress={openProductSearchModal}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={18}
          color={brandColors?.primary || '#64748B'}
        />
        <Text style={[styles.addItemBtnText, { color: brandColors?.primary || '#64748B' }]}>
          Adicionar modificador / componente
        </Text>
      </TouchableOpacity>
      {/* Modal: busca de produto */}
      <ProductSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSelect={handleProductSelected}
        products={availableProducts}
        loading={searchingProducts}
        loadingMore={loadingMoreProducts}
        hasMore={hasMoreProducts}
        onSearch={handleSearchProducts}
        onLoadMore={handleLoadMoreProducts}
        brandColors={brandColors}
        excludeId={ProductId}
      />
      {/* Modal: formulário add/editar */}
      <ItemFormModal
        visible={formModalVisible}
        title={
          editingItem
            ? 'Editar modificador'
            : `Adicionar: ${formDraft?.productName || ''}`
        }
        draft={formDraft}
        onClose={closeFormModal}
        onSave={handleSaveForm}
        saving={formSaving}
        error={formError}
        fieldErrors={fieldErrors}
        onChangeDraft={handleChangeDraft}
        brandColors={brandColors}
      />
      {/* Modal: confirmar exclusão */}
      <AnimatedModal
        visible={!!confirmDeleteItem}
        onRequestClose={() => setConfirmDeleteItem(null)}
        style={inlineStyle_805_8}
      >
        <View style={styles.confirmModal}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={36}
            color="#EF4444"
            style={inlineStyle_812_12}
          />
          <Text style={styles.confirmTitle}>Remover modificador?</Text>
          <Text style={styles.confirmSubtitle}>
            <Text style={inlineStyle_816_18}>{deleteItemName}</Text> será removido do grupo.
            Esta ação não pode ser desfeita.
          </Text>
          <View style={styles.confirmFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDeleteItem(null)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, removing && { opacity: 0.6 }]}
              onPress={handleConfirmRemove}
              disabled={removing}
            >
              <Text style={styles.deleteBtnText}>{removing ? 'Removendo...' : 'Remover'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
};

export default ProductGroupProducts;
