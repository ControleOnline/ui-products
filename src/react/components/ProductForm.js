import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TextInput, Text, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { useNavigation } from '@react-navigation/native';
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './ProductForm.styles';
import {
  buildProductUnitOptions,
  findRecommendedServiceUnit,
  SERVICE_TYPE,
} from '../domain/serviceUnitOptions';

import {
  inlineStyle_71_8,
  inlineStyle_76_10,
  inlineStyle_78_20,
  inlineStyle_84_14,
  inlineStyle_85_16,
  inlineStyle_144_12,
  inlineStyle_150_12,
  inlineStyle_545_10,
  inlineStyle_673_18,
  inlineStyle_675_20,
} from './ProductForm.styles';

import { inlineStyle_92_14 } from './ProductForm.styles';

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

const extractCategoryIdValue = value => {
  const id = extractId(value);
  return /^\d+$/.test(String(id || '')) ? String(id) : '';
};

const collectionFrom = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.member)) return value.member;
  if (Array.isArray(value['hydra:member'])) return value['hydra:member'];
  return [value];
};

const uniqueCategoryIds = ids => {
  const seen = new Set();
  return ids
    .map(extractCategoryIdValue)
    .filter(Boolean)
    .filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
};

const extractCategoryIds = data => {
  const ids = [];

  collectionFrom(data?.productCategory).forEach(relation => {
    ids.push(relation?.category);
  });
  collectionFrom(data?.productCategories).forEach(relation => {
    ids.push(relation?.category);
  });
  ids.push(data?.category, data?.category?.id, data?.category?.['@id'], data?.categoryId);

  return uniqueCategoryIds(ids);
};

const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';

const buildEntityLabels = context => context === 'supplies'
  ? {
      saveSuccess: 'Insumo salvo.',
      saveAction: 'Salvar Insumo',
      namePlaceholder: 'Nome do insumo',
      descriptionPlaceholder: 'Descreva o insumo...',
      imageDisabled: 'Salve o insumo para habilitar anexos de imagem.',
    }
  : {
      saveSuccess: 'Produto salvo.',
      saveAction: 'Salvar Produto',
      namePlaceholder: 'Nome do produto',
      descriptionPlaceholder: 'Descreva o produto...',
      imageDisabled: 'Salve o produto para habilitar anexos de imagem.',
    };

const PRODUCT_TYPE_LABELS = {
  product: 'Produto',
  manufactured: 'Fabricado',
  custom: 'Customizável',
  service: 'Serviço',
  feedstock: 'Matéria-prima',
  component: 'Componente operacional',
  package: 'Embalagem',
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

const SkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={inlineStyle_71_8({
    height: height,
    mb: mb,
    width: width,
  })} />
);

const SkeletonTab = () => (
  <ScrollView contentContainerStyle={inlineStyle_92_14} showsVerticalScrollIndicator={false}>
    <View style={inlineStyle_76_10} />
    {[1, 2, 3, 4].map(i => (
      <View key={i} style={inlineStyle_78_20}>
        <View style={inlineStyle_84_14}>
          <View style={inlineStyle_85_16} />
          <SkeletonLine width="35%" height={13} mb={0} />
        </View>
        <SkeletonLine height={40} mb={8} />
        {i < 3 && <SkeletonLine height={40} mb={0} />}
      </View>
    ))}
  </ScrollView>
);

/* ─── SelectField fora do componente pai para evitar remount a cada render ─── */
const SelectField = ({ label, value, options, onChange, placeholder = 'Selecionar...', brandColors }) => {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(o => String(o.value) === String(value));
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
              const isSelected = String(opt.value) === String(value);
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, isSelected && { color: brandColors.primary, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {isSelected && <MaterialCommunityIcons name="check-circle" size={20} color={brandColors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AnimatedModal>
    </View>
  );
};

const CategoryMultiSelectField = ({ label, values = [], options, onChange, brandColors }) => {
  const [open, setOpen] = React.useState(false);
  const selectedValues = useMemo(() => new Set(uniqueCategoryIds(values)), [values]);
  const selectedOptions = options.filter(opt => selectedValues.has(String(opt.value)));

  const toggleValue = value => {
    const id = extractCategoryIdValue(value);
    if (!id) return;

    const next = new Set(selectedValues);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.multiSelectButton} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={styles.multiSelectSummary}>
          {selectedOptions.length === 0 ? (
            <Text style={styles.selectPlaceholder}>Sem categoria</Text>
          ) : (
            <>
              {selectedOptions.slice(0, 3).map(option => (
                <View key={String(option.value)} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText} numberOfLines={1}>{option.label}</Text>
                </View>
              ))}
              {selectedOptions.length > 3 && (
                <View style={styles.categoryChipOverflow}>
                  <Text style={styles.categoryChipText}>+{selectedOptions.length - 3}</Text>
                </View>
              )}
            </>
          )}
        </View>
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
            <TouchableOpacity
              style={[styles.pickerOption, selectedValues.size === 0 && styles.pickerOptionActive]}
              onPress={() => onChange([])}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerOptionText, selectedValues.size === 0 && { color: brandColors.primary, fontWeight: '700' }]}>
                Sem categoria
              </Text>
              {selectedValues.size === 0 && <MaterialCommunityIcons name="check-circle" size={20} color={brandColors.primary} />}
            </TouchableOpacity>
            {options.map(opt => {
              const isSelected = selectedValues.has(String(opt.value));
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                  onPress={() => toggleValue(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, isSelected && { color: brandColors.primary, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  <MaterialCommunityIcons
                    name={isSelected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                    size={20}
                    color={isSelected ? brandColors.primary : '#CBD5E1'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AnimatedModal>
    </View>
  );
};

/* ─── SectionCard fora do componente pai para evitar remount a cada render ─── */
const SectionCard = ({ title, icon, isOpen, onToggle, hasError, children }) => (
  <View style={[styles.sectionCard, hasError && styles.sectionCardError]}>
    <TouchableOpacity style={styles.sectionCardHeader} onPress={onToggle} activeOpacity={0.7}>
      <View style={inlineStyle_144_12}>
        {icon && (
          <MaterialCommunityIcons
            name={hasError ? 'alert-circle' : icon}
            size={16}
            color={hasError ? '#EF4444' : '#94A3B8'}
            style={inlineStyle_150_12}
          />
        )}
        <Text style={[styles.sectionCardTitle, hasError && styles.sectionCardTitleError]}>{title}</Text>
      </View>
      <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={hasError ? '#EF4444' : '#94A3B8'} />
    </TouchableOpacity>
    {isOpen && <View style={styles.sectionCardBody}>{children}</View>}
  </View>
);

const ProductForm = ({
  route,
  ProductId: propProductId,
  catalogContext,
  contextTypes,
  initialProductType,
  onSavedProductId,
  onSaved,
}) => {
  const navigation = useNavigation();
  const { ProductId: routeProductId } = route.params || {};
  const routeCategoryIdParam = route.params?.categoryId || '';
  const routeInitialProductType = String(route.params?.initialProductType || '').trim().toLowerCase();
  const normalizedInitialProductType = String(initialProductType || routeInitialProductType || '').trim().toLowerCase();
  const context = normalizeCatalogContext(catalogContext || route.params?.context);
  const ProductId = propProductId || routeProductId;
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
  const entityLabels = useMemo(() => buildEntityLabels(context), [context]);
  const storedCategory = categoryGetters.item;
  const selectedRouteCategoryId =
    extractCategoryIdValue(routeCategoryIdParam) ||
    extractCategoryIdValue(storedCategory?.id) ||
    extractCategoryIdValue(storedCategory?.['@id']) ||
    '';

  const [product, setProduct] = useState(null);
  const [actionStatus, setActionStatus] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [controlarEstoque, setControlarEstoque] = useState(false);
  const [categoriesRequestKey, setCategoriesRequestKey] = useState('');

  const getContextTypes = () => {
    if (!contextTypes || contextTypes.length === 0) return [];

    return contextTypes.map(ct => ({
      value: ct,
      label: PRODUCT_TYPE_LABELS[ct] || ct.charAt(0).toUpperCase() + ct.slice(1),
    }));
  };

  const typeOptions = useMemo(() => {
    const fallback = ['product'];

    const source =
      contextTypes && contextTypes.length
        ? contextTypes
        : fallback;

    return source.map(ct => ({
      value: ct,
      label: PRODUCT_TYPE_LABELS[ct] || ct.charAt(0).toUpperCase() + ct.slice(1),
    }));
  }, [contextTypes]);

  const getData = useCallback(() => {
    if (ProductId) {
      productActions.get(ProductId).then(async data => {
        const normalized = normalizeProductForForm(data);
        setProduct(normalized);
        setControlarEstoque(Boolean(normalized?.defaultOutInventory || normalized?.defaultInInventory));

        let existingCategoryIds = extractCategoryIds(data);

        const cleanProductId = extractId(data?.id || ProductId);
        if (cleanProductId) {
          const relationList = await productCategoryActions
            .getItems({ product: `/products/${cleanProductId}`, itemsPerPage: 300 })
            .catch(() => []);
          const relationCategoryIds = extractCategoryIds({ productCategories: collectionFrom(relationList) });
          if (relationCategoryIds.length > 0) existingCategoryIds = relationCategoryIds;
        }

        if (existingCategoryIds.length === 0 && selectedRouteCategoryId) {
          existingCategoryIds = [selectedRouteCategoryId];
        }
        setSelectedCategoryIds(existingCategoryIds);
      });
    } else {
      setProduct(prev => {
        if (prev) return prev;
        const allowedTypes = typeOptions.map(option => option.value);
        const defaultType = allowedTypes.includes(normalizedInitialProductType)
          ? normalizedInitialProductType
          : (context === 'supplies' && allowedTypes.includes('feedstock')
            ? 'feedstock'
            : (allowedTypes[0] || 'product'));
        return {
          sku: '',
          product: '',
          description: '',
          productUnit: '',
          type: defaultType,
          productCondition: 'new',
          price: 0,
          company: currentCompany?.id || '',
          active: true,
          featured: false,
        };
      });
      if (selectedRouteCategoryId) setSelectedCategoryIds([selectedRouteCategoryId]);
    }
  }, [
    ProductId,
    currentCompany,
    context,
    normalizedInitialProductType,
    productCategoryActions,
    productActions,
    selectedRouteCategoryId,
    typeOptions,
  ]);

  useEffect(() => {
    getData();
  }, [getData]);

  const [listsRequested, setListsRequested] = useState({ units: false, queues: false, inventories: false });

  // reseta flags ao trocar de empresa para recarregar listas da empresa correta
  const prevCompanyIdRef = React.useRef(null);
  useEffect(() => {
    if (prevCompanyIdRef.current !== currentCompany?.id) {
      prevCompanyIdRef.current = currentCompany?.id;
      setListsRequested({ units: false, queues: false, inventories: false });
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    const companyId = currentCompany?.id;
    if (!companyId) return;
    const peopleIRI = `/people/${companyId}`;

    if (productUnitStore?.actions && !listsRequested.units) {
      setListsRequested(prev => ({ ...prev, units: true }));
      productUnitStore.actions.getItems({ people: peopleIRI, itemsPerPage: 200 }).catch(() => { });
    }

    if (queuesStore?.actions && !listsRequested.queues) {
      setListsRequested(prev => ({ ...prev, queues: true }));
      queuesStore.actions.getItems({ company: peopleIRI, itemsPerPage: 200 }).catch(() => { });
    }

    if (inventoriesStore?.actions && !listsRequested.inventories) {
      setListsRequested(prev => ({ ...prev, inventories: true }));
      inventoriesStore.actions.getItems({ people: peopleIRI, itemsPerPage: 200 }).catch(() => { });
    }
  }, [currentCompany?.id, listsRequested]);

  useEffect(() => {
    const companyId = currentCompany?.id;
    if (!companyId) return;

    const requestKey = `${context}:${companyId}`;
    if (categoriesRequestKey === requestKey) return;
    if (categoryGetters.isLoading) return;

    setCategoriesRequestKey(requestKey);
    categoryActions.getItems({
      context,
      company: companyId,
      'order[name]': 'ASC',
      itemsPerPage: 200,
    }).catch(() => {
      setCategoriesRequestKey('');
    });
  }, [
    categoriesRequestKey,
    categoryActions,
    categoryGetters.isLoading,
    categoryGetters.items,
    context,
    currentCompany?.id,
  ]);

  const handleChange = (field, value) => {
    setProduct(prev => ({ ...prev, [field]: value }));
  };

  const reloadProduct = useCallback(async () => {
    if (!ProductId) return;
    const data = await productActions.get(ProductId);
    const normalized = normalizeProductForForm(data);
    setProduct(prev => ({ ...prev, ...(normalized || {}) }));
  }, [ProductId, productActions]);

  const saveProductCover = useCallback(async relation => {
    if (!product?.id || !relation?.id) return;
    const toIri = (val, prefix) => {
      if (!val) return null;
      if (typeof val === 'string' && val.startsWith('/')) return val;
      const id = typeof val === 'object'
        ? (val.id || String(val['@id'] || '').replace(/\D/g, ''))
        : String(val).replace(/\D/g, '');
      return id ? `${prefix}${id}` : null;
    };
    const priceVal = parseFloat(String(product.price || 0).replace(',', '.'));
    try {
      await productActions.save({
        id: product.id,
        product: product.product,
        type: product.type || 'product',
        price: isNaN(priceVal) ? 0 : priceVal,
        description: product.description || '',
        sku: product.sku || null,
        active: product.active !== false,
        featured: product.featured === true || product.featured === 1,
        productCondition: product.productCondition || 'new',
        productUnit: toIri(product.productUnit, '/product_unities/'),
        company: toIri(product.company, '/people/'),
        extraData: {
          ...(product.extraData || {}),
          imageCoverRelationId: relation.id,
        },
      });
      await reloadProduct();
    } catch (e) {
      const msg = e?.response?.data?.['hydra:description']
        || e?.response?.data?.detail
        || e?.message
        || 'Erro ao salvar capa.';
      setActionStatus(msg);
    }
  }, [product, productActions, reloadProduct]);

  const syncProductCategories = async data => {
    const productId = extractId(data?.id || data?.['@id']);
    if (!productId) return;
    const productIri = `/products/${productId}`;
    const desiredCategoryIds = uniqueCategoryIds(selectedCategoryIds);
    const existingList = await productCategoryActions
      .getItems({ product: productIri, itemsPerPage: 300 })
      .catch(() => []);
    const allRelations = collectionFrom(existingList);
    const desiredSet = new Set(desiredCategoryIds);
    const keptCategoryIds = new Set();

    for (const relation of allRelations) {
      const relCategoryId = extractCategoryIdValue(relation?.category);
      const rid = String(relation?.id || relation?.['@id'] || '').replace(/\D/g, '');
      const shouldKeep = relCategoryId && desiredSet.has(relCategoryId) && !keptCategoryIds.has(relCategoryId);

      if (shouldKeep) {
        keptCategoryIds.add(relCategoryId);
      } else if (rid) {
        await productCategoryActions.remove(rid).catch(() => null);
      }
    }

    for (const categoryId of desiredCategoryIds) {
      if (keptCategoryIds.has(categoryId)) continue;

      await productCategoryActions.save({
        product: productIri,
        category: `/categories/${categoryId}`,
      }).catch(error => {
        const message = String(error?.message || error?.response?.data?.detail || '');
        if (!/unique|duplicate|duplic/i.test(message)) throw error;
      });
    }
  };

  const handleSave = async () => {
    if (!product) return;
    setActionStatus('');

    // Mapa campo → seção para abrir automaticamente em caso de erro
    const FIELD_SECTION = {
      product: 'identificacao',
      productUnit: 'preco',
      price: 'preco',
    };

    const errors = [];
    const sectionsWithError = new Set();

    const addError = (field, msg) => {
      errors.push(msg);
      if (FIELD_SECTION[field]) sectionsWithError.add(FIELD_SECTION[field]);
    };

    if (!String(product.product || '').trim())
      addError('product', 'Nome do produto é obrigatório.');
    if (!product.productUnit)
      addError('productUnit', 'Unidade de Medida é obrigatória.');
    const priceRaw = String(product.price ?? '').replace(',', '.');
    const priceVal = parseFloat(priceRaw);
    if (priceRaw === '' || isNaN(priceVal) || priceVal < 0)
      addError('price', 'Preço inválido (deve ser um número ≥ 0).');

    if (errors.length > 0) {
      setErrorSections(sectionsWithError);
      setOpenSections(prev => new Set([...prev, ...sectionsWithError]));
      setActionStatus(errors.join('\n'));
      return;
    }
    setErrorSections(new Set());

    const payload = { ...product };

    // Remove campos read-only / não mapeados no product:write
    delete payload.productFiles;
    delete payload.productCategories;
    delete payload.productCategory;
    // extraData é mantido — está em product:write e persiste via EAV

    // Converte valor para IRI; retorna null se vazio
    const toIri = (val, prefix) => {
      if (!val && val !== 0) return null;
      const s = String(val);
      if (s.startsWith('/')) return s;
      const id = s.replace(/[^0-9]/g, '');
      return id ? `${prefix}${id}` : null;
    };

    // company → IRI obrigatório (validação já passou, mas garantimos o IRI)
    const companySource = payload.company || currentCompany?.id;
    payload.company = toIri(companySource, '/people/');

    // productUnit → IRI obrigatório (validação já passou)
    payload.productUnit = toIri(payload.productUnit, '/product_unities/');

    // Campos de relação opcionais: se vazio, remove do payload (não envia null)
    const queueIri = toIri(payload.queue, '/queues/');
    if (queueIri) payload.queue = queueIri;
    else delete payload.queue;

    if (controlarEstoque) {
      const outIri = toIri(payload.defaultOutInventory, '/inventories/');
      if (outIri) payload.defaultOutInventory = outIri;
      else delete payload.defaultOutInventory;

      const inIri = toIri(payload.defaultInInventory, '/inventories/');
      if (inIri) payload.defaultInInventory = inIri;
      else delete payload.defaultInInventory;
    } else {
      payload.defaultOutInventory = null;
      payload.defaultInInventory = null;
    }

    // active → boolean
    payload.active = payload.active === true || payload.active === 1 || payload.active === '1' || String(payload.active).toLowerCase() === 'true';
    // featured → boolean
    payload.featured = payload.featured === true || payload.featured === 1;
    // productCondition → valor válido
    payload.productCondition = String(payload.productCondition || 'new').trim().toLowerCase() || 'new';
    // type → valor válido
    payload.type = String(payload.type || 'product').trim() || 'product';
    // description → nunca undefined
    payload.description = String(payload.description || '');
    // sku vazio → null (campo nullable no DB)
    if (!payload.sku) payload.sku = null;
    // price → float
    payload.price = priceVal;

    try {
      const data = await productActions.save(payload);
      if (data) {
        await syncProductCategories(data);
        const refreshed = await productActions.get(data.id || ProductId);
        setProduct(normalizeProductForForm(refreshed || data));
        setActionStatus(entityLabels.saveSuccess);
        if (onSaved) onSaved(refreshed || data);
        if (!propProductId) {
          const newId = data.id || (data['@id'] && String(data['@id']).split('/').pop());
          if (newId) {
            if (onSavedProductId) {
              onSavedProductId(newId);
            } else {
              const parent = navigation.getParent();
              if (parent && parent.setParams) parent.setParams({ ProductId: newId });
            }
          }
        }
      }
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.['hydra:description'] ||
        e?.message ||
        'Falha ao salvar produto.';
      setActionStatus(detail);
    }
  };

  const brandColors = useMemo(() => resolveThemePalette(), []);
  const [openSections, setOpenSections] = React.useState(new Set(['identificacao']));
  const [errorSections, setErrorSections] = React.useState(new Set());
  const isServiceProduct = product?.type === SERVICE_TYPE;
  const productUnitOptions = useMemo(
    () => buildProductUnitOptions(productUnitGetters.items, isServiceProduct),
    [isServiceProduct, productUnitGetters.items],
  );
  const productUnitLabel = isServiceProduct ? 'Unidade de cobrança *' : 'Unidade de Medida *';
  const productUnitPlaceholder = isServiceProduct
    ? 'Escolha como o serviço será cobrado'
    : 'Selecionar...';
  const productUnitHelperText = isServiceProduct
    ? (
      productUnitOptions.some(option => option.isRecommendedServiceUnit)
        ? 'Para serviços, prefira uma unidade de cobrança como mensal, hora, diária ou unitário.'
        : 'Para serviços, selecione a unidade de cobrança disponível para este cadastro.'
    )
    : '';
  const toggleSection = useCallback(key => setOpenSections(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  }), []);

  const fmtN = useCallback(v => {
    if (v === '' || v === null || v === undefined) return '';
    if (typeof v === 'number') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(v).replace('.', ',');
  }, []);

  useEffect(() => {
    if (!isServiceProduct || product?.productUnit || productUnitOptions.length === 0) {
      return;
    }

    const recommendedOption = findRecommendedServiceUnit(productUnitOptions);
    if (!recommendedOption) {
      return;
    }

    setProduct(prev => {
      if (!prev || prev.productUnit) {
        return prev;
      }

      return { ...prev, productUnit: String(recommendedOption.value) };
    });
  }, [isServiceProduct, product?.productUnit, productUnitOptions]);

  if (!product) return (
    <View style={inlineStyle_545_10}>
      <SkeletonTab />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {!productsStore.getters?.isLoading && <StateStore store="products" />}
      {!categoriesStore.getters?.isLoading && <StateStore store="categories" />}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {!!actionStatus && (
          <View style={[
            styles.statusBanner,
              actionStatus === entityLabels.saveSuccess ? styles.statusBannerSuccess : styles.statusBannerError,
          ]}>
            <MaterialCommunityIcons
              name={actionStatus === entityLabels.saveSuccess ? 'check-circle-outline' : 'alert-circle-outline'}
              size={16}
              color={actionStatus === entityLabels.saveSuccess ? '#166534' : '#9e1b1b'}
            />
            <Text style={[
              styles.statusBannerText,
              actionStatus === entityLabels.saveSuccess ? { color: '#166534' } : { color: '#9e1b1b' },
            ]}>{actionStatus}</Text>
          </View>
        )}

        {/* Seção: Identificação */}
        <SectionCard title="Identificação" icon="tag-outline" isOpen={openSections.has('identificacao')} hasError={errorSections.has('identificacao')} onToggle={() => toggleSection('identificacao')}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Nome *</Text>
            <TextInput
              value={String(product.product || '')}
              onChangeText={val => handleChange('product', val)}
              style={styles.textInput}
              placeholder={entityLabels.namePlaceholder}
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
              placeholder={entityLabels.descriptionPlaceholder}
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>SKU</Text>
            <TextInput
              value={String(product.sku || '')}
              onChangeText={val => handleChange('sku', val)}
              style={styles.textInput}
              placeholder="SKU"
              placeholderTextColor="#CBD5E1"
            />
          </View>
        </SectionCard>

        {/* Seção: Preço e Classificação */}
        <SectionCard title="Preço e Classificação" icon="currency-usd" isOpen={openSections.has('preco')} hasError={errorSections.has('preco')} onToggle={() => toggleSection('preco')}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Preço (R$) *</Text>
            <TextInput
              value={fmtN(product.price)}
              onChangeText={val => handleChange('price', val)}
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="0,00"
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <CategoryMultiSelectField
            label="Categorias"
            values={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            brandColors={brandColors}
            options={(categoryGetters.items || [])
              .map(opt => ({ value: extractCategoryIdValue(opt.id || opt['@id']), label: opt.name || String(opt.id) }))
              .filter(opt => opt.value)}
          />
          <SelectField
            label="Tipo"
            value={product.type || 'product'}
            onChange={val => handleChange('type', val)}
            brandColors={brandColors}
            options={getContextTypes()}
          />
          <SelectField
            label="Condição"
            value={product.productCondition || 'new'}
            onChange={val => handleChange('productCondition', val)}
            brandColors={brandColors}
            options={[
              { value: 'new', label: 'Novo' },
              { value: 'used', label: 'Usado' },
              { value: 'recondicioned', label: 'Recondicionado' },
            ]}
          />
          <SelectField
            label={productUnitLabel}
            value={product.productUnit || ''}
            onChange={val => handleChange('productUnit', val)}
            brandColors={brandColors}
            placeholder={productUnitPlaceholder}
            options={[
              { value: '', label: 'Selecionar...' },
              ...productUnitOptions.map(opt => ({ value: opt.value, label: opt.label })),
            ]}
          />
          {!!productUnitHelperText && (
            <Text style={styles.fieldHelperText}>{productUnitHelperText}</Text>
          )}
        </SectionCard>

        {/* Seção: Configurações */}
        <SectionCard title="Configurações" icon="cog-outline" isOpen={openSections.has('config')} hasError={errorSections.has('config')} onToggle={() => toggleSection('config')}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Ativo</Text>
            <Switch value={Boolean(product.active)} onValueChange={val => handleChange('active', val)} />
          </View>
          <View style={[styles.switchRow, styles.switchRowLast]}>
            <Text style={styles.switchLabel}>Destaque</Text>
            <Switch value={Boolean(product.featured)} onValueChange={val => handleChange('featured', val)} />
          </View>
          <View style={styles.switchRow}>
            <View style={inlineStyle_673_18}>
              <Text style={styles.switchLabel}>Controlar Estoque</Text>
              <Text style={inlineStyle_675_20}>
                Define local de entrada e saída para este produto
              </Text>
            </View>
            <Switch
              value={controlarEstoque}
              onValueChange={val => {
                setControlarEstoque(val);
                if (!val) {
                  handleChange('defaultOutInventory', '');
                  handleChange('defaultInInventory', '');
                }
              }}
            />
          </View>
          {controlarEstoque && (
            <>
              <SelectField
                label="Estoque de Saída *"
                value={product.defaultOutInventory || ''}
                onChange={val => handleChange('defaultOutInventory', val)}
                brandColors={brandColors}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt.id) })),
                ]}
              />
              <SelectField
                label="Estoque de Entrada *"
                value={product.defaultInInventory || ''}
                onChange={val => handleChange('defaultInInventory', val)}
                brandColors={brandColors}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt.id) })),
                ]}
              />
            </>
          )}
          <SelectField
            label="Fila"
            value={product.queue || ''}
            onChange={val => handleChange('queue', val)}
            brandColors={brandColors}
            options={[
              { value: '', label: 'Sem fila' },
              ...(queuesGetters.items || []).map(opt => ({ value: opt.id, label: opt.queue || opt.name || String(opt.id) })),
            ]}
          />
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Empresa</Text>
            <View style={styles.displayField}>
              <Text style={styles.displayFieldText}>
                {currentCompany?.name || (product.company ? String(product.company) : '—')}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Seção: Imagens */}
        {!!product?.id ? (
          <SectionCard title="Imagens" icon="image-multiple-outline" isOpen={openSections.has('imagens')} hasError={false} onToggle={() => toggleSection('imagens')}>
            <AttachmentManager
              entityType="product"
              entityId={product.id}
              attachments={product.productFiles || []}
              companyId={currentCompany?.id}
              context="products"
              coverRelationId={product?.extraData?.imageCoverRelationId}
              onChanged={reloadProduct}
              onCoverChanged={saveProductCover}
            />
          </SectionCard>
        ) : (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="image-off-outline" size={20} color="#94A3B8" />
            <Text style={styles.infoBoxText}>{entityLabels.imageDisabled}</Text>
          </View>
        )}

      </ScrollView>
      <View style={styles.saveBar}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: brandColors.primary }]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>{entityLabels.saveAction}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ProductForm;
