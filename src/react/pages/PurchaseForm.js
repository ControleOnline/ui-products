import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors as baseColors } from '@controleonline/../../src/styles/colors';

/* ─── paginação global ──────────────────────────────────────────────── */

const PAGE_SIZE = 50;

/* ─── helpers ──────────────────────────────────────────────────────── */

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const toIRI   = v => (typeof v === 'string' ? v : v?.['@id'] || null);
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
        <MaterialCommunityIcons name="magnify" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
        <TextInput
          style={supplierStyles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar fornecedor..."
          placeholderTextColor="#CBD5E1"
          autoFocus
        />
        {loading && <ActivityIndicator size="small" color="#94A3B8" style={{ marginLeft: 6 }} />}
        <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }} style={{ marginLeft: 6 }}>
          <MaterialCommunityIcons name="close" size={14} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {suppliers.length > 0 && (
        <View style={supplierStyles.resultList}>
          <ScrollView
            style={{ maxHeight: 200 }}
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
            {loading && <ActivityIndicator size="small" color="#94A3B8" style={{ padding: 8 }} />}
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
        <View style={{ flex: 1 }}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
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

const ProductSearch = ({ inventories, brandColors, onAdd }) => {
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
          <MaterialCommunityIcons name="magnify" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
          <TextInput
            style={searchStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar produto..."
            placeholderTextColor="#CBD5E1"
            autoFocus
          />
          {searching && <ActivityIndicator size="small" color="#94A3B8" style={{ marginLeft: 6 }} />}
          <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); setResults([]); }} style={{ marginLeft: 6 }}>
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
          provider:  `/people/${currentCompany.id}`,
          app:       'StockAdjustment',
        };
        if (statusIRI)          orderPayload.status = statusIRI;
        if (group.supplier?.id) orderPayload.client = `/people/${group.supplier.id}`;

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
        style={{ flex: 1 }}
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
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

          <View style={{ height: 100 }} />
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

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web:     { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
    }),
  },
  header:             { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  productName:        { fontSize: 14, fontWeight: '700', color: '#1E293B', lineHeight: 19 },
  productDescription: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  productType:        { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  fields:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  fieldWrap: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 15, fontWeight: '700', color: '#1E293B', backgroundColor: '#F8FAFC',
  },
  invSection:     { marginTop: 2 },
  invChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  invChipText:    { fontSize: 12, fontWeight: '600', color: '#64748B' },
  invHint:        { fontSize: 11, color: '#F97316', marginTop: 6, fontStyle: 'italic' },
  supplierSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  commentSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  commentInput: {
    marginTop: 6, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1E293B',
    backgroundColor: '#F8FAFC', textAlignVertical: 'top', minHeight: 60,
  },
});

/* ─── estilos SupplierSelector ──────────────────────────────────────── */

const supplierStyles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#FAFAFA', marginTop: 6,
  },
  triggerText: { flex: 1, fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  selectedWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC',
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 6,
  },
  selectedName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#15803D' },
  clearBtn:     { padding: 2 },

  applyAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 5, paddingHorizontal: 4,
  },
  applyAllText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#fff', marginTop: 6,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0 },

  resultList: {
    backgroundColor: '#fff', borderRadius: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    }),
  },
  resultItem:  { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  resultName:  { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  resultAlias: { fontSize: 11, color: '#64748B', marginTop: 1 },

  emptyState: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginTop: 4,
  },
  emptyText: { fontSize: 12, color: '#94A3B8' },
});

/* ─── estilos ProductSearch ─────────────────────────────────────────── */

const searchStyles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#F8FAFC', justifyContent: 'center',
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', padding: 0 },
  resultList: {
    backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    }),
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  resultTextBlock:   { flex: 1, minWidth: 0, marginRight: 8 },
  resultName:        { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  resultDescription: { fontSize: 12, color: '#64748B', marginTop: 2 },
  resultType:        { fontSize: 11, color: '#94A3B8', marginLeft: 8 },
});

/* ─── estilos principal ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web:     { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
    }),
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryLabel:   { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  summaryValue:   { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#F1F5F9' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  footer: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    ...Platform.select({
      web:     { boxShadow: '0 -2px 16px rgba(0,0,0,0.07)' },
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  originCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web:     { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
    }),
  },
  originLabel:       { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  originChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  originChipSelected: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
  originChipText:    { fontSize: 12, fontWeight: '600', color: '#64748B' },
  originHint:        { fontSize: 11, color: '#F97316', marginTop: 6, fontStyle: 'italic' },

  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successTitle:          { fontSize: 24, fontWeight: '800', color: '#16A34A', marginBottom: 8, textAlign: 'center' },
  successSub:            { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32 },
  successBtn:            { width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  successBtnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBtnOutline:     { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  successBtnOutlineText: { fontWeight: '700', fontSize: 15 },
});

export default PurchaseForm;
