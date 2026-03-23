import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {emitProductEvent, PRODUCT_EVENTS} from '@controleonline/ui-products/src/react/domain/productEvents';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';

const toNumber = value => {
  if (value === null || value === undefined || value === '') return 0;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100;

const parseItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const normalizeType = value => String(value || '').trim().toLowerCase();
const toId = value => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const m = String(value).match(/(\d+)$/);
    return m ? m[1] : String(value);
  }
  if (typeof value === 'object') return toId(value.id || value['@id']);
  return '';
};

const normalizePricingState = pricing => ({
  ...(pricing || {}),
  source: String(pricing?.source || 'auto_bom'),
  syncMode: String(pricing?.syncMode || 'suggest'),
  costManual: pricing?.costManual ?? '',
  markup: pricing?.markup ?? '',
  marginTarget: pricing?.marginTarget ?? '',
  minMarginPct: pricing?.minMarginPct ?? '',
  additionalPackagingCost: pricing?.additionalPackagingCost ?? '',
  additionalDisposableCost: pricing?.additionalDisposableCost ?? '',
  additionalOperationalCost: pricing?.additionalOperationalCost ?? '',
  additionalLogisticsCost: pricing?.additionalLogisticsCost ?? '',
  lossPct: pricing?.lossPct ?? '',
  costOutdated: Boolean(pricing?.costOutdated),
  costOutdatedReason: String(pricing?.costOutdatedReason || ''),
  lastInventoryCost: pricing?.lastInventoryCost ?? '',
  costBreakdown: {
    ingredientCost: toNumber(pricing?.costBreakdown?.ingredientCost || 0),
    packagingCost: toNumber(pricing?.costBreakdown?.packagingCost || 0),
    disposableCost: toNumber(pricing?.costBreakdown?.disposableCost || 0),
    operationalCost: toNumber(pricing?.costBreakdown?.operationalCost || 0),
    logisticsCost: toNumber(pricing?.costBreakdown?.logisticsCost || 0),
    lossCost: toNumber(pricing?.costBreakdown?.lossCost || 0),
    mandatoryModifiersCost: toNumber(pricing?.costBreakdown?.mandatoryModifiersCost || 0),
    optionalModifiersPotentialCost: toNumber(pricing?.costBreakdown?.optionalModifiersPotentialCost || 0),
    totalUnitCost: toNumber(pricing?.costBreakdown?.totalUnitCost || 0),
  },
});

const normalizeChannelPolicies = policies => {
  if (!Array.isArray(policies)) return [];
  return policies.map((policy, idx) => ({
    id: String(policy?.id || `${String(policy?.channel || 'channel')}-${idx}`),
    channel: String(policy?.channel || '').trim().toLowerCase(),
    commissionPct: String(policy?.commissionPct ?? ''),
    fixedFee: String(policy?.fixedFee ?? ''),
    extraPackagingCost: String(policy?.extraPackagingCost ?? ''),
    targetMarginPct: String(policy?.targetMarginPct ?? ''),
    active: policy?.active !== false,
  }));
};

const CHANNEL_OPTIONS = [
  {value: 'balcao', label: 'Balcão'},
  {value: 'delivery_proprio', label: 'Delivery Próprio'},
  {value: 'ifood', label: 'iFood'},
  {value: 'app99', label: '99'},
  {value: 'keeta', label: 'Keeta'},
  {value: 'outro', label: 'Outro'},
];

const SOURCE_OPTIONS = [
  {value: 'auto_bom', label: 'Automático pela BOM'},
  {value: 'manual', label: 'Manual'},
];

const SYNC_MODE_OPTIONS = [
  {value: 'manual', label: 'Manual (não sugerir custo)'},
  {value: 'suggest', label: 'Sugerir custo de compra'},
  {value: 'auto_apply', label: 'Aplicar custo de compra automaticamente'},
];

const solvePriceByMarginWithFees = ({
  unitCost,
  commissionPct,
  fixedFee,
  targetMarginPct,
}) => {
  const c = Math.max(0, commissionPct) / 100;
  const m = Math.max(0, targetMarginPct) / 100;
  const denominator = 1 - c - m;
  if (denominator <= 0) return null;
  return round2((Math.max(0, unitCost) + Math.max(0, fixedFee)) / denominator);
};

const calculateNetMarginPct = ({price, unitCost, commissionPct, fixedFee}) => {
  if (!price || price <= 0) return 0;
  const net = price * (1 - Math.max(0, commissionPct) / 100) - Math.max(0, fixedFee);
  return round2(((net - unitCost) / price) * 100);
};

const COST_CANDIDATE_FIELDS = [
  'costAverage',
  'averageCost',
  'cost_avg',
  'avg_cost',
  'costLast',
  'lastCost',
  'last_cost',
  'costStandard',
  'standardCost',
  'unitCost',
  'cost',
];

const extractCostFromObject = obj => {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of COST_CANDIDATE_FIELDS) {
    const value = toNumber(obj?.[key]);
    if (value !== null && value > 0) return value;
  }
  const nested = [
    obj?.extraData?.cost,
    obj?.extraData?.pricing,
    obj?.extraData?.stock,
  ];
  for (const candidate of nested) {
    const value = extractCostFromObject(candidate);
    if (value !== null && value > 0) return value;
  }
  return null;
};

const buildInventoryCostMap = rows => {
  const buckets = {};
  (rows || []).forEach(row => {
    const pid = String(row?.product_id || toId(row?.product) || toId(row?.productChild) || '').replace(/\D/g, '');
    if (!pid) return;
    const cost = extractCostFromObject(row);
    if (cost === null || cost <= 0) return;
    if (!buckets[pid]) buckets[pid] = [];
    buckets[pid].push(cost);
  });
  return Object.entries(buckets).reduce((acc, [pid, costs]) => {
    const avg = costs.reduce((sum, val) => sum + val, 0) / costs.length;
    acc[pid] = round2(avg);
    return acc;
  }, {});
};

// Componente local de seleção via modal animado
const SelectField = ({label, value, options, onChange}) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, styles.selectButton]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}>
        <Text style={styles.selectButtonText}>{selected?.label || 'Selecionar...'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>
      <AnimatedModal visible={visible} onClose={() => setVisible(false)} title={label}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.modalOption, opt.value === value && styles.modalOptionSelected]}
            onPress={() => {
              onChange(opt.value);
              setVisible(false);
            }}>
            <Text style={[styles.modalOptionText, opt.value === value && styles.modalOptionTextSelected]}>
              {opt.label}
            </Text>
            {opt.value === value && (
              <MaterialCommunityIcons name="check" size={18} color="#2563EB" />
            )}
          </TouchableOpacity>
        ))}
      </AnimatedModal>
    </>
  );
};

const ProductPricingForm = ({ProductId}) => {
  const productsStore = useStore('products');
  const productGroupStore = useStore('product_group');
  const productGroupProductStore = useStore('product_group_product');
  const peopleStore = useStore('people');
  const {actions: productActions} = productsStore;
  const {actions: productGroupActions} = productGroupStore;
  const {actions: groupItemActions} = productGroupProductStore;
  const {currentCompany} = peopleStore.getters;
  const [product, setProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [hasBomGroups, setHasBomGroups] = useState(false);
  const [suggestedPurchaseCost, setSuggestedPurchaseCost] = useState(null);

  const brandColors = useMemo(() => resolveThemePalette(), []);

  useEffect(() => {
    if (!ProductId) return;
    productActions.get(ProductId).then(data => setProduct(data));
  }, [ProductId, productActions]);

  useEffect(() => {
    let mounted = true;
    if (!ProductId) return;
    const productIri = `/products/${String(ProductId).replace(/\D/g, '')}`;
    productGroupActions
      .getItems({parentProduct: productIri})
      .then(resp => {
        if (!mounted) return;
        const groups = parseItems(resp);
        setHasBomGroups(groups.length > 0);
      })
      .catch(() => {
        if (!mounted) return;
        setHasBomGroups(false);
      });
    return () => {
      mounted = false;
    };
  }, [ProductId, productGroupActions]);

  useEffect(() => {
    let mounted = true;
    if (!ProductId || !currentCompany?.id) return;
    productActions
      .getInventory({company: currentCompany.id})
      .then(rows => {
        if (!mounted) return;
        const costMap = buildInventoryCostMap(rows || []);
        const pid = String(ProductId).replace(/\D/g, '');
        const nextCost = costMap[pid] ?? null;
        setSuggestedPurchaseCost(nextCost !== null ? round2(nextCost) : null);
      })
      .catch(() => {
        if (!mounted) return;
        setSuggestedPurchaseCost(null);
      });
    return () => {
      mounted = false;
    };
  }, [ProductId, currentCompany?.id, productActions]);

  const pricing = useMemo(
    () => normalizePricingState(product?.extraData?.pricing || {}),
    [product],
  );
  const channelPolicies = useMemo(
    () => normalizeChannelPolicies(pricing?.channelPolicies || []),
    [pricing?.channelPolicies],
  );
  const costBreakdown = pricing?.costBreakdown || {};
  const source = String(pricing?.source || 'auto_bom');
  const syncMode = String(pricing?.syncMode || 'suggest');
  const autoCost = toNumber(costBreakdown.totalUnitCost || 0);
  const cost = source === 'manual' ? toNumber(pricing.costManual || pricing.cost || 0) : autoCost;
  const markup = toNumber(pricing.markup || 0);
  const marginTarget = toNumber(pricing.marginTarget || 0);
  const minMarginPct = toNumber(pricing.minMarginPct || 0);
  const marginBelowGuard = minMarginPct > 0 && marginTarget < minMarginPct;
  const costDiff = suggestedPurchaseCost === null ? 0 : Math.abs(round2(cost) - round2(suggestedPurchaseCost));
  const isCostOutdated = suggestedPurchaseCost !== null && costDiff >= 0.01;

  const simulatedByMarkup = round2(cost * (1 + markup / 100));
  const simulatedByMargin =
    marginTarget >= 100 ? 0 : round2(cost / Math.max(0.0001, 1 - marginTarget / 100));

  const updatePricing = (field, value) => {
    setProduct(prev => ({
      ...(prev || {}),
      extraData: {
        ...(prev?.extraData || {}),
        pricing: {
          ...(prev?.extraData?.pricing || {}),
          [field]: value,
        },
      },
    }));
  };
  const updateChannelPolicies = updater => {
    setProduct(prev => {
      const current = normalizeChannelPolicies(prev?.extraData?.pricing?.channelPolicies || []);
      const next = normalizeChannelPolicies(
        typeof updater === 'function' ? updater(current) : updater,
      );
      return {
        ...(prev || {}),
        extraData: {
          ...(prev?.extraData || {}),
          pricing: {
            ...(prev?.extraData?.pricing || {}),
            channelPolicies: next,
          },
        },
      };
    });
  };
  const addChannelPolicy = () => {
    updateChannelPolicies(prev => [
      ...prev,
      {
        id: `channel-${Date.now()}`,
        channel: 'ifood',
        commissionPct: '',
        fixedFee: '',
        extraPackagingCost: '',
        targetMarginPct: '',
        active: true,
      },
    ]);
  };
  const updateChannelPolicy = (rowId, field, value) => {
    updateChannelPolicies(prev =>
      prev.map(policy => (policy.id === rowId ? {...policy, [field]: value} : policy)),
    );
  };
  const removeChannelPolicy = rowId => {
    updateChannelPolicies(prev => prev.filter(policy => policy.id !== rowId));
  };
  const updateBreakdown = patch => {
    setProduct(prev => ({
      ...(prev || {}),
      extraData: {
        ...(prev?.extraData || {}),
        pricing: {
          ...(prev?.extraData?.pricing || {}),
          costBreakdown: {
            ...((prev?.extraData?.pricing || {}).costBreakdown || {}),
            ...patch,
          },
        },
      },
    }));
  };
  const applySuggestedPurchaseCost = () => {
    if (suggestedPurchaseCost === null) return;
    updatePricing('costManual', String(suggestedPurchaseCost));
    setStatus('Custo manual preenchido com custo atual do inventário.');
    setError('');
  };

  const channelSimulations = useMemo(() => {
    return channelPolicies
      .filter(policy => policy.active && policy.channel)
      .map(policy => {
        const commissionPct = toNumber(policy.commissionPct || 0);
        const fixedFee = toNumber(policy.fixedFee || 0);
        const extraPackagingCost = toNumber(policy.extraPackagingCost || 0);
        const channelUnitCost = round2(cost + Math.max(0, extraPackagingCost));
        const policyMargin = toNumber(
          policy.targetMarginPct === '' ? marginTarget : policy.targetMarginPct,
        );
        const suggestedByMarginWithFees = solvePriceByMarginWithFees({
          unitCost: channelUnitCost,
          commissionPct,
          fixedFee,
          targetMarginPct: policyMargin,
        });
        const netMarginOnMarkup = calculateNetMarginPct({
          price: simulatedByMarkup,
          unitCost: channelUnitCost,
          commissionPct,
          fixedFee,
        });
        return {
          ...policy,
          commissionPct,
          fixedFee,
          extraPackagingCost,
          unitCost: channelUnitCost,
          targetMarginPct: policyMargin,
          suggestedByMarginWithFees,
          netMarginOnMarkup,
        };
      });
  }, [channelPolicies, cost, marginTarget, simulatedByMarkup]);

  const getGroupMandatoryCost = (group, items) => {
    const minimumRaw = parseInt(String(group?.minimum ?? '0'), 10);
    const minimum = Number.isFinite(minimumRaw) ? Math.max(0, minimumRaw) : 0;
    const requiredMinimum = group?.required && minimum === 0 ? 1 : minimum;
    if (requiredMinimum === 0) {
      return {
        mandatoryLines: [],
        optionalLines: items,
      };
    }
    const sorted = [...items].sort((a, b) => a.total - b.total);
    return {
      mandatoryLines: sorted.slice(0, requiredMinimum),
      optionalLines: sorted.slice(requiredMinimum),
    };
  };

  const recalculateFromBom = async () => {
    if (!ProductId) return;
    setCalculating(true);
    setStatus('');
    setError('');
    try {
      const productIri = `/products/${String(ProductId).replace(/\D/g, '')}`;
      const inventoryRows = await productActions
        .getInventory({company: currentCompany?.id})
        .catch(() => []);
      const inventoryCostMap = buildInventoryCostMap(inventoryRows || []);
      const groupsResp = await productGroupActions
        .getItems({parentProduct: productIri})
        .catch(() => []);
      const groups = parseItems(groupsResp);

      let ingredientCost = 0;
      let packagingCost = 0;
      let disposableCost = 0;
      let mandatoryModifiersCost = 0;
      let optionalModifiersPotentialCost = 0;

      for (const group of groups) {
        const groupId = String(group?.id || group?.['@id'] || '').replace(/\D/g, '');
        if (!groupId) continue;

        const groupItemsResp = await groupItemActions
          .getItems({
            product: productIri,
            productGroup: `/product_groups/${groupId}`,
          })
          .catch(() => []);
        const groupItems = parseItems(groupItemsResp);
        const normalizedItems = groupItems
          .map(item => {
            const child = item?.productChild || {};
            const childId = String(toId(child)).replace(/\D/g, '');
            const inventoryCost = childId ? inventoryCostMap[childId] : null;
            const childCatalogCost =
              extractCostFromObject(child) ||
              extractCostFromObject(child?.extraData) ||
              extractCostFromObject(child?.pricing);
            const linePrice = toNumber(item?.price || 0);
            const unit =
              (inventoryCost !== null && inventoryCost > 0
                ? inventoryCost
                : childCatalogCost !== null && childCatalogCost > 0
                  ? childCatalogCost
                  : linePrice);
            const qty = toNumber(item?.quantity || 1);
            const total = round2(unit * (qty > 0 ? qty : 1));
            const childType = normalizeType(item?.productChild?.type);
            const bucket = normalizeType(item?.extraData?.costBucket);
            return {
              id: item?.id || item?.['@id'],
              unit,
              total,
              type: childType,
              bucket,
            };
          })
          .filter(item => item.total >= 0);

        const {mandatoryLines, optionalLines} = getGroupMandatoryCost(group, normalizedItems);
        mandatoryModifiersCost += mandatoryLines.reduce((acc, line) => acc + line.total, 0);
        optionalModifiersPotentialCost += optionalLines.reduce((acc, line) => acc + line.total, 0);

        mandatoryLines.forEach(line => {
          if (line.bucket === 'disposable') {
            disposableCost += line.total;
            return;
          }
          if (line.bucket === 'packaging' || line.type === 'package') {
            packagingCost += line.total;
            return;
          }
          ingredientCost += line.total;
        });
      }

      const additionalPackagingCost = toNumber(pricing.additionalPackagingCost || 0);
      const additionalDisposableCost = toNumber(pricing.additionalDisposableCost || 0);
      const additionalOperationalCost = toNumber(pricing.additionalOperationalCost || 0);
      const additionalLogisticsCost = toNumber(pricing.additionalLogisticsCost || 0);
      const lossPct = toNumber(pricing.lossPct || 0);

      const subtotal = round2(
        ingredientCost +
          packagingCost +
          disposableCost +
          additionalPackagingCost +
          additionalDisposableCost +
          additionalOperationalCost +
          additionalLogisticsCost,
      );
      const lossCost = round2(subtotal * (Math.max(0, lossPct) / 100));
      const totalUnitCost = round2(subtotal + lossCost);

      updateBreakdown({
        ingredientCost: round2(ingredientCost),
        packagingCost: round2(packagingCost + additionalPackagingCost),
        disposableCost: round2(disposableCost + additionalDisposableCost),
        operationalCost: round2(additionalOperationalCost),
        logisticsCost: round2(additionalLogisticsCost),
        lossCost,
        mandatoryModifiersCost: round2(mandatoryModifiersCost),
        optionalModifiersPotentialCost: round2(optionalModifiersPotentialCost),
        totalUnitCost,
      });
      setStatus('Custo recalculado pela BOM e custos adicionais.');
    } catch (e) {
      setError(e?.message || 'Falha ao recalcular custo pela BOM.');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (!ProductId || !product?.id) return;
    if (source !== 'auto_bom') return;
    if (!hasBomGroups) return;
    recalculateFromBom();
  }, [ProductId, product?.id, source, currentCompany?.id, hasBomGroups]);

  useEffect(() => {
    if (!product?.id) return;
    if (hasBomGroups) return;
    const currentSource = String(product?.extraData?.pricing?.source || '').toLowerCase();
    const hasManualCost = toNumber(product?.extraData?.pricing?.costManual) > 0;
    if (currentSource === 'auto_bom' || !currentSource) {
      setProduct(prev => ({
        ...(prev || {}),
        extraData: {
          ...(prev?.extraData || {}),
          pricing: {
            ...(prev?.extraData?.pricing || {}),
            source: 'manual',
            ...(hasManualCost ? {} : {costManual: String(prev?.extraData?.pricing?.costManual || '')}),
          },
        },
      }));
      setStatus('Produto sem BOM: custo manual ativado automaticamente.');
    }
  }, [product?.id, hasBomGroups]);

  useEffect(() => {
    if (!product?.id) return;
    if (source !== 'manual') return;
    if (syncMode !== 'auto_apply') return;
    if (suggestedPurchaseCost === null || suggestedPurchaseCost <= 0) return;
    const currentManualCost = toNumber(pricing.costManual || pricing.cost || 0);
    if (Math.abs(round2(currentManualCost) - round2(suggestedPurchaseCost)) < 0.01) return;
    updatePricing('costManual', String(suggestedPurchaseCost));
    setStatus('Custo manual atualizado automaticamente pelo custo de compra atual.');
  }, [product?.id, source, syncMode, suggestedPurchaseCost, pricing.costManual, pricing.cost]);

  const persistPricing = async () => {
    if (!ProductId || !product) return;
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const breakdown = pricing?.costBreakdown || {};
      const chosenCost = source === 'manual' ? toNumber(pricing.costManual || pricing.cost || 0) : autoCost;
      const snapshot = {
        source,
        syncMode,
        cost: chosenCost,
        costManual: toNumber(product?.extraData?.pricing?.costManual || 0),
        markup: toNumber(product?.extraData?.pricing?.markup),
        marginTarget: toNumber(product?.extraData?.pricing?.marginTarget),
        minMarginPct: toNumber(product?.extraData?.pricing?.minMarginPct),
        additionalPackagingCost: toNumber(product?.extraData?.pricing?.additionalPackagingCost || 0),
        additionalDisposableCost: toNumber(product?.extraData?.pricing?.additionalDisposableCost || 0),
        additionalOperationalCost: toNumber(product?.extraData?.pricing?.additionalOperationalCost || 0),
        additionalLogisticsCost: toNumber(product?.extraData?.pricing?.additionalLogisticsCost || 0),
        lossPct: toNumber(product?.extraData?.pricing?.lossPct || 0),
        channelPolicies: channelPolicies.map(policy => ({
          channel: String(policy.channel || '').toLowerCase(),
          commissionPct: toNumber(policy.commissionPct || 0),
          fixedFee: toNumber(policy.fixedFee || 0),
          extraPackagingCost: toNumber(policy.extraPackagingCost || 0),
          targetMarginPct: toNumber(
            policy.targetMarginPct === '' ? marginTarget : policy.targetMarginPct,
          ),
          active: policy.active !== false,
        })),
        channelSimulations: channelSimulations.map(sim => ({
          channel: sim.channel,
          unitCost: sim.unitCost,
          suggestedByMarginWithFees: sim.suggestedByMarginWithFees,
          netMarginOnMarkup: sim.netMarginOnMarkup,
        })),
        costBreakdown: {
          ingredientCost: toNumber(breakdown.ingredientCost || 0),
          packagingCost: toNumber(breakdown.packagingCost || 0),
          disposableCost: toNumber(breakdown.disposableCost || 0),
          operationalCost: toNumber(breakdown.operationalCost || 0),
          logisticsCost: toNumber(breakdown.logisticsCost || 0),
          lossCost: toNumber(breakdown.lossCost || 0),
          mandatoryModifiersCost: toNumber(breakdown.mandatoryModifiersCost || 0),
          optionalModifiersPotentialCost: toNumber(breakdown.optionalModifiersPotentialCost || 0),
          totalUnitCost: toNumber(breakdown.totalUnitCost || 0),
        },
        simulatedByMarkup,
        simulatedByMargin,
        costOutdated: isCostOutdated,
        costOutdatedReason:
          isCostOutdated && suggestedPurchaseCost !== null
            ? `Custo atual (${round2(chosenCost)}) difere do custo de inventário (${round2(suggestedPurchaseCost)}).`
            : '',
        lastInventoryCost: suggestedPurchaseCost !== null ? round2(suggestedPurchaseCost) : null,
        timestamp: new Date().toISOString(),
      };

      await productActions.save({
        id: ProductId,
        extraData: {
          ...(product.extraData || {}),
          pricing: snapshot,
        },
      });
      emitProductEvent(PRODUCT_EVENTS.COST_RECALCULATED, {
        productId: ProductId,
        snapshot,
        source: 'ProductPricingForm',
      });
      setStatus('Snapshot de precificacao salvo.');
    } catch (e) {
      setError(e?.message || 'Falha ao salvar precificacao.');
    } finally {
      setSaving(false);
    }
  };

  if (!ProductId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Salve o produto para habilitar a aba de preço e custo.</Text>
      </View>
    );
  }

  const fmtN = v => (v === '' || v === null || v === undefined) ? '' : String(v).replace('.', ',');
  const fmtBRL = v => { const n = parseFloat(String(v || 0).replace(',', '.')); return isNaN(n) ? '0,00' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  const bomBtnDisabled = calculating || source !== 'auto_bom' || !hasBomGroups;

  return (
    <View style={styles.container}>
      <StateStore store="products" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Aviso sem BOM */}
        {!hasBomGroups && (
          <View style={styles.alertWarning}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#92400E" style={{marginRight: 6}} />
            <Text style={styles.alertWarningText}>
              Produto sem BOM/grupos: use custo manual (compra/atacado) e custos adicionais.
            </Text>
          </View>
        )}

        {/* Mensagens de status e erro */}
        {!!status && (
          <View style={styles.msgSuccess}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color="#166534" style={{marginRight: 6}} />
            <Text style={styles.msgSuccessText}>{status}</Text>
          </View>
        )}
        {!!error && (
          <View style={styles.msgError}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={{marginRight: 6}} />
            <Text style={styles.msgErrorText}>{error}</Text>
          </View>
        )}

        {/* Card: Configuração de Custo */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Configuração de Custo</Text>

          <SelectField
            label="Fonte de custo"
            value={source}
            options={SOURCE_OPTIONS}
            onChange={v => updatePricing('source', v)}
          />

          <SelectField
            label="Sincronização com custo de compra"
            value={syncMode}
            options={SYNC_MODE_OPTIONS}
            onChange={v => updatePricing('syncMode', v)}
          />

          <Text style={styles.label}>Custo manual (quando fonte = manual)</Text>
          <TextInput
            style={styles.input}
            value={fmtN(pricing.costManual)}
            onChangeText={v => updatePricing('costManual', v)}
            keyboardType="numeric"
            placeholder="0,00"
            placeholderTextColor="#CBD5E1"
          />

          <TouchableOpacity
            onPress={applySuggestedPurchaseCost}
            disabled={suggestedPurchaseCost === null}
            style={[styles.btnSecondary, suggestedPurchaseCost === null && styles.btnDisabled]}>
            <MaterialCommunityIcons name="tag-outline" size={15} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.btnText}>
              {suggestedPurchaseCost === null
                ? 'Sem custo de inventário disponível'
                : `Usar preço de compra atual (R$ ${fmtBRL(suggestedPurchaseCost)})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card: Simulador de Preço */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Simulador de Preço</Text>

          <View style={styles.row2col}>
            <View style={styles.col}>
              <Text style={styles.label}>Markup (%)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(pricing.markup)}
                onChangeText={v => updatePricing('markup', v)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
              />
            </View>
            <View style={[styles.col, {marginLeft: 10}]}>
              <Text style={styles.label}>Margem alvo (%)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(pricing.marginTarget)}
                onChangeText={v => updatePricing('marginTarget', v)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          <Text style={styles.label}>Margem mínima aceitável (%)</Text>
          <TextInput
            style={styles.input}
            value={fmtN(pricing.minMarginPct)}
            onChangeText={v => updatePricing('minMarginPct', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#CBD5E1"
          />

          {marginBelowGuard && (
            <View style={styles.alertDanger}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#B91C1C" style={{marginRight: 6}} />
              <Text style={styles.alertDangerText}>
                Margem alvo abaixo da margem mínima aceitável. Ajuste antes de publicar.
              </Text>
            </View>
          )}
        </View>

        {/* Card: Custos Adicionais */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Custos Adicionais</Text>

          <View style={styles.row2col}>
            <View style={styles.col}>
              <Text style={styles.label}>Embalagem adicional (R$)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(pricing.additionalPackagingCost)}
                onChangeText={v => updatePricing('additionalPackagingCost', v)}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#CBD5E1"
              />
            </View>
            <View style={[styles.col, {marginLeft: 10}]}>
              <Text style={styles.label}>Descartáveis adicionais (R$)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(pricing.additionalDisposableCost)}
                onChangeText={v => updatePricing('additionalDisposableCost', v)}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          <View style={styles.row2col}>
            <View style={styles.col}>
              <Text style={styles.label}>Operacional adicional (R$)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(pricing.additionalOperationalCost)}
                onChangeText={v => updatePricing('additionalOperationalCost', v)}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#CBD5E1"
              />
            </View>
            <View style={[styles.col, {marginLeft: 10}]}>
              <Text style={styles.label}>Logística/despacho (R$)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(pricing.additionalLogisticsCost)}
                onChangeText={v => updatePricing('additionalLogisticsCost', v)}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          <Text style={styles.label}>Perdas (%)</Text>
          <TextInput
            style={styles.input}
            value={fmtN(pricing.lossPct)}
            onChangeText={v => updatePricing('lossPct', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#CBD5E1"
          />
        </View>

        {/* Card: Resumo de Custo */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Resumo de Custo</Text>

          {isCostOutdated && (
            <View style={styles.alertOutdated}>
              <MaterialCommunityIcons name="clock-alert-outline" size={15} color="#92400E" style={{marginRight: 6}} />
              <Text style={styles.alertOutdatedText}>
                {`Custo desatualizado: snapshot atual (R$ ${fmtBRL(cost)}) difere do inventário (R$ ${fmtBRL(suggestedPurchaseCost)}).`}
              </Text>
            </View>
          )}

          <View style={styles.costSummaryCard}>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryLabel}>Custo total unitário</Text>
              <Text style={styles.costSummaryValueMain}>{`R$ ${fmtBRL(cost)}`}</Text>
            </View>
            <View style={styles.costSummaryDivider} />
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Insumos/BOM</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.ingredientCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Embalagens</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.packagingCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Descartáveis</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.disposableCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Operacional</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.operationalCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Logística/Despacho</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.logisticsCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Perdas</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.lossCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Modificadores obrigatórios (base)</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.mandatoryModifiersCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryItem}>Potencial opcional (não no custo base)</Text>
              <Text style={styles.costSummaryValue}>{`R$ ${fmtBRL(costBreakdown.optionalModifiersPotentialCost || 0)}`}</Text>
            </View>
            <View style={styles.costSummaryDivider} />
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryLabel}>Preço sugerido (markup)</Text>
              <Text style={styles.costSummaryValueMain}>{`R$ ${fmtBRL(simulatedByMarkup)}`}</Text>
            </View>
            <View style={styles.costSummaryRow}>
              <Text style={styles.costSummaryLabel}>Preço sugerido (margem)</Text>
              <Text style={styles.costSummaryValueMain}>{`R$ ${fmtBRL(simulatedByMargin)}`}</Text>
            </View>
          </View>
        </View>

        {/* Card: Políticas por Canal */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Políticas por Canal</Text>

          {channelPolicies.length === 0 && (
            <Text style={styles.emptyCardText}>Nenhuma política por canal cadastrada.</Text>
          )}

          {channelPolicies.map(policy => (
            <View key={policy.id} style={styles.channelCard}>
              <SelectField
                label="Canal"
                value={policy.channel}
                options={CHANNEL_OPTIONS}
                onChange={v => updateChannelPolicy(policy.id, 'channel', v)}
              />

              <View style={styles.row2col}>
                <View style={styles.col}>
                  <Text style={styles.label}>Comissão (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={fmtN(policy.commissionPct)}
                    onChangeText={v => updateChannelPolicy(policy.id, 'commissionPct', v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
                <View style={[styles.col, {marginLeft: 10}]}>
                  <Text style={styles.label}>Taxa fixa por pedido (R$)</Text>
                  <TextInput
                    style={styles.input}
                    value={fmtN(policy.fixedFee)}
                    onChangeText={v => updateChannelPolicy(policy.id, 'fixedFee', v)}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
              </View>

              <View style={styles.row2col}>
                <View style={styles.col}>
                  <Text style={styles.label}>Embalagem extra canal (R$)</Text>
                  <TextInput
                    style={styles.input}
                    value={fmtN(policy.extraPackagingCost)}
                    onChangeText={v => updateChannelPolicy(policy.id, 'extraPackagingCost', v)}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
                <View style={[styles.col, {marginLeft: 10}]}>
                  <Text style={styles.label}>Margem alvo canal (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={fmtN(policy.targetMarginPct)}
                    onChangeText={v => updateChannelPolicy(policy.id, 'targetMarginPct', v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => removeChannelPolicy(policy.id)}
                style={styles.btnDestructive}>
                <MaterialCommunityIcons name="trash-can-outline" size={15} color="#fff" style={{marginRight: 6}} />
                <Text style={styles.btnText}>Remover canal</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={addChannelPolicy} style={styles.btnAddChannel}>
            <MaterialCommunityIcons name="plus" size={16} color="#2563EB" style={{marginRight: 6}} />
            <Text style={styles.btnAddChannelText}>Adicionar canal</Text>
          </TouchableOpacity>

          {/* Simulações por canal */}
          {channelSimulations.length > 0 && (
            <View style={{marginTop: 8}}>
              <Text style={[styles.label, {marginBottom: 10}]}>Simulações</Text>
              {channelSimulations.map((sim, idx) => (
                <View key={`sim-${sim.channel}-${idx}`} style={styles.simCard}>
                  <Text style={styles.simChannel}>
                    {CHANNEL_OPTIONS.find(o => o.value === sim.channel)?.label || sim.channel}
                  </Text>
                  <View style={styles.simRow}>
                    <Text style={styles.simItem}>Custo total no canal</Text>
                    <Text style={styles.simValue}>{`R$ ${fmtBRL(sim.unitCost)}`}</Text>
                  </View>
                  <View style={styles.simRow}>
                    <Text style={styles.simItem}>Margem líquida (preço por markup)</Text>
                    <Text style={styles.simValue}>{`${fmtBRL(sim.netMarginOnMarkup)}%`}</Text>
                  </View>
                  <View style={styles.simRow}>
                    <Text style={styles.simItem}>Preço sugerido (margem com taxas)</Text>
                    <Text style={styles.simValue}>
                      {sim.suggestedByMarginWithFees === null
                        ? 'inválido (rever comissão/margem)'
                        : `R$ ${fmtBRL(sim.suggestedByMarginWithFees)}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Footer fixo com botões */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={recalculateFromBom}
          disabled={bomBtnDisabled}
          style={[styles.footerBtnSecondary, bomBtnDisabled && styles.btnDisabled]}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={15} color="#fff" style={{marginRight: 6}} />
          <Text style={styles.btnText}>
            {calculating ? 'Recalculando...' : 'Recalcular BOM'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={persistPricing}
          disabled={saving}
          style={[styles.footerBtnPrimary, {backgroundColor: brandColors?.primary || '#2563EB'}, saving && styles.btnDisabled]}>
          <MaterialCommunityIcons name="content-save-outline" size={15} color="#fff" style={{marginRight: 6}} />
          <Text style={styles.btnText}>{saving ? 'Salvando...' : 'Salvar Snapshot'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  label: {
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
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonText: {
    fontSize: 15,
    color: '#0F172A',
    flex: 1,
  },
  row2col: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    backgroundColor: '#fff',
    gap: 10,
  },
  footerBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  footerBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b5e20',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b5e20',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  btnDestructive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  btnAddChannel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 10,
    backgroundColor: '#EFF6FF',
  },
  btnAddChannelText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  alertWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  alertWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  alertDanger: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  alertDangerText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
  },
  alertOutdated: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  alertOutdatedText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  msgSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  msgSuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
  msgError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  msgErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#9e1b1b',
  },
  costSummaryCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  costSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  costSummaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    flex: 1,
  },
  costSummaryValueMain: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  costSummaryItem: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  costSummaryValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  costSummaryDivider: {
    height: 1,
    backgroundColor: '#D1FAE5',
    marginVertical: 8,
  },
  channelCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  simCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  simChannel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
  },
  simRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  simItem: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  simValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#0F172A',
  },
  modalOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
});

export default ProductPricingForm;
