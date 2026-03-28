import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';

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
    <View style={{ flex: 1, gap: 6 }}>
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
  inventories,
  brandColors,
  productInvStore,
  currentInventory,
  onClose,
  onMoved,
  onOpenPurchase,
}) => {
  const ordersStore       = useStore('orders');
  const orderProductStore = useStore('order_products');
  const statusStore       = useStore('status');
  const peopleStore       = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const [op, setOp]           = useState('in');
  const [qty, setQty]         = useState('');
  const [destInv, setDestInv] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const resetAndClose = () => {
    setOp('in'); setQty(''); setDestInv(null); setError(''); setSaving(false);
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
    const amount = parseFloat(String(qty).replace(',', '.'));
    if (!amount || amount <= 0) { setError('Informe uma quantidade válida'); return; }
    if (op === 'transfer' && !destInv) { setError('Selecione o local de destino'); return; }

    setSaving(true);
    setError('');
    try {
      const curAvail = parseFloat(row?.available ?? 0);
      const { id: prodId } = extractProduct(row.product);
      const invIRI = row._inventoryIRI || (currentInventory?.id ? `/inventories/${currentInventory.id}` : null);

      if (op === 'in') {
        /* Entrada: aumenta disponível + registra como purchase */
        if (row.id) {
          await productInvStore.actions.save({ id: row.id, available: curAvail + amount });
        } else {
          await productInvStore.actions.save({
            inventory: invIRI,
            product:   `/products/${prodId}`,
            available: amount,
          });
        }
        await createOrderRecord('purchase', prodId, invIRI, null);
        onMoved({ rowId: row.id, delta: amount, op });

      } else if (op === 'out') {
        /* Saída: diminui disponível + registra como sale */
        if (row.id) {
          await productInvStore.actions.save({ id: row.id, available: Math.max(0, curAvail - amount) });
        }
        await createOrderRecord('loss', prodId, null, invIRI);
        onMoved({ rowId: row.id, delta: -amount, op });

      } else if (op === 'transfer') {
        /* Transferência: diminui origem, aumenta destino + registra como transfer */
        const destIRI = `/inventories/${destInv.id}`;

        if (row.id) {
          await productInvStore.actions.save({ id: row.id, available: Math.max(0, curAvail - amount) });
        }

        const destPiData = await productInvStore.actions.getItems({
          'inventory': destIRI,
          'product':   `/products/${prodId}`,
        }).catch(() => []);

        const destPi = (destPiData || [])[0];
        if (destPi) {
          await productInvStore.actions.save({
            id: destPi.id,
            available: parseFloat(destPi.available ?? 0) + amount,
          });
        } else {
          await productInvStore.actions.save({
            inventory: destIRI,
            product:   `/products/${prodId}`,
            available: amount,
          });
        }
        /* um único order_product com outInventory (origem) e inInventory (destino) */
        await createOrderRecord('transfer', prodId, destIRI, invIRI);
        onMoved({ rowId: row.id, delta: -amount, op });
      }

      resetAndClose();
    } catch (e) {
      setError(e?.response?.data?.['hydra:description'] || e?.message || 'Erro na movimentação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedModal visible={visible} onRequestClose={resetAndClose} style={{ justifyContent: 'flex-end' }}>
      <View style={movStyles.container}>
        <View style={movStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={movStyles.title}>Movimentação</Text>
            <Text style={movStyles.subtitle} numberOfLines={1}>{productName}</Text>
          </View>
          <TouchableOpacity onPress={resetAndClose} style={movStyles.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
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

            {/* Quantidade (oculto para Compra pois redireciona ao PurchaseForm) */}
            {op !== 'in' && (
            <View style={movStyles.field}>
              <Text style={movStyles.fieldLabel}>Quantidade</Text>
              <TextInput
                style={[
                  movStyles.qtyInput,
                  op === 'out'      && { borderColor: '#DC2626', color: '#DC2626' },
                  op === 'transfer' && { borderColor: '#7C3AED', color: '#7C3AED' },
                ]}
                value={qty}
                onChangeText={v => { setQty(v); setError(''); }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                selectTextOnFocus
              />
            </View>
            )}

            {/* Destino (transferência) */}
            {op === 'transfer' && (
              <View style={movStyles.field}>
                <Text style={movStyles.fieldLabel}>Local de Destino</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                    {inventories.map(inv => {
                      const sel = destInv?.id === inv.id;
                      return (
                        <TouchableOpacity
                          key={inv.id}
                          style={[movStyles.destChip, sel && movStyles.destChipActive]}
                          onPress={() => { setDestInv(inv); setError(''); }}
                          activeOpacity={0.75}
                        >
                          <Text style={[movStyles.destChipText, sel && movStyles.destChipTextActive]}>
                            {inv.inventory}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Prévia do resultado */}
            {!!qty && parseFloat(qty) > 0 && (
              <View style={movStyles.previewBox}>
                <MaterialCommunityIcons name="calculator-variant-outline" size={14} color="#64748B" />
                <Text style={movStyles.previewText}>
                  {op === 'in'
                    ? `${fmtN(row?.available)} + ${fmtN(qty)} = ${fmtN(parseFloat(row?.available ?? 0) + parseFloat(qty))}`
                    : op === 'out'
                      ? `${fmtN(row?.available)} - ${fmtN(qty)} = ${fmtN(Math.max(0, parseFloat(row?.available ?? 0) - parseFloat(qty)))}`
                      : `Saída: ${fmtN(Math.max(0, parseFloat(row?.available ?? 0) - parseFloat(qty)))} | Entrada no destino: +${fmtN(qty)}`
                  }
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
              : <Text style={movStyles.confirmText}>{op === 'in' ? 'Ir para Compra' : 'Confirmar'}</Text>
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

const EditStockModal = ({ visible, row, brandColors, productInvStore, onClose, onSaved }) => {
  const [available, setAvailable] = useState('');
  const [minimum, setMinimum]     = useState('');
  const [maximum, setMaximum]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const resetAndOpen = () => {
    setAvailable(String(row?.available ?? 0));
    setMinimum(String(row?.minimum ?? 0));
    setMaximum(String(row?.maximum ?? 0));
    setError('');
  };

  /* re-populate ao abrir */
  useEffect(() => { if (visible && row) resetAndOpen(); }, [visible, row?.id]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await productInvStore.actions.save({
        id:        row.id,
        available: parseFloat(String(available).replace(',', '.')) || 0,
        minimum:   parseFloat(String(minimum).replace(',', '.'))   || 0,
        maximum:   parseFloat(String(maximum).replace(',', '.'))   || 0,
      });
      onSaved({
        available: parseFloat(String(available).replace(',', '.')) || 0,
        minimum:   parseFloat(String(minimum).replace(',', '.'))   || 0,
        maximum:   parseFloat(String(maximum).replace(',', '.'))   || 0,
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.['hydra:description'] || e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={{ justifyContent: 'flex-end' }}>
      <View style={editStyles.container}>
        <View style={editStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={editStyles.title}>Editar Saldos</Text>
            <Text style={editStyles.subtitle} numberOfLines={1}>
              {row ? (extractProduct(row.product).name || `#${row.id}`) : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={editStyles.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
          <View style={editStyles.body}>
            {!!error && (
              <View style={editStyles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={editStyles.errorText}>{error}</Text>
              </View>
            )}
            <View style={editStyles.fieldsRow}>
              <View style={editStyles.field}>
                <Text style={editStyles.label}>Disponível</Text>
                <TextInput
                  style={[editStyles.input, editStyles.inputHighlight]}
                  value={available}
                  onChangeText={setAvailable}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  selectTextOnFocus
                />
              </View>
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
            style={{ paddingHorizontal: 12 }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="history" size={22} color="#64748B" />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, inventory.id, isNoInventory]);

  /* ── estado ── */
  const [loading, setLoading]   = useState(true);
  const [rows, setRows]         = useState([]);
  const [allInvs, setAllInvs]   = useState([]);   /* para transferências */
  const [search, setSearch]     = useState('');

  /* modais */
  const [movRow, setMovRow]   = useState(null);
  const [editRow, setEditRow] = useState(null);

  /* ─── carregamento mesclado ─────────────────────────────────────── */

  const loadRows = useCallback(async () => {
    if (!currentCompany?.id) { setLoading(false); return; }
    setLoading(true);
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
          available: 0, sales: 0, ordered: 0, transit: 0, minimum: 0, maximum: 0,
          _noInventory: true,
        })));
        return;
      }

      const invIRI = `/inventories/${inventory.id}`;

      /* carrega em paralelo: PI records + produtos por defaultOut + defaultIn */
      const [piData, prodsOut, prodsIn, invData] = await Promise.all([
        productInvStore.actions.getItems({ 'inventory': invIRI }),
        productsStore.actions.getItems({
          company: currentCompany.id,
          defaultOutInventory: invIRI,
          active: 1,
        }).catch(() => []),
        productsStore.actions.getItems({
          company: currentCompany.id,
          defaultInInventory: invIRI,
          active: 1,
        }).catch(() => []),
        invStore.actions.getItems({ people: currentCompany.id, 'order[inventory]': 'ASC' }).catch(() => []),
      ]);

      /* inventários disponíveis para transferência (exclui o atual) */
      setAllInvs((invData || []).filter(i => i.id !== inventory.id));

      /* mapa product_id → PI record */
      const piById = new Map();
      (piData || []).forEach(pi => {
        const { id } = extractProduct(pi.product);
        if (id) piById.set(String(id), pi);
      });

      /* mapa product_id → product object (dos linked por defaultIn/Out) */
      const linkedProds = new Map();
      [...(prodsOut || []), ...(prodsIn || [])].forEach(p => {
        linkedProds.set(String(p.id), p);
      });

      /* produtos em PI que não vieram via defaultIn/Out (ex: compra manual)
         precisam ser buscados individualmente para ter nome/tipo disponível */
      const missingProdIds = (piData || [])
        .map(pi => extractProduct(pi.product).id)
        .filter(id => id && !linkedProds.has(String(id)));

      if (missingProdIds.length > 0) {
        const fetched = await Promise.all(
          [...new Set(missingProdIds)].map(id =>
            productsStore.actions.get(id).catch(() => null)
          )
        );
        fetched.forEach(p => { if (p?.id) linkedProds.set(String(p.id), p); });
      }

      const merged = [];
      const seen   = new Set();

      /* primeiro: PI records enriquecidos com o objeto de produto */
      (piData || []).forEach(pi => {
        const { id } = extractProduct(pi.product);
        const key = id ? String(id) : `pi_${pi.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        const enrichedProduct = linkedProds.get(String(id)) || pi.product;
        merged.push({ ...pi, product: enrichedProduct, _inventoryIRI: invIRI });
      });

      /* depois: produtos vinculados sem PI record ainda */
      linkedProds.forEach((product, pid) => {
        if (seen.has(pid)) return;
        seen.add(pid);
        merged.push({
          id: null,
          product,
          available: 0, sales: 0, ordered: 0, transit: 0, minimum: 0, maximum: 0,
          _inventoryIRI: invIRI,
        });
      });

      setRows(merged);
    } catch (_) {
      setRows([]);
    } finally {
      setLoading(false);
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
      } catch (_) {}
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
        <View style={{ flex: 1 }}>
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
      {!loading && rows.length > 0 && (
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar produto..."
            placeholderTextColor="#CBD5E1"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 84 }]}
      >
        <View style={{ width: maxW, paddingHorizontal: 16, paddingTop: 8 }}>

          {/* Skeleton */}
          {loading && (
            <View style={styles.card}>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </View>
          )}

          {/* Empty */}
          {!loading && rows.length === 0 && (
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
          {!loading && filteredRows.length > 0 && (
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
                            { label: 'Pedidos',  val: row.ordered },
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

          {!loading && rows.length > 0 && filteredRows.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="magnify-close" size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
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

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  line: { borderRadius: 6, backgroundColor: '#E2E8F0' },
});

/* ─── Estilos da página ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  invHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  invIconWrap:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  invName:      { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  typeChip:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  totalBadge:   { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  totalLabel:   { fontSize: 10, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  totalCount:   { fontSize: 20, fontWeight: '800', color: '#1E293B' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 6 },

  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },

  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, marginTop: 12, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardHeaderLabel: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardHeaderCount: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },

  productRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  productRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  rowLeft: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  productDescription: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  miniChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  miniChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  skuText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  noPiChip: { backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  noPiText: { fontSize: 9, fontWeight: '700', color: '#D97706', letterSpacing: 0.3 },

  stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  stockCell: { backgroundColor: '#F8FAFC', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 50 },
  stockCellLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  stockCellValue: { fontSize: 12, fontWeight: '700', color: '#475569' },

  rowRight: { alignItems: 'center', gap: 6 },
  availBadge: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 56 },
  availBadgeLow: { backgroundColor: '#FFF7ED' },
  availValue: { fontSize: 18, fontWeight: '800', color: '#16A34A' },
  availValueLow: { color: '#D97706' },
  availLabel: { fontSize: 9, fontWeight: '700', color: '#86EFAC', textTransform: 'uppercase', letterSpacing: 0.3 },
  availLabelLow: { color: '#FCD34D' },
  actionBtns: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },
});

/* ─── Estilos modal movimentação ────────────────────────────────────── */

const movStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title:    { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  body: { padding: 24, gap: 18 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText:   { fontSize: 13, color: '#DC2626', flex: 1 },

  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  balanceValue: { fontSize: 22, fontWeight: '800', color: '#1E293B' },

  opsRow: { flexDirection: 'row', gap: 8 },
  opChip: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  opLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 },
  qtyInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 24, fontWeight: '800', color: '#1E293B',
    backgroundColor: '#F8FAFC', textAlign: 'center',
  },

  destChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  destChipActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  destChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  destChipTextActive: { color: '#7C3AED' },

  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  previewText: { fontSize: 13, color: '#475569', flex: 1 },

  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#1E293B' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

/* ─── Estilos modal editar saldos ───────────────────────────────────── */

const editStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title:    { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  body: { padding: 24, gap: 16 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },
  fieldsRow: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: '#0F172A', backgroundColor: '#F8FAFC', textAlign: 'center' },
  inputHighlight: { borderColor: '#16A34A', backgroundColor: '#F0FDF4', color: '#16A34A' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  infoText: { fontSize: 12, color: '#64748B', flex: 1, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});


export default InventoryDetailPage;
