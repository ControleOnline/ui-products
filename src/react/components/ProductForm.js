import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '@store';
import {
  resolveInitialProviderId,
  buildProductPeopleSupplierPayload,
} from '../domain/productProviderLink';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { useNavigation } from '@react-navigation/native';
import {
  buildProductUnitOptions,
  findRecommendedServiceUnit,
  SERVICE_TYPE,
} from '../domain/serviceUnitOptions';
import {
  mergeProductDraftIntoExisting,
  resolveDuplicateProductCandidate,
} from '@controleonline/ui-products/src/react/domain/productDuplicates';
import {
  normalizeProductRelationId,
  resolveProductRelationOptionId,
} from '@controleonline/ui-products/src/react/domain/productRelations';
import {
  extractId,
  extractCategoryIdValue,
  collectionFrom,
  uniqueCategoryIds,
  extractCategoryIds,
  normalizeCatalogContext,
  PRODUCT_TYPE_LABELS,
  buildEntityLabels,
  normalizeProductForForm,
} from '../utils/productFormHelpers';
import { shouldReloadCategoryOptions } from '../utils/categorySelection';
import { createProductFormSaveHandler } from '../utils/productFormSave';
import ProductFormView from './ProductFormView';

const ProductForm = ({
  route,
  ProductId: propProductId,
  catalogContext,
  contextTypes,
  initialProductType,
  initialProvider: propInitialProvider,
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
  const productPeopleStore = useStore('product_people');
  const productUnitStore = useStore('product_unit');
  const queuesStore = useStore('queues');
  const inventoriesStore = useStore('inventories');
  const themeStore = useStore('theme');
  const { actions: productActions } = productsStore;
  const { actions: categoryActions, getters: categoryGetters } = categoriesStore;
  const { actions: productCategoryActions } = productCategoryStore;
  const { getters: peopleGetters } = peopleStore;
  const { actions: productPeopleActions } = productPeopleStore;
  const initialProviderId = resolveInitialProviderId(
    propInitialProvider,
    route?.params || {},
  );
  const { getters: productUnitGetters } = productUnitStore;
  const { getters: queuesGetters } = queuesStore;
  const { getters: inventoriesGetters } = inventoriesStore;
  const themeColors = themeStore?.getters?.colors || {};

  const { currentCompany } = peopleGetters;
  const entityLabels = useMemo(() => buildEntityLabels(context), [context]);
  const buttonPalette = useMemo(() => ({
    buttonBackground: themeColors.buttonBackground,
    buttonBorder: themeColors.buttonBorder,
    buttonText: themeColors.buttonText,
    buttonIcon: themeColors.buttonIcon || themeColors.buttonText,
  }), [themeColors.buttonBackground, themeColors.buttonBorder, themeColors.buttonIcon, themeColors.buttonText]);
  const switchPalette = useMemo(() => ({
    onTrack: themeColors.switchOnTrack,
    offTrack: themeColors.switchOffTrack,
    onThumb: themeColors.switchOnThumb,
    offThumb: themeColors.switchOffThumb,
    disabledTrack: themeColors.switchDisabledTrack,
    disabledThumb: themeColors.switchDisabledThumb,
  }), [
    themeColors.switchDisabledThumb,
    themeColors.switchDisabledTrack,
    themeColors.switchOffThumb,
    themeColors.switchOffTrack,
    themeColors.switchOnThumb,
    themeColors.switchOnTrack,
  ]);
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
            .getItems({ product: `/products/${cleanProductId}`})
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
      productUnitStore.actions.getItems({ people: peopleIRI}).catch(() => { });
    }

    if (queuesStore?.actions && !listsRequested.queues) {
      setListsRequested(prev => ({ ...prev, queues: true }));
      queuesStore.actions.getItems({ company: peopleIRI}).catch(() => { });
    }

    if (inventoriesStore?.actions && !listsRequested.inventories) {
      setListsRequested(prev => ({ ...prev, inventories: true }));
      inventoriesStore.actions.getItems({ people: peopleIRI}).catch(() => { });
    }
  }, [currentCompany?.id, listsRequested]);

  useEffect(() => {
    const queueOptions = queuesGetters.items || [];
    if (!product?.queue || queueOptions.length === 0) return;

    const resolvedQueueId = resolveProductRelationOptionId(
      product.queue,
      queueOptions,
      ['queue', 'name'],
    );

    if (String(resolvedQueueId) === String(product.queue)) return;
    setProduct(prev => ({ ...prev, queue: resolvedQueueId }));
  }, [product?.queue, queuesGetters.items]);

  useEffect(() => {
    const companyId = currentCompany?.id;
    if (!companyId) return;
    if (categoryGetters.isLoading) return;

    const needsRouteCategory = shouldReloadCategoryOptions({
      categories: categoryGetters.items,
      routeCategoryId: routeCategoryIdParam,
    });

    const requestKey = `${context}:${companyId}${needsRouteCategory ? `:route:${routeCategoryIdParam}` : ''}`;
    if (categoriesRequestKey === requestKey) return;

    setCategoriesRequestKey(requestKey);
    categoryActions.getItems({
      context,
      company: companyId,
      'order[sortOrder]': 'ASC',
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
    routeCategoryIdParam,
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

  const findDuplicateFeedstockProduct = useCallback(async draft => {
    if (context !== 'supplies') {
      return null;
    }

    if (String(draft?.type || '').trim().toLowerCase() !== 'feedstock') {
      return null;
    }

    const companyId = currentCompany?.id;
    if (!companyId || !productActions?.getItems) {
      return null;
    }

    const response = await productActions.getItems({
      company: companyId,
      type: ['feedstock'],
    }).catch(() => []);

    return resolveDuplicateProductCandidate({
      products: collectionFrom(response),
      draft,
      currentProductId: ProductId,
      type: 'feedstock',
    });
  }, [ProductId, context, currentCompany?.id, productActions]);

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
      .getItems({ product: productIri})
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

  const handleSave = useCallback(
    createProductFormSaveHandler({
      getProduct: () => product,
      getSelectedCategoryIds: () => selectedCategoryIds,
      ProductId,
      currentCompany,
      context,
      getControlarEstoque: () => controlarEstoque,
      initialProviderId,
      productActions,
      productCategoryActions,
      productPeopleActions,
      findDuplicateFeedstockProduct,
      entityLabels,
      setProduct,
      setSelectedCategoryIds,
      setActionStatus,
      setErrorSections,
      setOpenSections,
      reloadProduct,
      navigation,
      onSaved,
      onSavedProductId,
      propProductId,
      helpers: {
        uniqueCategoryIds, extractId, extractCategoryIdValue, collectionFrom,
        extractCategoryIds, normalizeProductRelationId, mergeProductDraftIntoExisting,
        buildProductPeopleSupplierPayload, normalizeProductForForm,
      },
    }),
    [product, selectedCategoryIds, ProductId, currentCompany, context, controlarEstoque,
      initialProviderId, productActions, productCategoryActions, productPeopleActions,
      findDuplicateFeedstockProduct, entityLabels, reloadProduct, navigation, onSaved,
      onSavedProductId, propProductId],
  );

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

  const viewModel = {
    product, productsStore, categoriesStore, actionStatus, entityLabels, openSections,
    errorSections, toggleSection, handleChange, brandColors, selectedCategoryIds,
    setSelectedCategoryIds, categoryGetters, extractCategoryIdValue, getContextTypes,
    fmtN, productUnitOptions, productUnitLabel, productUnitPlaceholder, productUnitHelperText,
    isServiceProduct, queuesGetters, inventoriesGetters, controlarEstoque, setControlarEstoque,
    switchPalette, buttonPalette, ProductId, currentCompany, saveProductCover, reloadProduct,
    handleSave,
  };

  return <ProductFormView {...viewModel} />;
};

export default ProductForm;
