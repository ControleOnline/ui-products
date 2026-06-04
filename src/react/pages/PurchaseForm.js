import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors as baseColors } from '@controleonline/../../src/styles/colors';
import { rowStyles, supplierStyles, searchStyles, styles } from './PurchaseForm.styles'

import {
  inlineStyle_158_73,
  inlineStyle_167_68,
  inlineStyle_168_76,
  inlineStyle_176_12,
  inlineStyle_196_72,
  inlineStyle_221_14,
  inlineStyle_266_70,
  inlineStyle_267_16,
  inlineStyle_408_75,
  inlineStyle_417_72,
  inlineStyle_418_94,
  inlineStyle_704_8,
  inlineStyle_743_76,
  inlineStyle_744_22,
  inlineStyle_795_16,
} from './PurchaseForm.styles';

/* ─── paginação global ──────────────────────────────────────────────── */

const PAGE_SIZE = 50;

/* ─── helpers ──────────────────────────────────────────────────────── */

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const getCompanyId = value => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const m = value.match(/\/people\/(\d+)(?:\?.*)?$/);
    if (m?.[1]) return parseInt(m[1], 10);
    const digits = value.replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : null;
  }
  if (typeof value === 'object') {
    if (value.id) return getCompanyId(value.id);
    if (value['@id']) return getCompanyId(value['@id']);
  }
  return null;
};

const getProductCompanyId = product => (
  getCompanyId(
    product?.company ?? product?.people ?? product?.person
    ?? product?.provider ?? product?.owner ?? null
  )
);

let _orderStatusIRI = null;

const fetchOrderStatus = async statusStore => {
  if (_orderStatusIRI) return _orderStatusIRI;
  const data = await statusStore.actions.getItems({ context: 'order', realStatus: 'pending' }).catch(() => []);
  const s = (data || [])[0];
  if (s?.id) { _orderStatusIRI = `/statuses/${s.id}`; return _orderStatusIRI; }
  return null;
};

let _uid = 0;
const uid = () => String(++_uid);

/* ═══════════════════════════════════════════════════════════════════════
   SupplierSelector
   ═══════════════════════════════════════════════════════════════════════ */

const SupplierSelector = ({ brandColors, value, onSelect, showApplyToAll, onApplyToAll }) => {
  const peopleStore        = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(false);
  const reqRef = useRef(0);

  const fetchSuppliers = useCallback(async (q, p) => {
    const companyId = currentCompany?.id;
    if (!companyId) return;
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const params = {
        'link.company':  `/people/${companyId}`,
        'link.linkType': 'provider',
        itemsPerPage:    PAGE_SIZE,
        page:            p,
      };
      if (q.trim()) params.name = q.trim();
      const data = await peopleStore.actions.getItems(params).catch(() => []);
      if (reqId !== reqRef.current) return;
      const items = Array.isArray(data) ? data : [];
      setSuppliers(prev => p === 1 ? items : [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [currentCompany?.id, peopleStore.actions]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { setPage(1); fetchSuppliers(query, 1); }, 300);
    return () => clearTimeout(t);
  }, [query, open, fetchSuppliers]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchSuppliers(query, next);
  }, [loading, hasMore, page, query, fetchSuppliers]);

  const select = useCallback(s => {
    onSelect({ id: s.id, name: s.alias || s.name });
    setOpen(false);
    setQuery('');
  }, [onSelect]);

  const clear = useCallback(() => onSelect(null), [onSelect]);

  /* selecionado */
  if (value) {
    return (
      <View>
        <View style={supplierStyles.selectedWrap}>
          <MaterialCommunityIcons name="truck-outline" size={14} color="#15803D" />
          <Text style={supplierStyles.selectedName} numberOfLines={1}>{value.name}</Text>
          <TouchableOpacity onPress={clear} style={supplierStyles.clearBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="close-circle" size={15} color="#86EFAC" />
          </TouchableOpacity>
        </View>
        {showApplyToAll && (
          <TouchableOpacity style={supplierStyles.applyAllBtn} onPress={onApplyToAll} activeOpacity={0.75}>
            <MaterialCommunityIcons name="arrow-collapse-down" size={12} color="#2563EB" />
            <Text style={supplierStyles.applyAllText}>Usar "{value.name}" para todos os produtos</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  /* fechado */
  if (!open) {
    return (
      <TouchableOpacity
        style={[supplierStyles.triggerBtn, { borderColor: brandColors.primary + '44' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="truck-outline" size={13} color="#94A3B8" />
        <Text style={supplierStyles.triggerText}>Definir fornecedor</Text>
        <MaterialCommunityIcons name="chevron-down" size={14} color="#CBD5E1" />
      </TouchableOpacity>
    );
  }

  /* aberto */
  return (
    <View>
      <View style={[supplierStyles.searchBox, { borderColor: brandColors.primary }]}>
        <MaterialCommunityIcons name="magnify" size={14} color="#94A3B8" style={inlineStyle_158_73} />
        <TextInput
          style={supplierStyles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar fornecedor..."
          placeholderTextColor="#CBD5E1"
          autoFocus
        />
        {loading && <ActivityIndicator size="small" color="#94A3B8" style={inlineStyle_167_68} />}
        <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }} style={inlineStyle_168_76}>
          <MaterialCommunityIcons name="close" size={14} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      {suppliers.length > 0 && (
        <View style={supplierStyles.resultList}>
          <ScrollView
            style={inlineStyle_176_12}
            keyboardShouldPersistTaps="handled"
            onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) loadMore();
            }}
            scrollEventThrottle={200}
          >
            {suppliers.map(s => (
              <TouchableOpacity
                key={s.id}
                style={supplierStyles.resultItem}
                onPress={() => select(s)}
                activeOpacity={0.75}
              >
                <Text style={supplierStyles.resultName}>{s.alias || s.name}</Text>
                {s.alias && s.name !== s.alias && (
                  <Text style={supplierStyles.resultAlias} numberOfLines={1}>{s.name}</Text>
                )}
              </TouchableOpacity>
            ))}
            {loading && <ActivityIndicator size="small" color="#94A3B8" style={inlineStyle_196_72} />}
          </ScrollView>
        </View>
      )}
      {!loading && suppliers.length === 0 && (
        <View style={supplierStyles.emptyState}>
          <MaterialCommunityIcons name="truck-off-outline" size={18} color="#CBD5E1" />
          <Text style={supplierStyles.emptyText}>Nenhum fornecedor encontrado</Text>
        </View>
      )}
    </View>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   ProductRow
   ═══════════════════════════════════════════════════════════════════════ */

const ProductRow = ({ item, inventories, brandColors, onChange, onRemove, showApplyToAll, onApplyToAll, mode }) => {
  const isTransfer = mode === 'transfer';
  return (
    <View style={rowStyles.card}>
      {/* cabeçalho */}
      <View style={rowStyles.header}>
        <View style={inlineStyle_221_14}>
          <Text style={rowStyles.productName} numberOfLines={2}>{item.productName || `Produto #${item.productId}`}</Text>
          {item.productDescription ? (
            <Text style={rowStyles.productDescription} numberOfLines={2}>{item.productDescription}</Text>
          ) : null}
          {item.productType ? <Text style={rowStyles.productType}>{item.productType}</Text> : null}
        </View>
        <TouchableOpacity onPress={onRemove} style={rowStyles.removeBtn} activeOpacity={0.75}>
          <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      {/* quantidade (+ preço só em compra) */}
      <View style={rowStyles.fields}>
        <View style={rowStyles.fieldWrap}>
          <Text style={rowStyles.fieldLabel}>Quantidade *</Text>
          <TextInput
            style={[rowStyles.input, { borderColor: isTransfer ? '#7C3AED66' : brandColors.primary + '66' }]}
            value={String(item.qty)}
            onChangeText={v => onChange({ qty: v })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#CBD5E1"
            selectTextOnFocus
          />
        </View>
        {!isTransfer && (
          <View style={rowStyles.fieldWrap}>
            <Text style={rowStyles.fieldLabel}>Preço Unit. (R$)</Text>
            <TextInput
              style={[rowStyles.input, { borderColor: '#E2E8F0' }]}
              value={String(item.price)}
              onChangeText={v => onChange({ price: v })}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#CBD5E1"
              selectTextOnFocus
            />
          </View>
        )}
      </View>
      {/* local de entrada / destino */}
      <View style={rowStyles.invSection}>
        <Text style={rowStyles.fieldLabel}>{isTransfer ? 'Local de Destino *' : 'Local de Entrada'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={inlineStyle_266_70}>
          <View style={inlineStyle_267_16}>
            {inventories.map(inv => {
              const sel = String(item.inInventoryId) === String(inv.id);
              const selColor = isTransfer ? '#7C3AED' : brandColors.primary;
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[rowStyles.invChip, sel && { backgroundColor: selColor + '18', borderColor: selColor }]}
                  onPress={() => onChange({ inInventoryId: inv.id, inInventoryName: inv.inventory })}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="warehouse" size={12} color={sel ? selColor : '#94A3B8'} />
                  <Text style={[rowStyles.invChipText, sel && { color: selColor, fontWeight: '700' }]}>
                    {inv.inventory}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        {!item.inInventoryId && (
          <Text style={rowStyles.invHint}>
            {isTransfer ? 'Selecione o destino da transferência' : 'Selecione onde este produto será recebido'}
          </Text>
        )}
      </View>
      {/* observação (apenas transferência) */}
      {isTransfer && (
        <View style={rowStyles.commentSection}>
          <Text style={rowStyles.fieldLabel}>Observação (opcional)</Text>
          <TextInput
            style={rowStyles.commentInput}
            value={item.comment || ''}
            onChangeText={v => onChange({ comment: v })}
            placeholder="Motivo da transferência..."
            placeholderTextColor="#CBD5E1"
            multiline
            numberOfLines={2}
          />
        </View>
      )}
      {/* fornecedor (apenas compra) */}
      {!isTransfer && (
        <View style={rowStyles.supplierSection}>
          <Text style={rowStyles.fieldLabel}>Fornecedor *</Text>
          <SupplierSelector
            brandColors={brandColors}
            value={item.supplier || null}
            onSelect={supplier => onChange({ supplier })}
            showApplyToAll={showApplyToAll}
            onApplyToAll={onApplyToAll}
          />
        </View>
      )}
    </View>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   ProductSearch
   ═══════════════════════════════════════════════════════════════════════ */

const ProductSearch = ({ inventories: _inventories, brandColors, onAdd }) => {
  const productsStore      = useStore('products');
  const peopleStore        = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [searching, setSearching] = useState(false);
  const [open,     setOpen]     = useState(false);
  const searchRef = useRef(0);

  const search = useCallback(async text => {
    const companyId = currentCompany?.id;
    if (!companyId || !text || text.length < 2) { setResults([]); return; }
    const reqId = ++searchRef.current;
    setSearching(true);
    try {
      const data = await productsStore.actions.getItems({
        product: text, company: companyId,
        people: `/people/${companyId}`, active: 1,
        'order[product]': 'ASC', itemsPerPage: PAGE_SIZE,
      }).catch(() => []);
      if (reqId !== searchRef.current) return;

      const safeResults = [];
      for (const item of (Array.isArray(data) ? data : [])) {
        let product = item;
        let cId = getProductCompanyId(product);
        if (!cId && product?.id) {
          const d = await productsStore.actions.get(product.id).catch(() => null);
          if (reqId !== searchRef.current) return;
          if (d) { product = d; cId = getProductCompanyId(d); }
        }
        if (String(cId) === String(companyId)) safeResults.push(product);
      }
      if (reqId !== searchRef.current) return;
      setResults(safeResults);
    } finally {
      if (reqId === searchRef.current) setSearching(false);
    }
  }, [currentCompany?.id, productsStore.actions]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  const pick = prod => {
    onAdd({
      _key:               uid(),
      productId:          prod.id,
      productName:        prod.product || `#${prod.id}`,
      productDescription: String(prod.description || '').trim() || null,
      productType:        prod.type || null,
      qty:                '1',
      price:              '',
      inInventoryId:      null,
      inInventoryName:    null,
      supplier:           null,
      comment:            '',
    });
    setQuery(''); setResults([]); setOpen(false);
  };

  return (
    <View style={searchStyles.wrap}>
      {!open ? (
        <TouchableOpacity
          style={[searchStyles.addBtn, { borderColor: brandColors.primary + '55' }]}
          onPress={() => setOpen(true)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color={brandColors.primary} />
          <Text style={[searchStyles.addBtnText, { color: brandColors.primary }]}>Adicionar produto</Text>
        </TouchableOpacity>
      ) : (
        <View style={searchStyles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={16} color="#94A3B8" style={inlineStyle_408_75} />
          <TextInput
            style={searchStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar produto..."
            placeholderTextColor="#CBD5E1"
            autoFocus
          />
          {searching && <ActivityIndicator size="small" color="#94A3B8" style={inlineStyle_417_72} />}
          <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); setResults([]); }} style={inlineStyle_418_94}>
            <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}
      {results.length > 0 && open && (
        <View style={searchStyles.resultList}>
          {results.map(prod => (
            <TouchableOpacity key={prod.id} style={searchStyles.resultItem} onPress={() => pick(prod)} activeOpacity={0.75}>
              <View style={searchStyles.resultTextBlock}>
                <Text style={searchStyles.resultName}>{prod.product || `#${prod.id}`}</Text>
                <Text style={searchStyles.resultDescription} numberOfLines={1}>
                  {String(prod.description || '').trim() || 'Sem descrição'}
                </Text>
              </View>
              {prod.type ? <Text style={searchStyles.resultType}>{prod.type}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   Tela Principal
   ═══════════════════════════════════════════════════════════════════════ */

const PurchaseForm = () => {
  const navigation = useNavigation();
  const route      = useRoute();

  const mode       = route.params?.mode || 'purchase';
  const isTransfer = mode === 'transfer';

  const peopleStore       = useStore('people');
  const themeStore        = useStore('theme');
  const ordersStore       = useStore('orders');
  const orderProductStore = useStore('order_products');
  const inventoriesStore  = useStore('inventories');
  const statusStore       = useStore('status');

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, baseColors),
    [themeColors, currentCompany?.id],
  );

  const [inventories,     setInventories]     = useState([]);
  const [items,           setItems]           = useState([]);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [done,            setDone]            = useState(false);
  const [ordersCreated,   setOrdersCreated]   = useState(0);
  /* transferência — origem global */
  const [outInventoryId,   setOutInventoryId]   = useState(null);
  const [outInventoryName, setOutInventoryName] = useState(null);

  /* inventários — paginado */
  useFocusEffect(useCallback(() => {
    if (!currentCompany?.id) return;
    inventoriesStore.actions.getItems({
      people: `/people/${currentCompany.id}`,
      itemsPerPage: PAGE_SIZE,
    }).then(data => setInventories(data || [])).catch(() => {});
  }, [currentCompany?.id]));

  /* pré-preenche com itens de navegação */
  useEffect(() => {
    const preItems   = route.params?.items;
    const preOutId   = route.params?.outInventoryId;
    const preOutName = route.params?.outInventoryName;
    if (preOutId)   setOutInventoryId(String(preOutId));
    if (preOutName) setOutInventoryName(preOutName);
    if (preItems?.length) {
      setItems(preItems.map(p => ({
        _key:               uid(),
        productId:          p.productId,
        productName:        p.productName   || `#${p.productId}`,
        productDescription: String(p.productDescription || p.description || '').trim() || null,
        productType:        p.productType   || null,
        qty:                String(p.suggestedQty || 1),
        price:              '',
        inInventoryId:      isTransfer ? null : (p.inInventoryId || null),
        inInventoryName:    isTransfer ? null : (p.inInventoryName || null),
        supplier:           null,
        comment:            '',
      })));
    }
  }, [route.params?.items]);

  const updateItem = (key, patch) =>
    setItems(prev => prev.map(it => it._key === key ? { ...it, ...patch } : it));

  const removeItem = key =>
    setItems(prev => prev.filter(it => it._key !== key));

  const addItem = item => setItems(prev => [...prev, item]);

  /* aplica fornecedor de um item em todos */
  const applySupplierToAll = useCallback(supplier => {
    setItems(prev => prev.map(it => ({ ...it, supplier })));
  }, []);

  /* validação */
  const validate = () => {
    if (items.length === 0) return 'Adicione ao menos um produto.';
    if (isTransfer && !outInventoryId) return 'Selecione o local de origem.';
    for (const it of items) {
      const q = parseFloat(String(it.qty).replace(',', '.'));
      if (!q || q <= 0) return `Quantidade inválida para "${it.productName}".`;
      if (!it.inInventoryId) return `Selecione o local de ${isTransfer ? 'destino' : 'entrada'} para "${it.productName}".`;
      if (isTransfer && String(it.inInventoryId) === String(outInventoryId))
        return `Origem e destino não podem ser iguais para "${it.productName}".`;
      if (!isTransfer && !it.supplier?.id) return `Selecione o fornecedor para "${it.productName}".`;
    }
    return null;
  };

  /* confirmação */
  const confirm = async () => {
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSaving(true);
    setError('');
    try {
      const statusIRI = await fetchOrderStatus(statusStore);

      /* ── transferência ── */
      if (isTransfer) {
        const outIRI = `/inventories/${outInventoryId}`;
        const order  = await ordersStore.actions.save({
          orderType: 'transfer',
          provider:  `/people/${currentCompany.id}`,
          app:       'StockAdjustment',
          ...(statusIRI ? { status: statusIRI } : {}),
        });

        for (const it of items) {
          const qty     = parseFloat(String(it.qty).replace(',', '.'));
          const inIRI   = `/inventories/${it.inInventoryId}`;
          const prodIRI = `/products/${it.productId}`;

          const opPayload = {
            order:        `/orders/${order.id}`,
            product:      prodIRI,
            quantity:     qty,
            outInventory: outIRI,
            inInventory:  inIRI,
          };
          if (it.comment?.trim()) opPayload.comments = it.comment.trim();
          await orderProductStore.actions.save(opPayload);
        }

        setOrdersCreated(1);
        setDone(true);
        return;
      }

      /* ── compra — agrupa por fornecedor, 1 pedido por grupo, itens 1 a 1 ── */
      const groups = new Map();
      for (const it of items) {
        const key = it.supplier?.id ? String(it.supplier.id) : '__none__';
        if (!groups.has(key)) groups.set(key, { supplier: it.supplier || null, items: [] });
        groups.get(key).items.push(it);
      }

      let created = 0;

      for (const [, group] of groups) {
        const orderPayload = {
          orderType: 'purchase',
          client:     `/people/${currentCompany.id}`,
          app:       'StockAdjustment',
        };
        if (statusIRI)          orderPayload.status = statusIRI;
        if (group.supplier?.id) orderPayload.provider = `/people/${group.supplier.id}`;

        const order = await ordersStore.actions.save(orderPayload);

        for (const it of group.items) {
          const qty     = parseFloat(String(it.qty).replace(',', '.'));
          const invIRI  = `/inventories/${it.inInventoryId}`;
          const prodIRI = `/products/${it.productId}`;

          const opPayload = { order: `/orders/${order.id}`, product: prodIRI, quantity: qty, inInventory: invIRI };
          if (it.price) {
            const p = parseFloat(String(it.price).replace(',', '.'));
            if (p > 0) opPayload.unitPrice = p;
          }
          await orderProductStore.actions.save(opPayload);
        }

        created++;
      }

      setOrdersCreated(created);
      setDone(true);
    } catch (e) {
      setError(e?.response?.data?.['hydra:description'] || e?.message || `Erro ao ${isTransfer ? 'registrar transferência' : 'registrar compra'}.`);
    } finally {
      setSaving(false);
    }
  };

  /* tela de sucesso */
  if (done) {
    if (isTransfer) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.successWrap}>
            <View style={[styles.successIcon, { backgroundColor: '#F5F3FF' }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color="#7C3AED" />
            </View>
            <Text style={[styles.successTitle, { color: '#7C3AED' }]}>Transferência realizada!</Text>
            <Text style={styles.successSub}>
              {items.length} {items.length === 1 ? 'produto transferido' : 'produtos transferidos'}
              {outInventoryName ? ` de ${outInventoryName}` : ''} para{' '}
              {[...new Set(items.map(it => it.inInventoryName).filter(Boolean))].join(', ') || 'o destino selecionado'}.
            </Text>
            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: '#7C3AED' }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.successBtnText}>Concluir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successBtnOutline}
              onPress={() => { setDone(false); setItems([]); setOrdersCreated(0); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.successBtnOutlineText, { color: '#7C3AED' }]}>Nova transferência</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    const supplierNames = [...new Set(items.map(it => it.supplier?.name).filter(Boolean))];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check-circle-outline" size={64} color="#16A34A" />
          </View>
          <Text style={styles.successTitle}>Compra registrada!</Text>
          <Text style={styles.successSub}>
            {items.length} {items.length === 1 ? 'produto adicionado' : 'produtos adicionados'} ao estoque
            {ordersCreated > 1 ? ` em ${ordersCreated} pedidos` : ''}
            {supplierNames.length > 0 ? ` via ${supplierNames.join(', ')}` : ''}.
          </Text>
          <TouchableOpacity
            style={[styles.successBtn, { backgroundColor: brandColors.primary }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.successBtnText}>Concluir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.successBtnOutline}
            onPress={() => { setDone(false); setItems([]); setOrdersCreated(0); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.successBtnOutlineText, { color: brandColors.primary }]}>Nova compra</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalItems = items.length;
  const totalQty   = items.reduce((s, it) => s + (parseFloat(String(it.qty).replace(',', '.')) || 0), 0);
  const totalValue = items.reduce((s, it) => {
    const q = parseFloat(String(it.qty).replace(',', '.'))   || 0;
    const p = parseFloat(String(it.price).replace(',', '.')) || 0;
    return s + q * p;
  }, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={inlineStyle_704_8}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* resumo */}
          {totalItems > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Produtos</Text>
                <Text style={styles.summaryValue}>{totalItems}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Qtd. Total</Text>
                <Text style={styles.summaryValue}>{fmtN(totalQty)}</Text>
              </View>
              {totalValue > 0 && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Valor Total</Text>
                    <Text style={[styles.summaryValue, { color: brandColors.primary }]}>
                      {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* origem (transferência) */}
          {isTransfer && (
            <View style={styles.originCard}>
              <Text style={styles.originLabel}>Local de Origem *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={inlineStyle_743_76}>
                <View style={inlineStyle_744_22}>
                  {inventories.map(inv => {
                    const sel = String(inv.id) === String(outInventoryId);
                    return (
                      <TouchableOpacity
                        key={inv.id}
                        style={[styles.originChip, sel && styles.originChipSelected]}
                        onPress={() => { setOutInventoryId(String(inv.id)); setOutInventoryName(inv.inventory); }}
                        activeOpacity={0.75}
                      >
                        <MaterialCommunityIcons name="warehouse" size={12} color={sel ? '#7C3AED' : '#94A3B8'} />
                        <Text style={[styles.originChipText, sel && { color: '#7C3AED', fontWeight: '700' }]}>
                          {inv.inventory}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              {!outInventoryId && (
                <Text style={styles.originHint}>Selecione de onde os produtos serão transferidos</Text>
              )}
            </View>
          )}

          {/* lista de produtos */}
          {items.map(it => (
            <ProductRow
              key={it._key}
              item={it}
              inventories={inventories}
              brandColors={brandColors}
              onChange={patch => updateItem(it._key, patch)}
              onRemove={() => removeItem(it._key)}
              showApplyToAll={totalItems > 1 && !!it.supplier}
              onApplyToAll={() => applySupplierToAll(it.supplier)}
              mode={mode}
            />
          ))}

          {/* busca / adicionar */}
          <ProductSearch inventories={inventories} brandColors={brandColors} onAdd={addItem} />

          {/* erro */}
          {!!error && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={inlineStyle_795_16} />
        </ScrollView>

        {/* rodapé */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, {
              backgroundColor:
                items.length === 0 || (isTransfer && !outInventoryId)
                  ? '#CBD5E1'
                  : isTransfer ? '#7C3AED' : brandColors.primary,
            }]}
            onPress={confirm}
            disabled={saving || items.length === 0}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={isTransfer ? 'swap-horizontal-circle' : 'cart-check'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.confirmBtnText}>
                  {items.length === 0
                    ? 'Adicione produtos'
                    : isTransfer
                      ? `Transferir (${totalItems})`
                      : `Confirmar Compra (${totalItems})`
                  }
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ─── estilos ProductRow ────────────────────────────────────────────── */

/* ─── estilos SupplierSelector ──────────────────────────────────────── */

/* ─── estilos ProductSearch ─────────────────────────────────────────── */

/* ─── estilos principal ─────────────────────────────────────────────── */

export default PurchaseForm;
