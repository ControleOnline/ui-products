import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {emitProductEvent, PRODUCT_EVENTS} from '@controleonline/ui-products/src/react/domain/productEvents';

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
      <View style={{padding: 16}}>
        <Text>Salve o produto para habilitar a aba de preço e custo.</Text>
      </View>
    );
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  };

  return (
    <View style={{flex: 1}}>
      <StateStore store="products" />
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text style={{marginBottom: 8, fontWeight: '600'}}>Simulador de Preço e Margem</Text>
        {!hasBomGroups && (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#f2d08b',
              backgroundColor: '#fff8e8',
              borderRadius: 6,
              padding: 10,
              marginBottom: 12,
            }}>
            <Text style={{color: '#6a4f00'}}>
              Produto sem BOM/grupos: use custo manual (compra/atacado) e custos adicionais.
            </Text>
          </View>
        )}

        <Text>Fonte de custo</Text>
        <View style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12}}>
          <Picker
            selectedValue={source}
            onValueChange={v => updatePricing('source', v)}>
            <Picker.Item label="Automático pela BOM" value="auto_bom" />
            <Picker.Item label="Manual" value="manual" />
          </Picker>
        </View>

        <Text>Sincronização com custo de compra</Text>
        <View style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12}}>
          <Picker
            selectedValue={syncMode}
            onValueChange={v => updatePricing('syncMode', v)}>
            {SYNC_MODE_OPTIONS.map(opt => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>

        <Text>Custo manual (quando fonte = manual)</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.costManual || '')}
          onChangeText={v => updatePricing('costManual', v)}
          keyboardType="numeric"
        />
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12}}>
          <TouchableOpacity
            onPress={applySuggestedPurchaseCost}
            disabled={suggestedPurchaseCost === null}
            style={{
              backgroundColor: suggestedPurchaseCost === null ? '#666' : '#1b5e20',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 6,
            }}>
            <Text style={{color: '#fff'}}>Usar preço de compra atual</Text>
          </TouchableOpacity>
          <Text style={{color: '#666'}}>
            {suggestedPurchaseCost === null
              ? 'Sem custo de inventário disponível'
              : `Sugerido: R$ ${round2(suggestedPurchaseCost)}`}
          </Text>
        </View>

        <Text>Custo embalagem adicional por unidade</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.additionalPackagingCost || '')}
          onChangeText={v => updatePricing('additionalPackagingCost', v)}
          keyboardType="numeric"
        />

        <Text>Custo descartáveis adicional por unidade</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.additionalDisposableCost || '')}
          onChangeText={v => updatePricing('additionalDisposableCost', v)}
          keyboardType="numeric"
        />

        <Text>Custo operacional adicional por unidade</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.additionalOperationalCost || '')}
          onChangeText={v => updatePricing('additionalOperationalCost', v)}
          keyboardType="numeric"
        />

        <Text>Custo logístico/despacho por unidade</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.additionalLogisticsCost || '')}
          onChangeText={v => updatePricing('additionalLogisticsCost', v)}
          keyboardType="numeric"
        />

        <Text>Perdas (%)</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.lossPct || '')}
          onChangeText={v => updatePricing('lossPct', v)}
          keyboardType="numeric"
        />

        <Text>Markup (%)</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.markup || '')}
          onChangeText={v => updatePricing('markup', v)}
          keyboardType="numeric"
        />

        <Text>Margem alvo (%)</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.marginTarget || '')}
          onChangeText={v => updatePricing('marginTarget', v)}
          keyboardType="numeric"
        />
        <Text>Margem mínima aceitável (%)</Text>
        <TextInput
          style={inputStyle}
          value={String(pricing.minMarginPct || '')}
          onChangeText={v => updatePricing('minMarginPct', v)}
          keyboardType="numeric"
        />

        <View style={{borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12}}>
          <Text style={{marginBottom: 4}}>{`Custo total unitário: R$ ${round2(cost)}`}</Text>
          <Text style={{marginBottom: 4}}>{`- Insumos/BOM: R$ ${round2(costBreakdown.ingredientCost || 0)}`}</Text>
          <Text style={{marginBottom: 4}}>{`- Embalagens: R$ ${round2(costBreakdown.packagingCost || 0)}`}</Text>
          <Text style={{marginBottom: 4}}>{`- Descartáveis: R$ ${round2(costBreakdown.disposableCost || 0)}`}</Text>
          <Text style={{marginBottom: 4}}>{`- Operacional: R$ ${round2(costBreakdown.operationalCost || 0)}`}</Text>
          <Text style={{marginBottom: 4}}>{`- Logística/Despacho: R$ ${round2(costBreakdown.logisticsCost || 0)}`}</Text>
          <Text style={{marginBottom: 4}}>{`- Perdas: R$ ${round2(costBreakdown.lossCost || 0)}`}</Text>
          <Text style={{marginBottom: 4}}>{`- Modificadores obrigatórios (base): R$ ${round2(costBreakdown.mandatoryModifiersCost || 0)}`}</Text>
          <Text style={{marginBottom: 8}}>{`- Potencial opcional (não incluído no custo base): R$ ${round2(costBreakdown.optionalModifiersPotentialCost || 0)}`}</Text>
          <Text style={{marginBottom: 4}}>{`Preço sugerido (markup): R$ ${simulatedByMarkup}`}</Text>
          <Text>{`Preço sugerido (margem): R$ ${simulatedByMargin}`}</Text>
        </View>
        {marginBelowGuard && (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#b00020',
              backgroundColor: '#ffebee',
              borderRadius: 6,
              padding: 10,
              marginBottom: 12,
            }}>
            <Text style={{color: '#b00020'}}>
              Margem alvo abaixo da margem mínima aceitável. Ajuste antes de publicar.
            </Text>
          </View>
        )}
        {isCostOutdated && (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#f2d08b',
              backgroundColor: '#fff8e8',
              borderRadius: 6,
              padding: 10,
              marginBottom: 12,
            }}>
            <Text style={{color: '#6a4f00'}}>
              {`Custo desatualizado: snapshot atual (R$ ${round2(cost)}) difere do inventário (R$ ${round2(
                suggestedPurchaseCost,
              )}).`}
            </Text>
          </View>
        )}

        <View style={{borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12}}>
          <Text style={{fontWeight: '600', marginBottom: 8}}>Precificação por canal</Text>
          {channelPolicies.length === 0 && (
            <Text style={{color: '#666', marginBottom: 8}}>
              Nenhuma política por canal cadastrada.
            </Text>
          )}
          {channelPolicies.map(policy => (
            <View key={policy.id} style={{borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 6, padding: 8, marginBottom: 8}}>
              <View style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 8}}>
                <Picker
                  selectedValue={policy.channel}
                  onValueChange={v => updateChannelPolicy(policy.id, 'channel', v)}>
                  {CHANNEL_OPTIONS.map(opt => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>
              <Text>Comissão (%)</Text>
              <TextInput
                style={inputStyle}
                value={String(policy.commissionPct || '')}
                onChangeText={v => updateChannelPolicy(policy.id, 'commissionPct', v)}
                keyboardType="numeric"
              />
              <Text>Taxa fixa por pedido/item (R$)</Text>
              <TextInput
                style={inputStyle}
                value={String(policy.fixedFee || '')}
                onChangeText={v => updateChannelPolicy(policy.id, 'fixedFee', v)}
                keyboardType="numeric"
              />
              <Text>Embalagem extra deste canal (R$)</Text>
              <TextInput
                style={inputStyle}
                value={String(policy.extraPackagingCost || '')}
                onChangeText={v => updateChannelPolicy(policy.id, 'extraPackagingCost', v)}
                keyboardType="numeric"
              />
              <Text>Margem alvo do canal (%)</Text>
              <TextInput
                style={inputStyle}
                value={String(policy.targetMarginPct || '')}
                onChangeText={v => updateChannelPolicy(policy.id, 'targetMarginPct', v)}
                keyboardType="numeric"
              />
              <TouchableOpacity
                onPress={() => removeChannelPolicy(policy.id)}
                style={{
                  backgroundColor: '#b00020',
                  padding: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                }}>
                <Text style={{color: '#fff'}}>Remover canal</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={addChannelPolicy}
            style={{
              backgroundColor: '#000',
              padding: 10,
              borderRadius: 6,
              alignItems: 'center',
              marginBottom: 10,
            }}>
            <Text style={{color: '#fff'}}>Adicionar canal</Text>
          </TouchableOpacity>
          {channelSimulations.map((sim, idx) => (
            <View key={`sim-${sim.channel}-${idx}`} style={{marginBottom: 8}}>
              <Text>{`Canal: ${sim.channel}`}</Text>
              <Text>{`Custo total no canal: R$ ${round2(sim.unitCost)}`}</Text>
              <Text>{`Margem líquida no preço por markup: ${round2(sim.netMarginOnMarkup)}%`}</Text>
              <Text>
                {`Preço sugerido (margem com taxas): ${
                  sim.suggestedByMarginWithFees === null
                    ? 'inválido (rever comissão/margem)'
                    : `R$ ${round2(sim.suggestedByMarginWithFees)}`
                }`}
              </Text>
            </View>
          ))}
        </View>

        {!!status && <Text style={{color: '#1b7f34', marginBottom: 8}}>{status}</Text>}
        {!!error && <Text style={{color: '#b00020', marginBottom: 8}}>{error}</Text>}

        <TouchableOpacity
          onPress={recalculateFromBom}
          disabled={calculating || source !== 'auto_bom' || !hasBomGroups}
          style={{
            backgroundColor: source === 'auto_bom' && hasBomGroups ? '#1b5e20' : '#666',
            padding: 12,
            borderRadius: 6,
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <Text style={{color: '#fff'}}>
            {calculating ? 'Recalculando...' : 'Recalcular custo pela BOM'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={persistPricing}
          disabled={saving}
          style={{
            backgroundColor: '#000',
            padding: 12,
            borderRadius: 6,
            alignItems: 'center',
          }}>
          <Text style={{color: '#fff'}}>{saving ? 'Salvando...' : 'Salvar Snapshot'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ProductPricingForm;
