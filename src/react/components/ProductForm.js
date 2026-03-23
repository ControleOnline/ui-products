import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel'
import { useNavigation } from '@react-navigation/native';
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager';
import { validateProductDraft, validateProductForPublish } from '@controleonline/ui-products/src/react/domain/productValidation';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';
import { ProductLifecycleStatuses } from '@controleonline/ui-products/src/react/domain/productContracts';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal'
import { MaterialCommunityIcons } from '@expo/vector-icons'

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

const getStatusPillStyle = status => {
  if (status === 'published') return { backgroundColor: '#DCFCE7' };
  if (status === 'draft') return { backgroundColor: '#F1F5F9' };
  return { backgroundColor: '#FEF3C7' };
};

const getStatusTextStyle = status => {
  if (status === 'published') return { color: '#166534' };
  if (status === 'draft') return { color: '#475569' };
  return { color: '#92400E' };
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

  const brandColors = useMemo(() => resolveThemePalette(), []);
  const [openSection, setOpenSection] = React.useState('identificacao');
  const toggleSection = key => setOpenSection(prev => prev === key ? null : key);

  if (!product) return null;

  // Exibe número com vírgula (padrão BR); backend recebe com ponto (handleSave já converte)
  const fmtN = v => v === '' || v === null || v === undefined ? '' : String(v).replace('.', ',');

  const SelectField = ({ label, value, options, onChange, placeholder = 'Selecionar...' }) => {
    const [open, setOpen] = React.useState(false)
    const selectedOption = options.find(o => String(o.value) === String(value))
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setOpen(true)} activeOpacity={0.7}>
          <Text style={selectedOption ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
        </TouchableOpacity>
        <AnimatedModal visible={open} onRequestClose={() => setOpen(false)}>
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.pickerModalClose}>
                <MaterialCommunityIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalList} showsVerticalScrollIndicator={false}>
              {options.map(opt => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                    onPress={() => { onChange(opt.value); setOpen(false) }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && { color: brandColors.primary, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                    {isSelected && <MaterialCommunityIcons name="check-circle" size={20} color={brandColors.primary} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </AnimatedModal>
      </View>
    )
  }

  const SectionCard = ({ title, icon, sectionKey, children }) => {
    const isOpen = openSection === sectionKey
    return (
      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.sectionCardHeader} onPress={() => toggleSection(sectionKey)} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {icon && <MaterialCommunityIcons name={icon} size={16} color="#94A3B8" style={{ marginRight: 6 }} />}
            <Text style={styles.sectionCardTitle}>{title}</Text>
          </View>
          <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
        </TouchableOpacity>
        {isOpen && <View style={styles.sectionCardBody}>{children}</View>}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StateStore store="products" />
      <StateStore store="categories" />
      <StateStore store="product_unit" />
      <StateStore store="queues" />
      <StateStore store="inventories" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Imagem do produto (só quando já existe id) */}
        {!!product?.id && (
          <View style={styles.imageSection}>
            <Carousel images={product.productFiles || []} style={styles.carouselBox} />
          </View>
        )}

        {/* Erros de validação */}
        {validationErrors.length > 0 && (
          <View style={styles.errorBanner}>
            {validationErrors.map((err, idx) => (
              <Text key={`${err.field}-${idx}`} style={styles.errorText}>• {err.message}</Text>
            ))}
          </View>
        )}
        {publishErrors.length > 0 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>Regras para publicar</Text>
            {publishErrors.map((err, idx) => (
              <Text key={`publish-${err.field}-${idx}`} style={styles.warningText}>• {err.message}</Text>
            ))}
          </View>
        )}
        {!!actionStatus && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color="#166534" />
            <Text style={styles.successText}>{actionStatus}</Text>
          </View>
        )}

        {/* Seção: Identificação */}
        <SectionCard title="Identificação" icon="tag-outline" sectionKey="identificacao">
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput
              value={String(product.product || '')}
              onChangeText={val => handleChange('product', val)}
              style={styles.textInput}
              placeholder="Nome do produto"
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              value={String(product.description || '')}
              onChangeText={val => handleChange('description', val)}
              multiline
              style={styles.textInputMultiline}
              placeholder="Descreva o produto..."
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>SKU</Text>
              <TextInput
                value={String(product.sku || '')}
                onChangeText={val => handleChange('sku', val)}
                style={styles.textInput}
                placeholder="SKU"
                placeholderTextColor="#CBD5E1"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Código Interno</Text>
              <TextInput
                value={String(product?.extraData?.internalCode || '')}
                onChangeText={val => handleExtraDataChange('internalCode', val)}
                style={styles.textInput}
                placeholder="Código"
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Slug</Text>
            <TextInput
              value={String(product?.extraData?.slug || '')}
              onChangeText={val => handleExtraDataChange('slug', val)}
              style={styles.textInput}
              placeholder="slug-do-produto"
              placeholderTextColor="#CBD5E1"
            />
          </View>
        </SectionCard>

        {/* Seção: Preço e Classificação */}
        <SectionCard title="Preço e Classificação" icon="currency-usd" sectionKey="preco">
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Preço (R$)</Text>
            <TextInput
              value={fmtN(product.price)}
              onChangeText={val => handleChange('price', val)}
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="0,00"
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <SelectField
            label="Categoria"
            value={selectedCategoryId || ''}
            onChange={val => setSelectedCategoryId(String(val || ''))}
            options={[
              { value: '', label: 'Sem categoria' },
              ...(categoryGetters.items || []).map(opt => ({ value: String(opt.id), label: opt.name || String(opt.id) }))
            ]}
          />
          <SelectField
            label="Tipo"
            value={product.type || 'product'}
            onChange={val => handleChange('type', val)}
            options={[
              { value: 'product', label: 'Produto' },
              { value: 'service', label: 'Serviço' },
              { value: 'component', label: 'Componente' },
              { value: 'feedstock', label: 'Matéria Prima' },
              { value: 'package', label: 'Embalagem' },
              { value: 'custom', label: 'Custom' },
              { value: 'manufactured', label: 'Manufactured' },
            ]}
          />
          <SelectField
            label="Condição"
            value={product.productCondition || 'new'}
            onChange={val => handleChange('productCondition', val)}
            options={[
              { value: 'new', label: 'Novo' },
              { value: 'used', label: 'Usado' },
              { value: 'recondicioned', label: 'Recondicionado' },
            ]}
          />
          <SelectField
            label="Unidade de Medida"
            value={product.productUnit || ''}
            onChange={val => handleChange('productUnit', val)}
            options={[
              { value: '', label: 'Selecionar...' },
              ...(productUnitGetters.items || []).map(opt => ({ value: opt.id, label: opt.productUnit || opt.name || String(opt) }))
            ]}
          />
        </SectionCard>

        {/* Seção: Configurações */}
        <SectionCard title="Configurações" icon="cog-outline" sectionKey="config">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Ativo</Text>
            <Switch value={Boolean(product.active)} onValueChange={val => handleChange('active', val)} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Destaque</Text>
            <Switch value={Boolean(product.featured)} onValueChange={val => handleChange('featured', val)} />
          </View>
          <View style={[styles.switchRow, styles.switchRowLast]}>
            <Text style={styles.switchLabel}>Bloqueado para Venda</Text>
            <Switch value={Boolean(product?.extraData?.blockedForSale)} onValueChange={val => handleExtraDataChange('blockedForSale', val)} />
          </View>
          <SelectField
            label="Fila"
            value={product.queue || ''}
            onChange={val => handleChange('queue', val)}
            options={[
              { value: '', label: 'Sem fila' },
              ...(queuesGetters.items || []).map(opt => ({ value: opt.id, label: opt.queue || opt.name || String(opt) }))
            ]}
          />
          <SelectField
            label="Estoque de Saída"
            value={product.defaultOutInventory || ''}
            onChange={val => handleChange('defaultOutInventory', val)}
            options={[
              { value: '', label: 'Padrão' },
              ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt) }))
            ]}
          />
          <SelectField
            label="Estoque de Entrada"
            value={product.defaultInInventory || ''}
            onChange={val => handleChange('defaultInInventory', val)}
            options={[
              { value: '', label: 'Padrão' },
              ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt) }))
            ]}
          />
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Empresa</Text>
            <View style={styles.displayField}>
              <Text style={styles.displayFieldText}>{currentCompany?.name || (product.company ? String(product.company) : '—')}</Text>
            </View>
          </View>
        </SectionCard>

        {/* Seção: Códigos */}
        <SectionCard title="Códigos" icon="barcode" sectionKey="codigos">
          {(productCodes || []).length === 0 && (
            <Text style={styles.emptyHint}>Nenhum código cadastrado. Adicione SKU, EAN e códigos de canais.</Text>
          )}
          {(productCodes || []).map(code => (
            <View key={code.id} style={styles.codeRow}>
              <SelectField
                label="Tipo"
                value={code.type}
                onChange={val => updateCodeRow(code.id, 'type', String(val || 'custom'))}
                options={CODE_TYPES.map(opt => ({ value: opt.value, label: opt.label }))}
              />
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Código</Text>
                  <TextInput
                    value={String(code.value || '')}
                    onChangeText={val => updateCodeRow(code.id, 'value', val)}
                    placeholder="Código"
                    placeholderTextColor="#CBD5E1"
                    style={styles.textInput}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Canal</Text>
                  <TextInput
                    value={String(code.channel || '')}
                    onChangeText={val => updateCodeRow(code.id, 'channel', val)}
                    placeholder="Opcional"
                    placeholderTextColor="#CBD5E1"
                    style={styles.textInput}
                  />
                </View>
              </View>
              <View style={styles.codeRowFooter}>
                <View style={styles.switchRowInline}>
                  <Text style={styles.switchLabel}>Principal</Text>
                  <Switch value={Boolean(code.isPrimary)} onValueChange={val => updateCodeRow(code.id, 'isPrimary', val)} />
                </View>
                <TouchableOpacity
                  onPress={() => removeCodeRow(code.id)}
                  style={styles.removeCodeButton}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#fff" />
                  <Text style={styles.removeCodeText}>Remover</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.codeDivider} />
            </View>
          ))}
          <TouchableOpacity
            onPress={addCodeRow}
            style={[styles.addCodeButton, { backgroundColor: brandColors.primary }]}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.addCodeText}>Adicionar Código</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Seção: Status e Publicação (só quando já existe produto) */}
        {!!product?.id && (
          <SectionCard title="Status e Publicação" icon="rocket-launch-outline" sectionKey="status">
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Status atual</Text>
              <View style={[styles.statusPill, getStatusPillStyle(lifecycleStatus)]}>
                <Text style={[styles.statusPillText, getStatusTextStyle(lifecycleStatus)]}>{lifecycleStatus}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={handleValidatePublish}
                style={[styles.actionButton, { backgroundColor: '#1b5e20', flex: 1, marginRight: 6 }]}
              >
                <MaterialCommunityIcons name="check-decagram-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Validar</Text>
              </TouchableOpacity>
              {lifecycleStatus !== 'published' ? (
                <TouchableOpacity
                  onPress={() => updateLifecycleStatus('published')}
                  style={[styles.actionButton, { backgroundColor: '#0d5f2a', flex: 1, marginLeft: 6 }]}
                >
                  <MaterialCommunityIcons name="send-check-outline" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Publicar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => updateLifecycleStatus('draft')}
                  style={[styles.actionButton, { backgroundColor: '#6d4c41', flex: 1, marginLeft: 6 }]}
                >
                  <MaterialCommunityIcons name="undo-variant" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Rascunho</Text>
                </TouchableOpacity>
              )}
            </View>
          </SectionCard>
        )}

        {/* Seção: Imagens (AttachmentManager) */}
        {!!product?.id ? (
          <SectionCard title="Imagens" icon="image-multiple-outline" sectionKey="imagens">
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
          </SectionCard>
        ) : (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="image-off-outline" size={20} color="#94A3B8" />
            <Text style={styles.infoBoxText}>Salve o produto para habilitar anexos de imagem.</Text>
          </View>
        )}

      </ScrollView>

      {/* Botão Salvar fixo no bottom */}
      <View style={styles.saveBar}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: brandColors.primary }]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Salvar Produto</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Imagem
  imageSection: { width: '100%', aspectRatio: 16/9, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#F1F5F9' },
  carouselBox: { flex: 1 },

  // Section Card
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sectionCardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  sectionCardTitle: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },

  saveBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 14 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Fields
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, fontSize: 15, color: '#0F172A' },
  textInputMultiline: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, fontSize: 15, color: '#0F172A', minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, marginBottom: 12 },

  // SelectField
  selectButton: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 15, color: '#0F172A', flex: 1 },
  selectPlaceholder: { fontSize: 15, color: '#CBD5E1', flex: 1 },

  // Picker Modal
  pickerModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '80%' },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerModalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  pickerModalClose: { padding: 4 },
  pickerModalList: { maxHeight: 360 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  pickerOptionActive: { backgroundColor: '#F0FDF4' },
  pickerOptionText: { fontSize: 15, color: '#334155' },

  // Switch rows
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  switchRowLast: { borderBottomWidth: 0, marginBottom: 8 },
  switchRowInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 15, color: '#334155', fontWeight: '500', flex: 1 },

  // Display field (somente leitura)
  displayField: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 13 },
  displayFieldText: { fontSize: 15, color: '#64748B' },

  // Códigos
  codeRow: { marginBottom: 4 },
  codeRowFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  codeDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },
  removeCodeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  removeCodeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  addCodeButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 13, borderRadius: 10, marginTop: 4 },
  addCodeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyHint: { color: '#94A3B8', fontSize: 14, marginBottom: 12 },

  // Status pill
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },

  // Botões de ação
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 10 },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Banners
  errorBanner: { backgroundColor: '#FFF3F3', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: '#9e1b1b', fontSize: 13, marginBottom: 2 },
  warningBanner: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, marginBottom: 12 },
  warningTitle: { color: '#92400E', fontWeight: '700', fontSize: 13, marginBottom: 4 },
  warningText: { color: '#92400E', fontSize: 13, marginBottom: 2 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 12, padding: 12, marginBottom: 12 },
  successText: { color: '#166534', fontSize: 13, fontWeight: '600', flex: 1 },

  // Info box
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoBoxText: { color: '#94A3B8', fontSize: 14, flex: 1 },

})

export default ProductForm;
