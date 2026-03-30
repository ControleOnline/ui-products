import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';

/*
 * ProductFeedStock
 *
 * Exibe e gerencia os insumos (feedstock) de um modificador/componente dentro de um grupo.
 *
 * Estrutura de dados (mesma tabela product_group_product, productType='feedstock'):
 *  product      = IRI do produto COMPONENTE (o productChild do item pai)
 *  productGroup = IRI do grupo
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
    <AnimatedModal visible={visible} onRequestClose={onClose} style={{ justifyContent: 'flex-end' }}>
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
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={{ marginRight: 6 }} />
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
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
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
          style={{ flex: 1 }}
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
                <View style={{ flex: 1 }}>
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
    <AnimatedModal visible={visible} onRequestClose={onClose} style={{ justifyContent: 'flex-end' }}>
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
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={{ marginRight: 6 }} />
              <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
            </View>
          )}

          {!!draft.productName && (
            <View style={styles.productReadonlyWrap}>
              <MaterialCommunityIcons name="package-variant-closed" size={16} color="#64748B" style={{ marginRight: 8 }} />
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
const ProductFeedStock = ({ row, productGroupIri, brandColors }) => {
  const store = useStore('product_group_product');
  const productsStore = useStore('products');
  const peopleStore = useStore('people');
  const productUnitStore = useStore('product_unit');

  const { currentCompany } = peopleStore.getters;

  /* IRI do componente (productChild do item pai) */
  const componentIri =
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
    if (!componentIri || !productGroupIri) { setItems([]); return; }
    try {
      const response = await store.actions.getItems({
        product: componentIri,
        productGroup: productGroupIri,
        productType: 'feedstock',
      });
      setItems(extractItems(response));
    } catch {
      setItems([]);
    }
  }, [componentIri, productGroupIri]);

  useEffect(() => {
    if (!expanded) return;
    setLoaded(false);
    fetchItems().then(() => setLoaded(true));
  }, [expanded, componentIri, productGroupIri]);

  /* IRI numérico do componente para comparação anti-loop */
  const componentNumericId = String(componentIri || '').replace(/\D/g, '');

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
        String(prod?.id || '') !== String(componentNumericId || '') &&
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
    componentNumericId,
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
          product: componentIri,
          productGroup: productGroupIri,
          productChild: toIri(editingItem.productChild, '/products/'),
          productType: 'feedstock',
          quantity: nextQty,
          price: nextPrice,
          active: editingItem.active ?? true,
        };
        await store.actions.save(payload);
      } else {
        payload = {
          product: componentIri,
          productGroup: productGroupIri,
          productChild: `/products/${String(formDraft.productChild).replace(/\D/g, '')}`,
          productType: 'feedstock',
          quantity: nextQty,
          price: nextPrice,
        };
        await store.actions.save(payload);
      }
      await reloadItems();
      closeForm();
    } catch (e) {
      const raw =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';
      if (raw.toLowerCase().includes('duplicate') || raw.toLowerCase().includes('unique')) {
        setFormError('Este insumo já foi adicionado a este componente.');
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
    } catch {
      /* silent */
    } finally {
      setRemoving(false);
      setConfirmDelete(null);
    }
  };

  /* ── sem componente IRI → não mostrar nada ── */
  if (!componentIri) return null;

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
          style={{ marginRight: 5 }}
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
            return (
              <View key={String(item.id || idx)} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.itemMeta}>
                    {qty}{unit ? ` ${unit}` : ''} · R$ {price}
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
        excludeId={componentNumericId}
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
        style={{ justifyContent: 'flex-end' }}
      >
        <View style={styles.confirmModal}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={30}
            color="#EF4444"
            style={{ alignSelf: 'center', marginBottom: 8 }}
          />
          <Text style={styles.confirmTitle}>Remover insumo?</Text>
          <Text style={styles.confirmSubtitle}>
            <Text style={{ fontWeight: '700' }}>{deleteName}</Text> será removido.
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

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  /* ─── toggle ─── */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ─── área expandida ─── */
  expandedArea: {
    paddingTop: 8,
  },
  loadingRow: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadingText: { fontSize: 12, color: '#94A3B8' },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  emptyText: { fontSize: 12, color: '#CBD5E1' },

  /* ─── card de insumo ─── */
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── botão adicionar ─── */
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  /* ─── modal busca ─── */
  searchModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  searchEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  searchEmptyText: { fontSize: 14, color: '#94A3B8' },
  searchMoreFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  searchMoreText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchResultType: { fontSize: 12, color: '#94A3B8' },
  quickRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  quickRegBtnText: { fontSize: 13, fontWeight: '700', color: '#3B82F6' },
  unitChipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  unitChip: {
    borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff',
  },
  unitChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  unitChipEmpty: { fontSize: 12, color: '#94A3B8', paddingVertical: 8 },
  searchFooterRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },

  /* ─── modal formulário ─── */
  formModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  formClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBody: { padding: 24 },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  /* ─── produto readonly ─── */
  productReadonlyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  productReadonlyText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },

  /* ─── quantidade + unidade ─── */
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  unitInline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    paddingLeft: 6,
  },

  /* ─── fields ─── */
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  required: { color: '#EF4444', fontSize: 11 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  /* ─── erro ─── */
  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: { color: '#9e1b1b', fontSize: 14 },

  /* ─── botões ─── */
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* ─── confirmar exclusão ─── */
  confirmModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmFooter: { flexDirection: 'row', gap: 12 },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ProductFeedStock;
