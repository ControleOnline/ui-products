import { normalizeProductRelationId } from '@controleonline/ui-products/src/react/domain/productRelations';

export const extractId = value => {
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

export const extractCategoryIdValue = value => {
  const id = extractId(value);
  return /^\d+$/.test(String(id || '')) ? String(id) : '';
};

export const collectionFrom = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.member)) return value.member;
  if (Array.isArray(value['hydra:member'])) return value['hydra:member'];
  return [value];
};

export const uniqueCategoryIds = ids => {
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

export const extractCategoryIds = data => {
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

export const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';

export const buildEntityLabels = context => context === 'supplies'
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

export const PRODUCT_TYPE_LABELS = {
  product: 'Produto',
  manufactured: 'Fabricado',
  custom: 'Customizável',
  service: 'Serviço',
  recipe: 'Preparo',
  feedstock: 'Matéria-prima',
  component: 'Componente operacional',
  package: 'Embalagem',
};

export const normalizeProductForForm = data => {
  if (!data) return data;
  return {
    ...data,
    productUnit: normalizeProductRelationId(data.productUnit),
    queue: normalizeProductRelationId(data.queue),
    company: normalizeProductRelationId(data.company),
    defaultOutInventory: normalizeProductRelationId(data.defaultOutInventory),
    defaultInInventory: normalizeProductRelationId(data.defaultInInventory),
  };
};

