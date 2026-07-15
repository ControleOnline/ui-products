import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { skeletonStyles, styles, movStyles, editStyles } from './InventoryDetail.styles'

import {
  inlineStyle_68_10,
  inlineStyle_238_68,
  inlineStyle_241_16,
  inlineStyle_250_56,
  inlineStyle_400_62,
  inlineStyle_403_16,
  inlineStyle_413_56,
  inlineStyle_515_12,
  inlineStyle_644_14,
  inlineStyle_661_75,
  inlineStyle_670_60,
  inlineStyle_681_14,
  inlineStyle_816_85,
} from './InventoryDetail.styles';

/* ─── helpers ──────────────────────────────────────────────────────── */

const INV_TYPE_CONFIG = {
  default:   { label: 'Padrão',   icon: 'home-outline', color: '#3B82F6', bg: '#EFF6FF' },
  warehouse: { label: 'Depósito', icon: 'warehouse',     color: '#D97706', bg: '#FFFBEB' },
};

const PRODUCT_TYPE_CONFIG = {
  product:      { label: 'Produto',       color: '#3B82F6', bg: '#EFF6FF' },
  service:      { label: 'Serviço',       color: '#8B5CF6', bg: '#F5F3FF' },
  component:    { label: 'Componente',    color: '#F97316', bg: '#FFF7ED' },
  feedstock:    { label: 'Matéria Prima', color: '#16A34A', bg: '#F0FDF4' },
  package:      { label: 'Embalagem',     color: '#0891B2', bg: '#ECFEFF' },
  custom:       { label: 'Custom',        color: '#DB2777', bg: '#FDF2F8' },
  manufactured: { label: 'Fabricado',     color: '#D97706', bg: '#FFFBEB' },
  recipe:       { label: 'Preparo',       color: '#6B7280', bg: '#F3F4F6' },
};

const MOVEMENT_OPS = [
  { key: 'in',       label: 'Compra',        icon: 'cart-arrow-down',       color: '#16A34A', bg: '#F0FDF4' },
  { key: 'out',      label: 'Perda',         icon: 'alert-circle-outline',  color: '#DC2626', bg: '#FEF2F2' },
  { key: 'transfer', label: 'Transferência', icon: 'swap-horizontal-circle', color: '#7C3AED', bg: '#F5F3FF' },
];

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

/* extrai id/nome/tipo/sku/descricao do campo product (IRI ou objeto) */
const extractProduct = p => {
  if (!p) return { id: null, name: null, type: null, sku: null, description: null };
  if (typeof p === 'object') {
    return {
      id:          p.id          || null,
      name:        p.product     || null,
      type:        p.type        || null,
      sku:         p.sku         || null,
      description: p.description || null,
    };
  }
  return { id: String(p).replace(/\D/g, '') || null, name: null, type: null, sku: null, description: null };
};

const iriToId = iri => {
  if (!iri) return null;
  const s = String(iri);
  const match = s.match(/\/(\d+)(?:\?.*)?$/);
  if (match?.[1]) return match[1];
  const digits = s.replace(/\D/g, '');
  return digits || null;
};

/* ─── Skeleton ──────────────────────────────────────────────────────── */

const SkeletonRow = () => (
  <View style={skeletonStyles.row}>
    <View style={inlineStyle_68_10}>
      <View style={[skeletonStyles.line, { width: '60%', height: 13 }]} />
      <View style={[skeletonStyles.line, { width: '35%', height: 10 }]} />
    </View>
    <View style={[skeletonStyles.line, { width: 52, height: 40 }]} />
  </View>
);

/* cache de status de order para evitar query repetida */
let _orderStatusIRI = null;

const fetchOrderStatus = async statusStore => {
  if (_orderStatusIRI) return _orderStatusIRI;
  const data = await statusStore.actions.getItems({ context: 'order', realStatus: 'pending' }).catch(() => []);
  const s = (data || [])[0];
  if (s?.id) { _orderStatusIRI = `/statuses/${s.id}`; return _orderStatusIRI; }
  return null;
};

/* ═══════════════════════════════════════════════════════════════════════
   Modal de Movimentação — definido fora para estabilidade de referência
   ═══════════════════════════════════════════════════════════════════════ */

export const MovementModal = ({
  visible,
  row,
  inventories: _inventories,
  brandColors: _brandColors,
  productInvStore,
  currentInventory,
  onClose,
  onMoved,
  onOpenPurchase,
  onOpenTransfer,
}) => {
  const ordersStore       = useStore('orders');
  const orderProductStore = useStore('order_products');
  const statusStore       = useStore('status');
  const peopleStore       = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const [op, setOp]         = useState('in');
  const [qty, setQty]       = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const resetAndClose = () => {
    setOp('in'); setQty(''); setError(''); setSaving(false);
    onClose();
  };

  const productName = row ? (extractProduct(row.product).name || `#${row.id}`) : '';

  const openPurchaseForm = () => {
    const { id: prodId, name: prodName, type: prodType } = extractProduct(row?.product);
    const invId = row?._inventoryIRI
      ? String(iriToId(row._inventoryIRI))
      : currentInventory?.id ? String(currentInventory.id) : null;
    const invName = currentInventory?.inventory || `Local #${invId}`;
    const currentAvailable = parseFloat(row?.available ?? 0);
    const currentMinimum = parseFloat(row?.minimum ?? 0);
    const suggestedQty = Math.max(
      1,
      Math.ceil(
        currentMinimum > currentAvailable
          ? (currentMinimum - currentAvailable)
          : 1,
      ),
    );

    const params = {
      items: [{
        piId: row?.id || null,
        productId: prodId ? String(prodId) : null,
        productName: prodName || `Produto #${prodId}`,
        productType: prodType || null,
        suggestedQty,
        inInventoryId: invId,
        inInventoryName: invName,
      }],
    };

    if (!onOpenPurchase || !onOpenPurchase(params)) {
      setError('Não foi possível abrir a tela de compras.');
      return;
    }
    resetAndClose();
  };

  const openTransferForm = () => {
    const { id: prodId, name: prodName, type: prodType } = extractProduct(row?.product);
    const invId = row?._inventoryIRI
      ? String(iriToId(row._inventoryIRI))
      : currentInventory?.id ? String(currentInventory.id) : null;
    const invName = currentInventory?.inventory || `Local #${invId}`;

    const params = {
      mode: 'transfer',
      outInventoryId:   invId,
      outInventoryName: invName,
      items: [{
        piId:        row?.id || null,
        productId:   prodId ? String(prodId) : null,
        productName: prodName || `Produto #${prodId}`,
        productType: prodType || null,
        suggestedQty: 1,
      }],
    };

    if (!onOpenTransfer || !onOpenTransfer(params)) {
      setError('Não foi possível abrir a tela de transferências.');
      return;
    }
    resetAndClose();
  };

  /* cria order + order_product para registrar a movimentação no backend */
  const createOrderRecord = async (orderType, prodId, opInvIRI, opOutInvIRI) => {
    const statusIRI = await fetchOrderStatus(statusStore);
    const orderPayloadBase = {
      orderType,
      provider: `/people/${currentCompany.id}`,
      app: 'StockAdjustment',
    };
    if (statusIRI) orderPayloadBase.status = statusIRI;
    const order = await ordersStore.actions.save(orderPayloadBase);
    const opPayload = {
      order:    `/orders/${order.id}`,
      product:  `/products/${prodId}`,
      quantity: parseFloat(String(qty).replace(',', '.')),
    };
    if (opInvIRI)    opPayload.inInventory  = opInvIRI;
    if (opOutInvIRI) opPayload.outInventory = opOutInvIRI;
    await orderProductStore.actions.save(opPayload);
  };

  const confirm = async () => {
    if (op === 'in') {
      openPurchaseForm();
      return;
    }
    if (op === 'transfer') {
      openTransferForm();
      return;
    }
    const amount = parseFloat(String(qty).replace(',', '.'));
    if (!amount || amount <= 0) { setError('Informe uma quantidade válida'); return; }

    setSaving(true);
    setError('');
    try {
      const curAvail = parseFloat(row?.available ?? 0);
      const { id: prodId } = extractProduct(row.product);
      const invIRI = row._inventoryIRI || (currentInventory?.id ? `/inventories/${currentInventory.id}` : null);

      /* Saída (Perda): diminui disponível + registra */
      if (row.id) {
        await productInvStore.actions.save({ id: row.id, available: Math.max(0, curAvail - amount) });
      }
      await createOrderRecord('loss', prodId, null, invIRI);
      onMoved({ rowId: row.id, delta: -amount, op });

      resetAndClose();
    } catch (e) {
      setError(e?.response?.data?.['hydra:description'] || e?.message || 'Erro na movimentação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedModal visible={visible} onRequestClose={resetAndClose} style={inlineStyle_238_68}>
      <View style={movStyles.container}>
        <View style={movStyles.header}>
          <View style={inlineStyle_241_16}>
            <Text style={movStyles.title}>Movimentação</Text>
            <Text style={movStyles.subtitle} numberOfLines={1}>{productName}</Text>
          </View>
          <TouchableOpacity onPress={resetAndClose} style={movStyles.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" style={inlineStyle_250_56}>
          <View style={movStyles.body}>
            {!!error && (
              <View style={movStyles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={movStyles.errorText}>{error}</Text>
              </View>
            )}

            {/* Saldo atual */}
            <View style={movStyles.balanceRow}>
              <Text style={movStyles.balanceLabel}>Saldo atual</Text>
              <Text style={movStyles.balanceValue}>{fmtN(row?.available)}</Text>
            </View>

            {/* Tipo de operação */}
            <View style={movStyles.opsRow}>
              {MOVEMENT_OPS.map(opt => {
                const active = op === opt.key;
                const handleOpPress = () => {
                  setOp(opt.key);
                  setError('');
                };
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[movStyles.opChip, active && { backgroundColor: opt.bg, borderColor: opt.color }]}
                    onPress={handleOpPress}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={18}
                      color={active ? opt.color : '#94A3B8'}
                    />
                    <Text style={[movStyles.opLabel, active && { color: opt.color }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantidade (somente para Perda; Compra e Transferência redirecionam para outras telas) */}
            {op === 'out' && (
            <View style={movStyles.field}>
              <Text style={movStyles.fieldLabel}>Quantidade</Text>
              <TextInput
                style={[movStyles.qtyInput, { borderColor: '#DC2626', color: '#DC2626' }]}
                value={qty}
                onChangeText={v => { setQty(v); setError(''); }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                selectTextOnFocus
              />
            </View>
            )}

            {/* Info transferência */}
            {op === 'transfer' && (
              <View style={movStyles.previewBox}>
                <MaterialCommunityIcons name="information-outline" size={14} color="#7C3AED" />
                <Text style={[movStyles.previewText, { color: '#7C3AED' }]}>
                  Você será direcionado para o carrinho de transferências com este produto pré-selecionado.
                </Text>
              </View>
            )}

            {/* Prévia do resultado (somente para Perda) */}
            {op === 'out' && !!qty && parseFloat(qty) > 0 && (
              <View style={movStyles.previewBox}>
                <MaterialCommunityIcons name="calculator-variant-outline" size={14} color="#64748B" />
                <Text style={movStyles.previewText}>
                  {`${fmtN(row?.available)} - ${fmtN(qty)} = ${fmtN(Math.max(0, parseFloat(row?.available ?? 0) - parseFloat(qty)))}`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={movStyles.footer}>
          <TouchableOpacity style={movStyles.cancelBtn} onPress={resetAndClose}>
            <Text style={movStyles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              movStyles.confirmBtn,
              op === 'in'       && { backgroundColor: '#16A34A' },
              op === 'out'      && { backgroundColor: '#DC2626' },
              op === 'transfer' && { backgroundColor: '#7C3AED' },
              saving && { opacity: 0.7 },
            ]}
            onPress={confirm}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={movStyles.confirmText}>
                  {op === 'in' ? 'Ir para Compra' : op === 'transfer' ? 'Ir para Transferência' : 'Confirmar'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   Modal de Edição Direta dos Saldos (mínimo/máximo/disponível)
   ═══════════════════════════════════════════════════════════════════════ */

export const EditStockModal = ({ visible, row, brandColors, productInvStore, onClose, onSaved }) => {
  const [minimum, setMinimum]     = useState('');
  const [maximum, setMaximum]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const resetAndOpen = () => {
    setMinimum(String(row?.minimum ?? 0));
    setMaximum(String(row?.maximum ?? 0));
    setError('');
  };

  /* re-populate ao abrir */
  useEffect(() => { if (visible && row) resetAndOpen(); }, [visible, row?.id]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        minimum: parseFloat(String(minimum).replace(',', '.')) || 0,
        maximum: parseFloat(String(maximum).replace(',', '.')) || 0,
      };
      if (row.id) {
        payload.id = row.id;
      } else {
        payload.inventory = row._inventoryIRI;
        payload.product   = row._productIRI;
      }
      const saved = await productInvStore.actions.save(payload);
      onSaved(saved || { ...row, ...payload });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.['hydra:description'] || e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={inlineStyle_400_62}>
      <View style={editStyles.container}>
        <View style={editStyles.header}>
          <View style={inlineStyle_403_16}>
            <Text style={editStyles.title}>Editar Limites</Text>
            <Text style={editStyles.subtitle} numberOfLines={1}>
              {row ? (extractProduct(row.product).name || `#${row.id}`) : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={editStyles.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={inlineStyle_413_56}>
          <View style={editStyles.body}>
            {!!error && (
              <View style={editStyles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={editStyles.errorText}>{error}</Text>
              </View>
            )}
            <View style={editStyles.fieldsRow}>
              <View style={editStyles.field}>
                <Text style={editStyles.label}>Mínimo</Text>
                <TextInput
                  style={editStyles.input}
                  value={minimum}
                  onChangeText={setMinimum}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  selectTextOnFocus
                />
              </View>
              <View style={editStyles.field}>
                <Text style={editStyles.label}>Máximo</Text>
                <TextInput
                  style={editStyles.input}
                  value={maximum}
                  onChangeText={setMaximum}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  selectTextOnFocus
                />
              </View>
            </View>
            <View style={editStyles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#64748B" />
              <Text style={editStyles.infoText}>
                Vendas, pedidos e trânsito são atualizados automaticamente pelo sistema.
              </Text>
            </View>
          </View>
        </ScrollView>
        <View style={editStyles.footer}>
          <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose}>
            <Text style={editStyles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[editStyles.saveBtn, { backgroundColor: brandColors?.primary }, saving && { opacity: 0.7 }]}
            onPress={save}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={editStyles.saveText}>Salvar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   Página principal
   ═══════════════════════════════════════════════════════════════════════ */

const InventoryDetailPage = ({ route }) => {
  const { inventory } = route.params;
  const isNoInventory = inventory?._isNoInventory === true;
  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  const productsStore   = useStore('products');
  const productInvStore = useStore('product_inventories');
  const { isLoading: storeLoading } = productInvStore.getters;
  const peopleStore     = useStore('people');
  const invStore        = useStore('inventories');
  const themeStore      = useStore('theme');

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  const maxW = Math.min(width, 860);

  /* ── botão histórico no header ─────────────────────────────────── */
  useLayoutEffect(() => {
    if (!isNoInventory) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('InventoryMovements', {
              inventoryId:   inventory.id,
              inventoryName: inventory.inventory,
            })}
            style={inlineStyle_515_12}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="history" size={22} color="#64748B" />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, inventory.id, isNoInventory]);

  /* ── estado ── */
  const [rows, setRows]         = useState([]);
  const [allInvs, setAllInvs]   = useState([]);   /* para transferências */
  const [search, setSearch]     = useState('');

  /* modais */
  const [movRow, setMovRow]   = useState(null);
  const [editRow, setEditRow] = useState(null);

  /* ─── carregamento mesclado ─────────────────────────────────────── */

  const loadRows = useCallback(async () => {
    if (!currentCompany?.id) return;
    try {
      if (isNoInventory) {
        /* Produtos sem local: defaultIn e defaultOut ambos ausentes */
        const data = await productsStore.actions.getItems({
          company: currentCompany.id,
          'defaultOutInventory[exists]': false,
          'defaultInInventory[exists]':  false,
          active: 1,
          'order[product]': 'ASC',
        });
        /* mapeia para o mesmo shape de row, sem id de PI */
        setRows((data || []).map(p => ({
          id: null,
          product: p,
          available: 0, sales: 0, purchases: 0, transit: 0, minimum: 0, maximum: 0,
          _noInventory: true,
        })));
        return;
      }

      const invIRI = `/inventories/${inventory.id}`;

      /* produto já vem embutido no PI — apenas 2 requests paralelos */
      const [piData, invData] = await Promise.all([
        productInvStore.actions.getItems({ inventory: invIRI }),
        invStore.actions.getItems({ people: currentCompany.id, 'order[inventory]': 'ASC' }).catch(() => []),
      ]);

      /* inventários disponíveis para transferência (exclui o atual) */
      setAllInvs((invData || []).filter(i => i.id !== inventory.id));

      setRows(
        (piData || []).map(pi => ({ ...pi, _inventoryIRI: invIRI }))
      );
    } catch {
      setRows([]);
    }
  }, [currentCompany?.id, inventory.id, isNoInventory]);

  useFocusEffect(useCallback(() => { loadRows(); }, [loadRows]));

  const openPurchaseFromDetail = useCallback((params) => {
    let navRef = navigation;
    let guard = 0;
    while (navRef && guard < 8) {
      try {
        const routeNames = navRef?.getState?.()?.routeNames || [];
        if (Array.isArray(routeNames) && routeNames.includes('PurchaseFormPage')) {
          navRef.navigate('PurchaseFormPage', params);
          return true;
        }
      } catch {}
      navRef = navRef?.getParent?.();
      guard += 1;
    }
    return false;
  }, [navigation]);

  /* ─── filtro busca ─────────────────────────────────────────────── */

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const { name } = extractProduct(r.product);
      return (name || '').toLowerCase().includes(q);
    });
  }, [rows, search]);

  /* ─── movimentação callback ────────────────────────────────────── */

  const handleMoved = ({ rowId, delta }) => {
    setRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, available: Math.max(0, parseFloat(r.available ?? 0) + delta) }
        : r
    ));
  };

  /* ─── edição direta ────────────────────────────────────────────── */

  const handleEditSaved = (values) => {
    setRows(prev => prev.map(r =>
      r.id === editRow?.id ? { ...r, ...values } : r
    ));
  };

  /* ─── render ─────────────────────────────────────────────────── */

  const invConf = INV_TYPE_CONFIG[inventory.type] || INV_TYPE_CONFIG.default;

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.invHeader}>
        <View style={[styles.invIconWrap, isNoInventory
          ? { backgroundColor: '#F1F5F9' }
          : { backgroundColor: invConf.bg }
        ]}>
          <MaterialCommunityIcons
            name={isNoInventory ? 'archive-off-outline' : invConf.icon}
            size={22}
            color={isNoInventory ? '#94A3B8' : invConf.color}
          />
        </View>
        <View style={inlineStyle_644_14}>
          <Text style={styles.invName}>{inventory.inventory}</Text>
          {!isNoInventory && (
            <View style={[styles.typeChip, { backgroundColor: invConf.bg }]}>
              <Text style={[styles.typeChipText, { color: invConf.color }]}>{invConf.label}</Text>
            </View>
          )}
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>produtos</Text>
          <Text style={styles.totalCount}>{rows.length}</Text>
        </View>
      </View>
      {/* Busca */}
      {!storeLoading && rows.length > 0 && (
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={inlineStyle_661_75} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar produto..."
            placeholderTextColor="#CBD5E1"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} style={inlineStyle_670_60}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 84 }]}
      >
        <View style={inlineStyle_681_14({
          maxW: maxW,
        })}>

          {/* Skeleton */}
          {storeLoading && (
            <View style={styles.card}>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </View>
          )}

          {/* Empty */}
          {!storeLoading && rows.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons
                  name={isNoInventory ? 'check-circle-outline' : 'archive-outline'}
                  size={48}
                  color="#CBD5E1"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {isNoInventory ? 'Todos os produtos têm local' : 'Nenhum produto'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isNoInventory
                  ? 'Todos os produtos já estão vinculados a um local de estoque.'
                  : 'Adicione produtos a este local para controlar os saldos.'}
              </Text>
            </View>
          )}

          {/* Lista */}
          {!storeLoading && filteredRows.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderLabel}>
                  {isNoInventory ? 'Produtos sem local' : 'Saldos de Estoque'}
                </Text>
                <Text style={styles.cardHeaderCount}>
                  {filteredRows.length} {filteredRows.length === 1 ? 'produto' : 'produtos'}
                  {search ? ` · "${search}"` : ''}
                </Text>
              </View>

              {filteredRows.map((row, idx) => {
                const { name, type, sku, description } = extractProduct(row.product);
                const ptConf  = PRODUCT_TYPE_CONFIG[type] || null;
                const isLow   = row.minimum > 0 && row.available <= row.minimum;
                const hasPI   = !!row.id;

                return (
                  <View
                    key={row.id || `vr_${idx}`}
                    style={[styles.productRow, idx < filteredRows.length - 1 && styles.productRowDivider]}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {name || `Produto #${extractProduct(row.product).id}`}
                      </Text>
                      {!!description && (
                        <Text style={styles.productDescription} numberOfLines={1}>
                          {description}
                        </Text>
                      )}
                      <View style={styles.productMeta}>
                        {ptConf && (
                          <View style={[styles.miniChip, { backgroundColor: ptConf.bg }]}>
                            <Text style={[styles.miniChipText, { color: ptConf.color }]}>{ptConf.label}</Text>
                          </View>
                        )}
                        {!!sku && <Text style={styles.skuText}>SKU {sku}</Text>}
                        {!hasPI && (
                          <View style={styles.noPiChip}>
                            <Text style={styles.noPiText}>sem saldo</Text>
                          </View>
                        )}
                      </View>

                      {!isNoInventory && hasPI && (
                        <View style={styles.stockGrid}>
                          {[
                            { label: 'Vendas',   val: row.sales },
                            { label: 'Pedidos',  val: row.purchases },
                            { label: 'Trânsito', val: row.transit },
                            { label: 'Mínimo',   val: row.minimum },
                            { label: 'Máximo',   val: row.maximum },
                          ].map(cell => (
                            <View key={cell.label} style={styles.stockCell}>
                              <Text style={styles.stockCellLabel}>{cell.label}</Text>
                              <Text style={styles.stockCellValue}>{fmtN(cell.val)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Direita: disponível + ações */}
                    <View style={styles.rowRight}>
                      {!isNoInventory && (
                        <View style={[styles.availBadge, isLow && styles.availBadgeLow]}>
                          <Text style={[styles.availValue, isLow && styles.availValueLow]}>
                            {fmtN(row.available)}
                          </Text>
                          <Text style={[styles.availLabel, isLow && styles.availLabelLow]}>disp.</Text>
                        </View>
                      )}

                      {!isNoInventory && (
                        <View style={styles.actionBtns}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]}
                            onPress={() => setMovRow(row)}
                            activeOpacity={0.75}
                          >
                            <MaterialCommunityIcons name="swap-vertical" size={15} color="#16A34A" />
                          </TouchableOpacity>
                          {hasPI && (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: '#F8FAFC' }]}
                              onPress={() => setEditRow(row)}
                              activeOpacity={0.75}
                            >
                              <MaterialCommunityIcons name="pencil-outline" size={15} color="#64748B" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!storeLoading && rows.length > 0 && filteredRows.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="magnify-close" size={40} color="#CBD5E1" style={inlineStyle_816_85} />
              <Text style={styles.emptyTitle}>Nenhum resultado</Text>
              <Text style={styles.emptySubtitle}>Nenhum produto para "{search}".</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {/* ── Modal Movimentação ────────────────────────────────────────── */}
      <MovementModal
        visible={!!movRow}
        row={movRow}
        inventories={allInvs}
        brandColors={brandColors}
        productInvStore={productInvStore}
        currentInventory={inventory}
        onOpenPurchase={openPurchaseFromDetail}
        onOpenTransfer={openPurchaseFromDetail}
        onClose={() => setMovRow(null)}
        onMoved={(result) => { handleMoved(result); setMovRow(null); }}
      />
      {/* ── Modal Editar Saldos ───────────────────────────────────────── */}
      <EditStockModal
        visible={!!editRow}
        row={editRow}
        brandColors={brandColors}
        productInvStore={productInvStore}
        onClose={() => setEditRow(null)}
        onSaved={handleEditSaved}
      />
    </SafeAreaView>
  );
};

/* ─── Estilos skeleton ──────────────────────────────────────────────── */

/* ─── Estilos da página ─────────────────────────────────────────────── */

/* ─── Estilos modal movimentação ────────────────────────────────────── */

/* ─── Estilos modal editar saldos ───────────────────────────────────── */

export default InventoryDetailPage;
