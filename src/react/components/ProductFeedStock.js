import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';
import ProductReferenceLink from '@controleonline/ui-products/src/react/components/ProductReferenceLink';
import styles from './ProductFeedStock.styles';

import {
  inlineStyle_71_62,
  inlineStyle_82_92,
  inlineStyle_210_75,
  inlineStyle_228_10,
  inlineStyle_263_22,
  inlineStyle_307_62,
  inlineStyle_319_92,
  inlineStyle_326_94,
  inlineStyle_758_10,
  inlineStyle_798_22,
  inlineStyle_882_8,
  inlineStyle_889_12,
  inlineStyle_893_18,
} from './ProductFeedStock.styles';

/*
 * ProductFeedStock
 *
 * Exibe e gerencia os insumos (feedstock) de um produto.
 *
 * Estrutura de dados (mesma tabela product_group_product, productType='feedstock'):
 *  product      = IRI do produto que consome o insumo
 *  productGroup = IRI do grupo quando o insumo pertence a um modificador
 *  productChild = IRI do insumo em si
 *  productType  = 'feedstock'
 *  price        = custo do insumo
 *  quantity     = quantidade usada
 */

/* Extrai a sigla da unidade de medida do produto (ex: 'KG', 'UN', 'L') */
const extractUnit = p => {
  if (!p) return '';
  // API retorna productUnit.productUnit (campo homônimo dentro do objeto ProductUnity)
  const u = p?.productUnit?.productUnit || p?.productUnit?.unit || p?.productUnity?.productUnit || p?.productUnity?.unit || p?.unit;
  return u ? String(u).toUpperCase() : '';
};

const toIri = (value, prefix) => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (value.startsWith(prefix)) return value;
    const id = String(value).replace(/\D/g, '');
    return id ? `${prefix}${id}` : null;
  }
  const id = value?.id || String(value?.['@id'] || '').replace(/\D/g, '');
  return id ? `${prefix}${id}` : null;
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

const withFeedstockScope = (items, scope) =>
  (items || []).map(item => ({
    ...item,
    __feedstockScope: scope,
  }));

const getFeedstockScopeLabel = item =>
  item?.__feedstockScope === 'direct'
    ? 'Receita do item'
    : item?.__feedstockScope === 'group'
      ? 'Especifico deste grupo'
      : '';

/* ─── Modal de cadastro rápido de insumo ─── */
const QuickRegisterProductModal = ({ visible, onClose, onSave, saving, error, brandColors, units }) => {
  const [name, setName] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      /* pré-seleciona 'UN' se disponível */
      const unUnit = (units || []).find(u => String(u.label).toUpperCase() === 'UN');
      setSelectedUnitId(unUnit ? String(unUnit.id) : (units?.[0] ? String(units[0].id) : ''));
    }
  }, [visible, units]);

  const canSave = !!name.trim() && !!selectedUnitId && !saving;

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={inlineStyle_71_62}>
      <View style={styles.formModal}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Novo insumo</Text>
          <TouchableOpacity onPress={onClose} style={styles.formClose}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.formBody}>
          {!!error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={inlineStyle_82_92} />
              <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>
            Nome <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { marginBottom: 16 }]}
            placeholder="Ex: Farinha de trigo"
            placeholderTextColor="#CBD5E1"
            autoFocus={visible}
            returnKeyType="done"
          />

          <Text style={styles.fieldLabel}>
            Unidade de Medida <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitChipsRow}>
            {(units || []).map(u => {
              const active = String(u.id) === selectedUnitId;
              return (
                <TouchableOpacity
                  key={String(u.id)}
                  style={[styles.unitChip, active && { borderColor: brandColors?.primary || '#3B82F6', backgroundColor: '#EFF6FF' }]}
                  onPress={() => setSelectedUnitId(String(u.id))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.unitChipText, active && { color: brandColors?.primary || '#3B82F6', fontWeight: '700' }]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {(!units || units.length === 0) && (
              <Text style={styles.unitChipEmpty}>Nenhuma unidade cadastrada</Text>
            )}
          </ScrollView>
        </View>
        <View style={styles.formFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: brandColors?.primary || '#3B82F6' }, !canSave && { opacity: 0.55 }]}
            onPress={() => canSave && onSave(name.trim(), selectedUnitId)}
            disabled={!canSave}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Cadastrando...' : 'Cadastrar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

/* ─── Modal de busca de produto para insumo ─── */
const FeedStockSearchModal = ({
  visible,
  onClose,
  onSelect,
  products,
  loading,
  loadingMore,
  hasMore,
  onSearch,
  onLoadMore,
  excludeId,
  onQuickRegister,
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

  const filtered = (products || []).filter(p => {
    /* anti-loop: não permite que o próprio componente seja seu insumo */
    if (excludeId && String(p.id) === String(excludeId)) return false;
    return true;
  });

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

  const handleClose = () => { setSearch(''); onClose(); };

  return (
    <AnimatedModal visible={visible} onRequestClose={handleClose}>
      <View style={styles.searchModal}>
        <View style={styles.searchHeader}>
          <Text style={styles.searchTitle}>Selecionar insumo</Text>
          <TouchableOpacity onPress={handleClose} style={styles.searchClose}>
            <MaterialCommunityIcons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchInputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={inlineStyle_210_75} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar insumo..."
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
          style={inlineStyle_228_10}
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
              <MaterialCommunityIcons name="package-variant-remove" size={32} color="#CBD5E1" />
              <Text style={styles.searchEmptyText}>
                {requestQuery ? 'Nenhum insumo encontrado' : 'Nenhum insumo ativo disponível'}
              </Text>
              {!!onQuickRegister && (
                <TouchableOpacity style={styles.quickRegBtn} onPress={onQuickRegister} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={15} color="#3B82F6" />
                  <Text style={styles.quickRegBtnText}>Cadastrar novo insumo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {!loading && filtered.map(p => {
            const unit = extractUnit(p);
            return (
              <TouchableOpacity
                key={String(p.id)}
                style={styles.searchResultItem}
                onPress={() => { setSearch(''); onSelect(p); }}
                activeOpacity={0.7}
              >
                <View style={inlineStyle_263_22}>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {p.product || p.name || `#${p.id}`}
                  </Text>
                  {!!unit && (
                    <Text style={styles.searchResultType}>Unidade: {unit}</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })}
          {!loading && loadingMore && (
            <View style={styles.searchMoreFooter}>
              <ActivityIndicator size="small" color="#94A3B8" />
              <Text style={styles.searchMoreText}>Carregando mais...</Text>
            </View>
          )}
        </ScrollView>

        {!!onQuickRegister && filtered.length > 0 && (
          <TouchableOpacity style={styles.searchFooterRegBtn} onPress={onQuickRegister} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus-circle-outline" size={15} color="#3B82F6" />
            <Text style={styles.quickRegBtnText}>Cadastrar novo insumo</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedModal>
  );
};

/* ─── Modal de formulário do insumo ─── */
const FeedStockFormModal = ({
  visible, title, draft, onClose, onSave,
  saving, error, fieldErrors, onChangeDraft, brandColors,
}) => {
  if (!draft) return null;

  const inputStyle = field => [
    styles.input,
    fieldErrors?.[field] && styles.inputError,
  ];

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={inlineStyle_307_62}>
      <View style={styles.formModal}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle} numberOfLines={1}>{title || 'Insumo'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.formClose}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          {!!error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={inlineStyle_319_92} />
              <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
            </View>
          )}

          {!!draft.productName && (
            <View style={styles.productReadonlyWrap}>
              <MaterialCommunityIcons name="package-variant-closed" size={16} color="#64748B" style={inlineStyle_326_94} />
              <Text style={styles.productReadonlyText} numberOfLines={2}>{draft.productName}</Text>
            </View>
          )}

          <View style={styles.row}>
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
            <View style={[styles.halfField, { marginBottom: 14 }]}>
              <Text style={styles.fieldLabel}>
                Custo (R$) <Text style={styles.required}>*</Text>
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
          </View>
        </View>

        <View style={styles.formFooter}>
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

/* ─── Componente principal ─── */
const ProductFeedStock = ({
  row,
  productIri,
  productGroupIri,
  parentProductId,
  brandColors,
  targetLabel = 'este produto',
}) => {
  const store = useStore('product_group_product');
  const productsStore = useStore('products');
  const peopleStore = useStore('people');
  const productUnitStore = useStore('product_unit');

  const { currentCompany } = peopleStore.getters;

  const targetProductIri =
    toIri(productIri, '/products/') ||
    toIri(row?.productChild?.['@id'] || row?.productChild, '/products/');

  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [productsPage, setProductsPage] = useState(1);
  const [productsQuery, setProductsQuery] = useState('');

  /* modais */
  const [searchVisible, setSearchVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formDraft, setFormDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [removing, setRemoving] = useState(false);

  /* modal cadastro rápido de insumo */
  const [quickRegVisible, setQuickRegVisible] = useState(false);
  const [quickRegSaving, setQuickRegSaving] = useState(false);
  const [quickRegError, setQuickRegError] = useState('');
  const [unitOptions, setUnitOptions] = useState([]);

  /* ── Buscar insumos quando expandido ── */
  const fetchItems = useCallback(async () => {
    if (!targetProductIri) { setItems([]); return; }
    try {
      const directParams = {
        product: targetProductIri,
        productType: 'feedstock',
        'exists[productGroup]': false,
      };
      const directResponse = await store.actions.getItems(directParams);
      const directItems = withFeedstockScope(extractItems(directResponse), 'direct');

      if (productGroupIri) {
        const groupedResponse = await store.actions.getItems({
          product: targetProductIri,
          productType: 'feedstock',
          productGroup: productGroupIri,
        });
        const groupedItems = withFeedstockScope(extractItems(groupedResponse), 'group');
        setItems(mergeById(groupedItems, directItems));
        return;
      }

      setItems(directItems);
    } catch {
      setItems([]);
    }
  }, [targetProductIri, productGroupIri]);

  useEffect(() => {
    if (!expanded) return;
    setLoaded(false);
    fetchItems().then(() => setLoaded(true));
  }, [expanded, targetProductIri, productGroupIri]);

  const targetProductNumericId = String(targetProductIri || '').replace(/\D/g, '');

  const searchAvailableProducts = useCallback(async (searchTerm, page = 1, append = false) => {
    const q = String(searchTerm || '').trim();
    if (!currentCompany?.id) {
      setAllProducts([]);
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
        /*
         * Insumos SOMENTE aceitam produtos do tipo 'feedstock'.
         * Componentes e produtos regulares são modificadores, não insumos.
         */
        type: ['feedstock'],
        'order[product]': 'ASC',
        itemsPerPage: 50,
        page,
        ...(q ? { product: q } : {}),
      });
      const list = extractItems(response);
      const existingChildIds = new Set(
        (items || []).map(item =>
          String(item?.productChild?.id || String(item?.productChild || '').replace(/\D/g, '') || '')
        ).filter(Boolean)
      );
      const filtered = (list || []).filter(prod =>
        String(prod?.id || '') !== String(targetProductNumericId || '') &&
        !existingChildIds.has(String(prod?.id || ''))
      );
      setAllProducts(prev => (append ? mergeById(prev, filtered) : filtered));

      const hasNextByView = !!response?.['hydra:view']?.next;
      setHasMoreProducts(hasNextByView || (list || []).length >= 50);
      setProductsPage(page);
      setProductsQuery(q);
    } catch (_) {
      if (!append) setAllProducts([]);
      setHasMoreProducts(false);
    } finally {
      setSearchingProducts(false);
      setLoadingMoreProducts(false);
    }
  }, [
    currentCompany?.id,
    loadingMoreProducts,
    searchingProducts,
    hasMoreProducts,
    items,
    targetProductNumericId,
  ]);

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
  }, [
    productsQuery,
    hasMoreProducts,
    searchingProducts,
    loadingMoreProducts,
    searchAvailableProducts,
    productsPage,
  ]);

  const reloadItems = async () => {
    await fetchItems();
  };

  /* ── Validação ── */
  const validateDraft = draft => {
    const errs = {};
    const qty = parseFloat(String(draft.quantity ?? '').replace(',', '.'));
    const price = parseFloat(String(draft.price ?? '').replace(',', '.'));

    if (String(draft.quantity ?? '').trim() === '') errs.quantity = 'Obrigatória.';
    else if (Number.isNaN(qty) || qty <= 0) errs.quantity = 'Deve ser maior que zero.';

    if (String(draft.price ?? '').trim() === '') errs.price = 'Obrigatório (use 0 para gratuito).';
    else if (Number.isNaN(price) || price < 0) errs.price = 'Valor inválido.';

    return errs;
  };

  /* ── Produto selecionado → busca completo para obter productUnit aninhado ── */
  const handleProductSelected = async product => {
    setSearchVisible(false);
    let full = product;
    try {
      const data = await productsStore.actions.get(product.id);
      if (data) full = data;
    } catch { /* usa dados parciais se falhar */ }
    setEditingItem(null);
    setFormDraft({
      productChild: String(full.id),
      productName: full.product || full.name || `#${full.id}`,
      productUnit: extractUnit(full),
      quantity: '1',
      price: '0',
    });
    setFormError('');
    setFieldErrors({});
    setFormVisible(true);
  };

  /* ── Editar insumo existente ── */
  const openEdit = item => {
    const name =
      item.productChild?.product ||
      item.productChild?.name ||
      String(item.productChild?.id || '');
    setEditingItem(item);
    setFormDraft({
      productChild: String(item.productChild?.id || ''),
      productName: name,
      productUnit: extractUnit(item.productChild),
      quantity: String(item.quantity ?? '1'),
      price: String(item.price ?? '0'),
    });
    setFormError('');
    setFieldErrors({});
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingItem(null);
    setFormDraft(null);
    setFormError('');
    setFieldErrors({});
  };

  /* ── Carrega unidades quando o modal de cadastro rápido abre ── */
  const openQuickReg = useCallback(async () => {
    setSearchVisible(false);
    setQuickRegError('');
    if (currentCompany?.id && productUnitStore?.actions) {
      try {
        const res = await productUnitStore.actions.getItems({
          people: `/people/${currentCompany.id}`,
          itemsPerPage: 200,
        });
        const list = Array.isArray(res) ? res : (res?.['hydra:member'] || res?.member || []);
        setUnitOptions(list.map(u => ({ id: u.id, label: u.productUnit || u.unit || String(u.id) })));
      } catch {
        setUnitOptions([]);
      }
    }
    setQuickRegVisible(true);
  }, [currentCompany?.id, productUnitStore]);

  /* ── Cadastro rápido de insumo ── */
  const handleQuickRegSave = async (name, unitId) => {
    if (!name || !unitId || !currentCompany?.id) return;
    setQuickRegSaving(true);
    setQuickRegError('');
    try {
      const newProduct = await productsStore.actions.save({
        product: name,
        type: 'feedstock',
        company: `/people/${currentCompany.id}`,
        productUnit: `/product_unities/${unitId}`,
        description: '',
        price: 0,
        featured: false,
        productCondition: 'new',
        active: true,
      });
      setQuickRegVisible(false);
      if (newProduct?.id) {
        await searchAvailableProducts('', 1, false);
        handleProductSelected(newProduct);
      }
    } catch (e) {
      const raw =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';
      setQuickRegError(raw || 'Falha ao cadastrar insumo.');
    } finally {
      setQuickRegSaving(false);
    }
  };

  const handleChangeDraft = (field, value) => {
    setFormDraft(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  /* ── Salvar ── */
  const handleSave = async () => {
    if (!formDraft) return;
    setFormError('');

    const errs = validateDraft(formDraft);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});

    const nextQty = parseFloat(String(formDraft.quantity).replace(',', '.'));
    const nextPrice = parseFloat(String(formDraft.price).replace(',', '.'));

    setSaving(true);
    try {
      let payload;
      if (editingItem) {
        payload = {
          id: editingItem.id,
          product: targetProductIri,
          productChild: toIri(editingItem.productChild, '/products/'),
          productType: 'feedstock',
          quantity: nextQty,
          price: nextPrice,
          active: editingItem.active ?? true,
        };
        const editingProductGroupIri = toIri(editingItem.productGroup, '/product_groups/');
        if (editingProductGroupIri) {
          payload.productGroup = editingProductGroupIri;
        } else if (productGroupIri && editingItem?.__feedstockScope !== 'direct') {
          payload.productGroup = productGroupIri;
        }
        await store.actions.save(payload);
      } else {
        payload = {
          product: targetProductIri,
          productChild: `/products/${String(formDraft.productChild).replace(/\D/g, '')}`,
          productType: 'feedstock',
          quantity: nextQty,
          price: nextPrice,
        };
        if (productGroupIri) {
          payload.productGroup = productGroupIri;
        }
        await store.actions.save(payload);
      }
      await reloadItems();
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: targetProductNumericId,
        parentProductId: String(parentProductId || '').replace(/\D/g, ''),
        productGroupId: String(productGroupIri || '').replace(/\D/g, ''),
        source: 'ProductFeedStock.save',
      });
      closeForm();
    } catch (e) {
      const raw =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';
      if (raw.toLowerCase().includes('duplicate') || raw.toLowerCase().includes('unique')) {
        setFormError(`Este insumo já foi adicionado a ${targetLabel}.`);
      } else {
        setFormError(raw || 'Falha ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── Remover ── */
  const handleRemove = async () => {
    if (!confirmDelete) return;
    const id = String(confirmDelete?.id || '').replace(/\D/g, '');
    if (!id) { setConfirmDelete(null); return; }
    setRemoving(true);
    try {
      await store.actions.remove(id);
      await reloadItems();
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: targetProductNumericId,
        parentProductId: String(parentProductId || '').replace(/\D/g, ''),
        productGroupId: String(productGroupIri || '').replace(/\D/g, ''),
        source: 'ProductFeedStock.remove',
      });
    } catch {
      /* silent */
    } finally {
      setRemoving(false);
      setConfirmDelete(null);
    }
  };

  if (!targetProductIri) return null;

  const deleteName =
    confirmDelete?.productChild?.product ||
    confirmDelete?.productChild?.name ||
    'este insumo';

  return (
    <View style={styles.container}>
      {/* Linha separadora + botão expansão */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="flask-outline"
          size={13}
          color="#94A3B8"
          style={inlineStyle_758_10}
        />
        <Text style={styles.toggleLabel}>
          Insumos{expanded && items.length > 0 ? ` (${items.length})` : ''}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={15}
          color="#94A3B8"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.expandedArea}>
          {/* Carregando */}
          {!loaded && (
            <View style={styles.loadingRow}>
              <Text style={styles.loadingText}>Carregando insumos...</Text>
            </View>
          )}

          {/* Vazio */}
          {loaded && items.length === 0 && (
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="flask-empty-outline" size={20} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhum insumo vinculado</Text>
            </View>
          )}

          {/* Cards de insumos */}
          {loaded && items.map((item, idx) => {
            const name =
              item.productChild?.product ||
              item.productChild?.name ||
              String(item.productChild?.id || idx);
            const price = parseFloat(item.price ?? 0).toFixed(2).replace('.', ',');
            const qty = item.quantity ?? 1;
            const unit = extractUnit(item.productChild);
            const scopeLabel = getFeedstockScopeLabel(item);
            return (
              <View key={String(item.id || idx)} style={styles.itemCard}>
                <View style={inlineStyle_798_22}>
                  <ProductReferenceLink
                    product={item.productChild}
                    context="supplies"
                    style={styles.itemReferenceLink}
                    textStyle={styles.itemReferenceText}
                  />
                  <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.itemMeta}>
                    {qty}{unit ? ` ${unit}` : ''} · R$ {price}
                    {scopeLabel ? ` · ${scopeLabel}` : ''}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEdit(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={14} color="#64748B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFF1F1' }]}
                    onPress={() => setConfirmDelete(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Botão adicionar insumo */}
          {loaded && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setSearchVisible(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={14} color="#64748B" />
              <Text style={styles.addBtnText}>Adicionar insumo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Modal: busca de insumo */}
      <FeedStockSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelect={handleProductSelected}
        products={allProducts}
        loading={searchingProducts}
        loadingMore={loadingMoreProducts}
        hasMore={hasMoreProducts}
        onSearch={handleSearchProducts}
        onLoadMore={handleLoadMoreProducts}
        excludeId={targetProductNumericId}
        onQuickRegister={openQuickReg}
      />
      {/* Modal: cadastro rápido de insumo */}
      <QuickRegisterProductModal
        visible={quickRegVisible}
        onClose={() => { setQuickRegVisible(false); setQuickRegError(''); setSearchVisible(true); }}
        onSave={handleQuickRegSave}
        saving={quickRegSaving}
        error={quickRegError}
        brandColors={brandColors}
        units={unitOptions}
      />
      {/* Modal: formulário add/editar */}
      <FeedStockFormModal
        visible={formVisible}
        title={editingItem ? 'Editar insumo' : `Adicionar: ${formDraft?.productName || ''}`}
        draft={formDraft}
        onClose={closeForm}
        onSave={handleSave}
        saving={saving}
        error={formError}
        fieldErrors={fieldErrors}
        onChangeDraft={handleChangeDraft}
        brandColors={brandColors}
      />
      {/* Modal: confirmar exclusão */}
      <AnimatedModal
        visible={!!confirmDelete}
        onRequestClose={() => setConfirmDelete(null)}
        style={inlineStyle_882_8}
      >
        <View style={styles.confirmModal}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={30}
            color="#EF4444"
            style={inlineStyle_889_12}
          />
          <Text style={styles.confirmTitle}>Remover insumo?</Text>
          <Text style={styles.confirmSubtitle}>
            <Text style={inlineStyle_893_18}>{deleteName}</Text> será removido.
            Esta ação não pode ser desfeita.
          </Text>
          <View style={styles.confirmFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDelete(null)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, removing && { opacity: 0.6 }]}
              onPress={handleRemove}
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

export default ProductFeedStock;
