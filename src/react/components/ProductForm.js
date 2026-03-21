import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Text,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel'
import { useNavigation } from '@react-navigation/native';
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager';
import { validateProductDraft, validateProductForPublish } from '@controleonline/ui-products/src/react/domain/productValidation';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';
import { ProductLifecycleStatuses } from '@controleonline/ui-products/src/react/domain/productContracts';

const CODE_TYPES = [
  { value: 'sku', label: 'SKU Interno' },
  { value: 'ean', label: 'EAN/GTIN' },
  { value: 'ifood', label: 'iFood' },
  { value: 'app99', label: '99' },
  { value: 'keeta', label: 'Keeta' },
  { value: 'custom', label: 'Personalizado' },
];

const normalizeCodes = codes => {
  if (!Array.isArray(codes)) return [];
  return codes.map((code, idx) => ({
    id: code?.id || `code-${idx}`,
    type: String(code?.type || code?.codeType || '').trim().toLowerCase(),
    value: String(code?.value || code?.codeValue || '').trim(),
    channel: String(code?.channel || '').trim().toLowerCase(),
    label: String(code?.label || '').trim(),
    active: code?.active !== false,
    isPrimary: Boolean(code?.isPrimary),
  }));
};

const normalizeRelationId = value => {
  if (!value && value !== 0) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const m = String(value).match(/(\d+)$/);
    return m ? m[1] : value;
  }
  if (typeof value === 'object') return value.id || value['@id'] || '';
  return value;
};

const getPreferredCode = (codes, type) =>
  codes.find(code => code.type === type && code.isPrimary) ||
  codes.find(code => code.type === type) ||
  null;

const extractId = value => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const m = value.match(/(\d+)$/);
    return m ? m[1] : value;
  }
  if (typeof value === 'object') {
    if (value.id) return extractId(value.id);
    if (value['@id']) return extractId(value['@id']);
  }
  return '';
};

const extractCategoryId = data => {
  const candidates = [
    data?.productCategory?.category,
    data?.productCategory?.category?.id,
    data?.productCategory?.category?.['@id'],
    data?.productCategories?.[0]?.category,
    data?.productCategories?.[0]?.category?.id,
    data?.productCategories?.[0]?.category?.['@id'],
    data?.category,
    data?.category?.id,
    data?.category?.['@id'],
    data?.categoryId,
  ];
  for (const candidate of candidates) {
    const id = extractId(candidate);
    if (id) return id;
  }
  return '';
};

const normalizeProductForForm = data => {
  if (!data) return data;
  return {
    ...data,
    productUnit: normalizeRelationId(data.productUnit),
    queue: normalizeRelationId(data.queue),
    company: normalizeRelationId(data.company),
    defaultOutInventory: normalizeRelationId(data.defaultOutInventory),
    defaultInInventory: normalizeRelationId(data.defaultInInventory),
  };
};

const ProductForm = ({ route, ProductId: propProductId }) => {
  const navigation = useNavigation();
  const { ProductId: routeProductId } = route.params || {};
  const { category: routeCategory } = route.params || {};
  const ProductId = propProductId || routeProductId;
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const categoriesStore = useStore('categories');
  const productCategoryStore = useStore('product_category');
  const peopleStore = useStore('people');
  const productUnitStore = useStore('product_unit');
  const queuesStore = useStore('queues');
  const inventoriesStore = useStore('inventories');
  const { actions: productActions } = productsStore;
  const { actions: categoryActions, getters: categoryGetters } = categoriesStore;
  const { actions: productCategoryActions } = productCategoryStore;
  const { getters: peopleGetters } = peopleStore;
  const { getters: productUnitGetters } = productUnitStore;
  const { getters: queuesGetters } = queuesStore;
  const { getters: inventoriesGetters } = inventoriesStore;

  const { currentCompany } = peopleGetters;

  const [product, setProduct] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [publishErrors, setPublishErrors] = useState([]);
  const [actionStatus, setActionStatus] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const isDesktop = width >= 768;
  const lifecycleStatus = String(product?.extraData?.lifecycle?.status || 'draft').toLowerCase();
  const productCodes = useMemo(() => {
    const extraCodes = normalizeCodes(product?.extraData?.codes || []);
    const skuCode = product?.sku
      ? {
          id: 'legacy-sku',
          type: 'sku',
          value: String(product.sku),
          channel: '',
          label: 'SKU',
          active: true,
          isPrimary: true,
        }
      : null;
    const eanCode = product?.extraData?.eanGtin
      ? {
          id: 'legacy-ean',
          type: 'ean',
          value: String(product.extraData.eanGtin),
          channel: '',
          label: 'EAN',
          active: true,
          isPrimary: true,
        }
      : null;

    const merged = [...extraCodes];
    if (skuCode && !merged.some(c => c.type === 'sku' && c.value === skuCode.value)) merged.unshift(skuCode);
    if (eanCode && !merged.some(c => c.type === 'ean' && c.value === eanCode.value)) merged.push(eanCode);
    return merged;
  }, [product?.extraData?.codes, product?.extraData?.eanGtin, product?.sku]);

  const getData = useCallback(() => {
    if (ProductId) {
      productActions.get(ProductId).then(async data => {
        const normalized = normalizeProductForForm(data);
        setProduct(normalized);

        let existingCategoryId = extractCategoryId(data);

        // Fallback: alguns payloads trazem apenas a relação product_category sem expandir category.
        if (!existingCategoryId) {
          const cleanProductId = extractId(data?.id || ProductId);
          if (cleanProductId) {
            const relationList = await productCategoryActions
              .getItems({ product: `/products/${cleanProductId}` })
              .catch(() => []);
            const relation = Array.isArray(relationList)
              ? relationList[0]
              : Array.isArray(relationList?.['hydra:member'])
                ? relationList['hydra:member'][0]
                : null;
            existingCategoryId = extractCategoryId({ productCategory: relation });
          }
        }

        if (!existingCategoryId) {
          existingCategoryId =
            extractId(routeCategory?.id) ||
            extractId(routeCategory?.['@id']) ||
            '';
        }
        setSelectedCategoryId(existingCategoryId ? String(existingCategoryId) : '');
      });
    } else {
      // initialize a new product when creating
      setProduct(prev => {
        if (prev) return prev;
        return {
          sku: '',
          product: '',
          description: '',
          productUnit: '',
          type: 'product',
          productCondition: 'new',
          price: 0,
          // initialize company as id to match Picker options
          company: currentCompany?.id || '',
          active: true,
        };
      });
      const routeCategoryId =
        routeCategory?.id ||
        routeCategory?.['@id']?.toString?.().replace(/\D/g, '') ||
        '';
      if (routeCategoryId) setSelectedCategoryId(String(routeCategoryId));
    }
  }, [ProductId, currentCompany, routeCategory, productCategoryActions, productActions]);

  useEffect(() => {
    getData();
  }, [getData]);
  
  // load related lists from backend when form loads (respect currentCompany)
  const [listsRequested, setListsRequested] = useState({ units: false, queues: false, inventories: false });
  useEffect(() => {
    const companyId = currentCompany?.id;

    // product units
    if (
      productUnitStore &&
      productUnitStore.actions &&
      (!productUnitGetters.items || productUnitGetters.items.length === 0) &&
      !listsRequested.units
    ) {
      setListsRequested(prev => ({ ...prev, units: true }));
      productUnitStore.actions.getItems({ company: companyId }).catch(() => {});
    }

    // queues
    if (
      queuesStore &&
      queuesStore.actions &&
      (!queuesGetters.items || queuesGetters.items.length === 0) &&
      !listsRequested.queues
    ) {
      setListsRequested(prev => ({ ...prev, queues: true }));
      queuesStore.actions.getItems({ company: companyId }).catch(() => {});
    }

    // inventories
    if (
      inventoriesStore &&
      inventoriesStore.actions &&
      (!inventoriesGetters.items || inventoriesGetters.items.length === 0) &&
      !listsRequested.inventories
    ) {
      setListsRequested(prev => ({ ...prev, inventories: true }));
      inventoriesStore.actions.getItems({ company: companyId }).catch(() => {});
    }
    // only re-run when company changes or getters change
  }, [currentCompany?.id]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    if (!categoryGetters.items || categoryGetters.items.length === 0) {
      categoryActions.getItems({
        context: 'products',
        company: currentCompany.id,
        'order[name]': 'ASC',
      }).catch(() => {});
    }
  }, [currentCompany?.id]);
  // rely on stores' default actions/getters; no local fetching needed

  const handleChange = (field, value) => {
    setProduct(prev => ({ ...prev, [field]: value }));
  };
  const handleExtraDataChange = (field, value) => {
    setProduct(prev => ({
      ...prev,
      extraData: {
        ...(prev?.extraData || {}),
        [field]: value,
      },
    }));
  };
  const handleCodesChange = updater => {
    setProduct(prev => {
      const currentCodes = normalizeCodes(prev?.extraData?.codes || []);
      const nextCodes = normalizeCodes(typeof updater === 'function' ? updater(currentCodes) : updater);
      return {
        ...(prev || {}),
        extraData: {
          ...(prev?.extraData || {}),
          codes: nextCodes,
        },
      };
    });
  };
  const addCodeRow = () => {
    handleCodesChange(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        type: 'custom',
        value: '',
        channel: '',
        label: '',
        active: true,
        isPrimary: false,
      },
    ]);
  };
  const updateCodeRow = (rowId, field, value) => {
    handleCodesChange(prev => {
      const current = prev.find(code => code.id === rowId);
      if (field === 'isPrimary' && value) {
        return prev.map(code =>
          code.id === rowId
            ? { ...code, isPrimary: true }
            : code.type === current?.type
              ? { ...code, isPrimary: false }
              : code,
        );
      }
      return prev.map(code => (code.id === rowId ? { ...code, [field]: value } : code));
    });
  };
  const removeCodeRow = rowId => {
    handleCodesChange(prev => prev.filter(code => code.id !== rowId));
  };

  const reloadProduct = useCallback(async () => {
    if (!ProductId) return;
    const data = await productActions.get(ProductId);
    const normalized = normalizeProductForForm(data);
    setProduct(prev => ({ ...prev, ...(normalized || {}) }));
  }, [ProductId, productActions]);

  const saveCoverRelation = async relation => {
    if (!product?.id || !relation?.id) return;
    const nextExtra = {
      ...(product.extraData || {}),
      imageCoverRelationId: relation.id,
    };
    const saved = await productActions.save({
      id: product.id,
      extraData: nextExtra,
    });
    if (saved) setProduct(prev => ({ ...(prev || {}), ...saved }));
  };

  const handleSave = async () => {
    if (!product) return;
    setActionStatus('');
    const draftErrors = validateProductDraft(product);
    if (draftErrors.length > 0) {
      setValidationErrors(draftErrors);
      return;
    }
    setValidationErrors([]);

    // Prepare payload converting list fields to uri format expected by API
    const payload = { ...product };

    const listFieldMap = {
      productUnit: 'product_unities',
      queue: 'queues',
    };

    Object.keys(listFieldMap).forEach(field => {
      if (payload[field]) {
        const val = String(payload[field]);
        if (!val.startsWith('/')) {
          payload[field] = `/${listFieldMap[field]}/${val}`;
        }
      }
    });

    // ensure company is sent as IRI (string) if user/consumer set an id
    if (payload.company && typeof payload.company === 'number') {
      payload.company = `/people/${payload.company}`;
    } else if (payload.company && typeof payload.company === 'string' && !payload.company.startsWith('/')) {
      // if company contains just an id string, convert to IRI
      const maybeId = payload.company.replace(/[^0-9]/g, '');
      if (maybeId) payload.company = `/people/${maybeId}`;
    }

    // ensure active is boolean
    if (payload.active !== undefined) {
      if (typeof payload.active === 'boolean') {
        // ok
      } else if (typeof payload.active === 'number') {
        payload.active = payload.active === 1;
      } else if (typeof payload.active === 'string') {
        payload.active = payload.active === '1' || payload.active.toLowerCase() === 'true';
      } else {
        payload.active = Boolean(payload.active);
      }
    }

    // backend expects known condition values, empty string may break persistence
    const normalizedCondition = String(payload.productCondition || '').trim().toLowerCase();
    payload.productCondition = normalizedCondition || 'new';

    // ensure numeric fields have correct types
    if (payload.price !== undefined) {
      const raw = String(payload.price).replace(',', '.');
      const f = parseFloat(raw);
      payload.price = Number.isNaN(f) ? 0 : f;
    }
    if (payload.extraData) {
      const toInt = value => {
        if (value === null || value === undefined || value === '') return null;
        const n = parseInt(String(value).replace(/\D/g, ''), 10);
        return Number.isNaN(n) ? null : n;
      };
      const stockSource = payload.extraData.stock || {};
      payload.extraData = {
        ...payload.extraData,
        codes: normalizeCodes(payload.extraData.codes || productCodes).filter(
          code => code.type && code.value,
        ),
        stock: {
          ...stockSource,
          minimum: toInt(stockSource.minimum),
          maximum: toInt(stockSource.maximum),
          leadTimeDays: toInt(stockSource.leadTimeDays),
          controlsStock: Boolean(stockSource.controlsStock ?? payload.extraData.controlsStock),
        },
        lifecycle: {
          ...(payload.extraData.lifecycle || {}),
          status: ProductLifecycleStatuses.includes(
            String(payload.extraData?.lifecycle?.status || '').toLowerCase(),
          )
            ? String(payload.extraData.lifecycle.status).toLowerCase()
            : 'draft',
        },
      };
      delete payload.extraData.stockMin;
      delete payload.extraData.stockMax;
      delete payload.extraData.leadTimeDays;
    }
    const preferredSku = getPreferredCode(payload.extraData?.codes || [], 'sku');
    if (preferredSku?.value) payload.sku = preferredSku.value;
    const preferredEan = getPreferredCode(payload.extraData?.codes || [], 'ean');
    if (preferredEan?.value) {
      payload.extraData = {
        ...(payload.extraData || {}),
        eanGtin: preferredEan.value,
      };
    }

    const syncProductCategory = async data => {
      if (!data?.id || !selectedCategoryId) return;
      const productId = String(data.id).replace(/\D/g, '');
      const categoryIri = `/categories/${String(selectedCategoryId).replace(/\D/g, '')}`;
      const productIri = `/products/${productId}`;
      const existingList = await productCategoryActions
        .getItems({
          product: productIri,
        })
        .catch(() => []);
      const allRelations = Array.isArray(existingList)
        ? existingList
        : Array.isArray(existingList?.['hydra:member'])
          ? existingList['hydra:member']
          : [];

      const matching = allRelations.filter(relation => {
        const relCategoryId = extractId(relation?.category);
        return relCategoryId && String(relCategoryId) === String(selectedCategoryId);
      });

      const keeper = matching[0] || allRelations[0] || null;
      const relationPayload = {
        ...(keeper || {}),
        product: productIri,
        category: categoryIri,
      };
      if (keeper?.id || keeper?.['@id']) {
        relationPayload.id = String(keeper.id || keeper['@id']).replace(/\D/g, '');
      }
      const savedRelation = await productCategoryActions.save(relationPayload);

      const keeperId = String(
        savedRelation?.id ||
          savedRelation?.['@id'] ||
          relationPayload.id ||
          keeper?.id ||
          keeper?.['@id'] ||
          '',
      ).replace(/\D/g, '');
      const duplicated = allRelations.filter(rel => {
        const rid = String(rel?.id || rel?.['@id'] || '').replace(/\D/g, '');
        return rid && rid !== keeperId;
      });
      for (const relation of duplicated) {
        const rid = String(relation?.id || relation?.['@id'] || '').replace(/\D/g, '');
        if (rid) {
          await productCategoryActions.remove(rid).catch(() => null);
        }
      }
    };

    try {
      const data = await productActions.save(payload);
      if (data) {
        await syncProductCategory(data);
        const refreshed = await productActions.get(data.id || ProductId);
        setProduct(normalizeProductForForm(refreshed || data));
        emitProductEvent(PRODUCT_EVENTS.PRODUCT_UPDATED, {
          productId: data.id || ProductId,
          source: 'ProductForm',
        });
        setActionStatus('Produto salvo.');
        // if we created a new product, notify parent route so tabs receive ProductId
        if (!propProductId) {
          const newId = data.id || (data['@id'] && String(data['@id']).split('/').pop());
          if (newId) {
            const parent = navigation.getParent();
            if (parent && parent.setParams) parent.setParams({ ProductId: newId });
          }
        }
      }
    } catch (e) {
      setActionStatus(e?.message || 'Falha ao salvar produto.');
    }
  };

  const handleValidatePublish = () => {
    setActionStatus('');
    const categoryId = selectedCategoryId || routeCategory?.id || routeCategory?.['@id'] || null;
    const errors = validateProductForPublish(product, { categoryId });
    setPublishErrors(errors);
    if (errors.length === 0) setActionStatus('Produto apto para publicacao.');
  };

  const updateLifecycleStatus = async nextStatus => {
    if (!product?.id) return;
    const allowed = ProductLifecycleStatuses.includes(String(nextStatus).toLowerCase());
    if (!allowed) return;

    const isPublishing = nextStatus === 'published';
    if (isPublishing) {
      const categoryId = selectedCategoryId || routeCategory?.id || routeCategory?.['@id'] || null;
      const errors = validateProductForPublish(product, { categoryId });
      setPublishErrors(errors);
      if (errors.length > 0) {
        setActionStatus('Nao foi possivel publicar: ajuste as validacoes.');
        return;
      }
    }

    const payload = {
      id: product.id,
      active: nextStatus === 'published' ? true : product.active,
      extraData: {
        ...(product.extraData || {}),
        lifecycle: {
          ...(product?.extraData?.lifecycle || {}),
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          ...(isPublishing ? { publishedAt: new Date().toISOString() } : {}),
        },
      },
    };
    const saved = await productActions.save(payload);
    if (saved) {
      setProduct(prev => ({ ...(prev || {}), ...saved }));
      const eventName = isPublishing
        ? PRODUCT_EVENTS.PRODUCT_PUBLISHED
        : PRODUCT_EVENTS.PRODUCT_UNPUBLISHED;
      emitProductEvent(eventName, {
        productId: product.id,
        status: nextStatus,
        source: 'ProductForm',
      });
      setActionStatus(
        isPublishing ? 'Produto publicado com sucesso.' : 'Produto voltou para rascunho.',
      );
      if (isPublishing) setPublishErrors([]);
    }
  };

  if (!product) return null;

  // Campos estáticos: TextInput para textos e Picker para listas

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StateStore store="products" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 16,
          }}
        >
          {product?.id && (
            <View
              style={{
                width: isDesktop ? '20%' : '100%',
              }}
            >
              <Carousel
                images={product.productFiles || []}
                style={{ flex: 1 }}
              />
            </View>
          )}

          <View
            style={{
              width: product?.id
                ? isDesktop
                  ? '80%'
                  : '100%'
                : '100%',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {/* Explicit form fields (do not read columns from store) */}
            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>sku</Text>
              <TextInput
                value={String(product.sku || '')}
                onChangeText={val => handleChange('sku', val)}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>product</Text>
              <TextInput
                value={String(product.product || '')}
                onChangeText={val => handleChange('product', val)}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: isDesktop ? '100%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>description</Text>
              <TextInput
                value={String(product.description || '')}
                onChangeText={val => handleChange('description', val)}
                multiline
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12, minHeight: 80 }}
              />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>internalCode</Text>
              <TextInput
                value={String(product?.extraData?.internalCode || '')}
                onChangeText={val => handleExtraDataChange('internalCode', val)}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>slug</Text>
              <TextInput
                value={String(product?.extraData?.slug || '')}
                onChangeText={val => handleExtraDataChange('slug', val)}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 }}>
              <Text style={{ fontWeight: '600', marginBottom: 8 }}>Códigos</Text>
              {(productCodes || []).length === 0 && (
                <Text style={{ color: '#666', marginBottom: 8 }}>
                  Nenhum código cadastrado. Adicione SKU, EAN e códigos de canais.
                </Text>
              )}
              {(productCodes || []).map(code => (
                <View key={code.id} style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 6 }}>
                    <Picker
                      selectedValue={code.type}
                      onValueChange={val => updateCodeRow(code.id, 'type', String(val || 'custom'))}
                    >
                      {CODE_TYPES.map(opt => (
                        <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                      ))}
                    </Picker>
                  </View>
                  <TextInput
                    value={String(code.value || '')}
                    onChangeText={val => updateCodeRow(code.id, 'value', val)}
                    placeholder="Código"
                    style={{ flex: 3, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 }}
                  />
                  <TextInput
                    value={String(code.channel || '')}
                    onChangeText={val => updateCodeRow(code.id, 'channel', val)}
                    placeholder="Canal (opcional)"
                    style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 2 }}>
                    <Text style={{ marginRight: 6 }}>Principal</Text>
                    <Switch value={Boolean(code.isPrimary)} onValueChange={val => updateCodeRow(code.id, 'isPrimary', val)} />
                  </View>
                  <TouchableOpacity
                    onPress={() => removeCodeRow(code.id)}
                    style={{ backgroundColor: '#b00020', borderRadius: 6, paddingHorizontal: 10, justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#fff' }}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={addCodeRow}
                style={{ backgroundColor: '#000', borderRadius: 6, padding: 10, alignItems: 'center', marginTop: 4 }}
              >
                <Text style={{ color: '#fff' }}>Adicionar Código</Text>
              </TouchableOpacity>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>price</Text>
              <TextInput
                value={String(product.price || '')}
                onChangeText={val => handleChange('price', val)}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>productUnit</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.productUnit || ''} onValueChange={val => handleChange('productUnit', val)}>
                  <Picker.Item label="" value="" />
                  {(productUnitGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.productUnit || opt.name || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>queue</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.queue || ''} onValueChange={val => handleChange('queue', val)}>
                  <Picker.Item label="" value="" />
                  {(queuesGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.queue || opt.name || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>category</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker
                  selectedValue={selectedCategoryId || ''}
                  onValueChange={val => setSelectedCategoryId(String(val || ''))}
                >
                  <Picker.Item label="" value="" />
                  {(categoryGetters.items || []).map(opt => (
                    <Picker.Item
                      key={opt.id}
                      label={opt.name || String(opt.id)}
                      value={String(opt.id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>type</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.type || 'product'} onValueChange={val => handleChange('type', val)}>
                  <Picker.Item label="Produto" value="product" />
                  <Picker.Item label="Serviço" value="service" />
                  <Picker.Item label="Componente" value="component" />
                  <Picker.Item label="Matéria Prima" value="feedstock" />
                  <Picker.Item label="Embalagem" value="package" />
                  <Picker.Item label="Custom" value="custom" />
                  <Picker.Item label="Manufactured" value="manufactured" />
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>productCondition</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.productCondition || 'new'} onValueChange={val => handleChange('productCondition', val)}>
                  <Picker.Item label="Novo" value="new" />
                  <Picker.Item label="Usado" value="used" />
                  <Picker.Item label="Recondicionado" value="recondicioned" />
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ flex: 1 }}>featured</Text>
              <Switch value={Boolean(product.featured)} onValueChange={val => handleChange('featured', val)} />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ flex: 1 }}>active</Text>
              <Switch value={Boolean(product.active)} onValueChange={val => handleChange('active', val)} />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>company</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}>
                <Text>{currentCompany?.name || (product.company ? String(product.company) : '')}</Text>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>defaultOutInventory</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.defaultOutInventory || ''} onValueChange={val => handleChange('defaultOutInventory', val)}>
                  <Picker.Item label="" value="" />
                  {(inventoriesGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.inventory || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>defaultInInventory</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.defaultInInventory || ''} onValueChange={val => handleChange('defaultInInventory', val)}>
                  <Picker.Item label="" value="" />
                  {(inventoriesGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.inventory || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ flex: 1 }}>blockedForSale</Text>
              <Switch
                value={Boolean(product?.extraData?.blockedForSale)}
                onValueChange={val => handleExtraDataChange('blockedForSale', val)}
              />
            </View>

            <View
              style={{
                width: isDesktop ? '33%' : '100%',
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 10,
                marginBottom: 12,
              }}
            >
              <Text style={{ marginBottom: 4, color: '#666' }}>status</Text>
              <Text style={{ fontWeight: '600' }}>{lifecycleStatus}</Text>
            </View>

            {/* extraData removed as requested */}
            {validationErrors.length > 0 && (
              <View
                style={{
                  width: '100%',
                  borderWidth: 1,
                  borderColor: '#f3b3b3',
                  backgroundColor: '#fff3f3',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                {validationErrors.map((err, idx) => (
                  <Text key={`${err.field}-${idx}`} style={{ color: '#9e1b1b', marginBottom: 4 }}>
                    {`- ${err.message}`}
                  </Text>
                ))}
              </View>
            )}

            {publishErrors.length > 0 && (
              <View
                style={{
                  width: '100%',
                  borderWidth: 1,
                  borderColor: '#f2d08b',
                  backgroundColor: '#fff8e8',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#6a4f00', marginBottom: 4, fontWeight: '600' }}>
                  Regras para publicar
                </Text>
                {publishErrors.map((err, idx) => (
                  <Text key={`publish-${err.field}-${idx}`} style={{ color: '#6a4f00', marginBottom: 4 }}>
                    {`- ${err.message}`}
                  </Text>
                ))}
              </View>
            )}

            {!!actionStatus && (
              <View style={{ width: '100%' }}>
                <Text style={{ color: '#1b7f34', marginBottom: 8 }}>{actionStatus}</Text>
              </View>
            )}

            {!!product?.id && (
              <View style={{ width: isDesktop ? '33%' : '100%', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={handleValidatePublish}
                  style={{
                    backgroundColor: '#1b5e20',
                    padding: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff' }}>Validar Publicacao</Text>
                </TouchableOpacity>
              </View>
            )}

            {!!product?.id && lifecycleStatus !== 'published' && (
              <View style={{ width: isDesktop ? '33%' : '100%', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => updateLifecycleStatus('published')}
                  style={{
                    backgroundColor: '#0d5f2a',
                    padding: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff' }}>Publicar</Text>
                </TouchableOpacity>
              </View>
            )}

            {!!product?.id && lifecycleStatus === 'published' && (
              <View style={{ width: isDesktop ? '33%' : '100%', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => updateLifecycleStatus('draft')}
                  style={{
                    backgroundColor: '#6d4c41',
                    padding: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff' }}>Voltar para Rascunho</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ width: isDesktop ? '33%' : '100%', marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleSave}
                style={{
                  backgroundColor: '#000',
                  padding: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>Salvar</Text>
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%' }}>
              {!!product?.id ? (
                <AttachmentManager
                  entityType="product"
                  entityId={product.id}
                  attachments={product.productFiles || []}
                  companyId={currentCompany?.id}
                  context="products"
                  coverRelationId={product?.extraData?.imageCoverRelationId}
                  onCoverChanged={saveCoverRelation}
                  onChanged={reloadProduct}
                />
              ) : (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: '#f8f8f8',
                  }}
                >
                  <Text style={{ color: '#666' }}>
                    Salve o produto para habilitar anexos de imagem.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProductForm;
