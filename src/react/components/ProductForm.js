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
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import { useNavigation } from '@react-navigation/native';
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

const SkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={{ width, height, borderRadius: 7, backgroundColor: '#E2E8F0', marginBottom: mb }} />
);

const SkeletonTab = () => (
  <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
    <View style={{ height: 180, borderRadius: 16, backgroundColor: '#E2E8F0', marginBottom: 16 }} />
    {[1, 2, 3, 4].map(i => (
      <View key={i} style={{
        backgroundColor: '#fff', borderRadius: 12, marginBottom: 10,
        padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#E2E8F0', marginRight: 8 }} />
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

/* ─── SectionCard fora do componente pai para evitar remount a cada render ─── */
const SectionCard = ({ title, icon, isOpen, onToggle, hasError, children }) => (
  <View style={[styles.sectionCard, hasError && styles.sectionCardError]}>
    <TouchableOpacity style={styles.sectionCardHeader} onPress={onToggle} activeOpacity={0.7}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon && (
          <MaterialCommunityIcons
            name={hasError ? 'alert-circle' : icon}
            size={16}
            color={hasError ? '#EF4444' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.sectionCardTitle, hasError && styles.sectionCardTitleError]}>{title}</Text>
      </View>
      <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={hasError ? '#EF4444' : '#94A3B8'} />
    </TouchableOpacity>
    {isOpen && <View style={styles.sectionCardBody}>{children}</View>}
  </View>
);

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
  const [actionStatus, setActionStatus] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const isDesktop = width >= 768;

  const getData = useCallback(() => {
    if (ProductId) {
      productActions.get(ProductId).then(async data => {
        const normalized = normalizeProductForForm(data);
        setProduct(normalized);

        let existingCategoryId = extractCategoryId(data);

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
          company: currentCompany?.id || '',
          active: true,
          featured: false,
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

  const [listsRequested, setListsRequested] = useState({ units: false, queues: false, inventories: false });
  useEffect(() => {
    const companyId = currentCompany?.id;

    if (productUnitStore?.actions && (!productUnitGetters.items || productUnitGetters.items.length === 0) && !listsRequested.units) {
      setListsRequested(prev => ({ ...prev, units: true }));
      productUnitStore.actions.getItems({ company: companyId }).catch(() => {});
    }

    if (queuesStore?.actions && (!queuesGetters.items || queuesGetters.items.length === 0) && !listsRequested.queues) {
      setListsRequested(prev => ({ ...prev, queues: true }));
      queuesStore.actions.getItems({ company: companyId }).catch(() => {});
    }

    if (inventoriesStore?.actions && (!inventoriesGetters.items || inventoriesGetters.items.length === 0) && !listsRequested.inventories) {
      setListsRequested(prev => ({ ...prev, inventories: true }));
      inventoriesStore.actions.getItems({ company: companyId }).catch(() => {});
    }
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

  const syncProductCategory = async data => {
    if (!data?.id || !selectedCategoryId) return;
    const productId = String(data.id).replace(/\D/g, '');
    const categoryIri = `/categories/${String(selectedCategoryId).replace(/\D/g, '')}`;
    const productIri = `/products/${productId}`;
    const existingList = await productCategoryActions
      .getItems({ product: productIri })
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
      savedRelation?.id || savedRelation?.['@id'] || relationPayload.id || keeper?.id || keeper?.['@id'] || '',
    ).replace(/\D/g, '');
    const duplicated = allRelations.filter(rel => {
      const rid = String(rel?.id || rel?.['@id'] || '').replace(/\D/g, '');
      return rid && rid !== keeperId;
    });
    for (const relation of duplicated) {
      const rid = String(relation?.id || relation?.['@id'] || '').replace(/\D/g, '');
      if (rid) await productCategoryActions.remove(rid).catch(() => null);
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

    const outIri = toIri(payload.defaultOutInventory, '/inventories/');
    if (outIri) payload.defaultOutInventory = outIri;
    else delete payload.defaultOutInventory;

    const inIri = toIri(payload.defaultInInventory, '/inventories/');
    if (inIri) payload.defaultInInventory = inIri;
    else delete payload.defaultInInventory;

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
        await syncProductCategory(data);
        const refreshed = await productActions.get(data.id || ProductId);
        setProduct(normalizeProductForForm(refreshed || data));
        setActionStatus('Produto salvo.');
        if (!propProductId) {
          const newId = data.id || (data['@id'] && String(data['@id']).split('/').pop());
          if (newId) {
            const parent = navigation.getParent();
            if (parent && parent.setParams) parent.setParams({ ProductId: newId });
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

  if (!product) return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <SkeletonTab />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {!productsStore.getters?.isLoading && <StateStore store="products" />}
      {!categoriesStore.getters?.isLoading && <StateStore store="categories" />}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {!!product?.id && (
          <View style={styles.imageSection}>
            <Carousel images={product.productFiles || []} style={styles.carouselBox} />
          </View>
        )}

        {!!actionStatus && (
          <View style={[
            styles.statusBanner,
            actionStatus === 'Produto salvo.' ? styles.statusBannerSuccess : styles.statusBannerError,
          ]}>
            <MaterialCommunityIcons
              name={actionStatus === 'Produto salvo.' ? 'check-circle-outline' : 'alert-circle-outline'}
              size={16}
              color={actionStatus === 'Produto salvo.' ? '#166534' : '#9e1b1b'}
            />
            <Text style={[
              styles.statusBannerText,
              actionStatus === 'Produto salvo.' ? { color: '#166534' } : { color: '#9e1b1b' },
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
          <SelectField
            label="Categoria"
            value={selectedCategoryId || ''}
            onChange={val => setSelectedCategoryId(String(val || ''))}
            brandColors={brandColors}
            options={[
              { value: '', label: 'Sem categoria' },
              ...(categoryGetters.items || []).map(opt => ({ value: String(opt.id), label: opt.name || String(opt.id) })),
            ]}
          />
          <SelectField
            label="Tipo"
            value={product.type || 'product'}
            onChange={val => handleChange('type', val)}
            brandColors={brandColors}
            options={[
              { value: 'product', label: 'Produto' },
              { value: 'service', label: 'Serviço' },
              { value: 'component', label: 'Componente' },
              { value: 'feedstock', label: 'Matéria Prima' },
              { value: 'package', label: 'Embalagem' },
              { value: 'custom', label: 'Custom' },
              { value: 'manufactured', label: 'Fabricado' },
            ]}
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
            label="Unidade de Medida *"
            value={product.productUnit || ''}
            onChange={val => handleChange('productUnit', val)}
            brandColors={brandColors}
            options={[
              { value: '', label: 'Selecionar...' },
              ...(productUnitGetters.items || []).map(opt => ({ value: opt.id, label: opt.productUnit || opt.unit || String(opt.id) })),
            ]}
          />
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
          <SelectField
            label="Estoque de Saída"
            value={product.defaultOutInventory || ''}
            onChange={val => handleChange('defaultOutInventory', val)}
            brandColors={brandColors}
            options={[
              { value: '', label: 'Padrão' },
              ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt.id) })),
            ]}
          />
          <SelectField
            label="Estoque de Entrada"
            value={product.defaultInInventory || ''}
            onChange={val => handleChange('defaultInInventory', val)}
            brandColors={brandColors}
            options={[
              { value: '', label: 'Padrão' },
              ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt.id) })),
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
            <Text style={styles.infoBoxText}>Salve o produto para habilitar anexos de imagem.</Text>
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
          <Text style={styles.saveButtonText}>Salvar Produto</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 100 },

  imageSection: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#F1F5F9' },
  carouselBox: { flex: 1 },

  sectionCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  sectionCardError: { borderWidth: 1.5, borderColor: '#FCA5A5' },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sectionCardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  sectionCardTitle: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCardTitleError: { color: '#EF4444' },

  saveBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 14 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, fontSize: 15, color: '#0F172A' },
  textInputMultiline: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, fontSize: 15, color: '#0F172A', minHeight: 88, textAlignVertical: 'top' },

  selectButton: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 15, color: '#0F172A', flex: 1 },
  selectPlaceholder: { fontSize: 15, color: '#CBD5E1', flex: 1 },

  pickerModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '80%' },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerModalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  pickerModalClose: { padding: 4 },
  pickerModalList: { maxHeight: 360 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  pickerOptionActive: { backgroundColor: '#F0FDF4' },
  pickerOptionText: { fontSize: 15, color: '#334155' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  switchRowLast: { borderBottomWidth: 0, marginBottom: 8 },
  switchLabel: { fontSize: 15, color: '#334155', fontWeight: '500', flex: 1 },

  displayField: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 13 },
  displayFieldText: { fontSize: 15, color: '#64748B' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  statusBannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusBannerError: { backgroundColor: '#FFF3F3', borderColor: '#FECACA' },
  statusBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoBoxText: { color: '#94A3B8', fontSize: 14, flex: 1 },
});

export default ProductForm;
