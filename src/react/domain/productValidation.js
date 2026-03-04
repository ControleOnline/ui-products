import {
  ProductCanonicalFields,
  ProductConditions,
  ProductLifecycleStatuses,
  ProductTypes,
} from './productContracts';

const isEmpty = value =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '');

const normalizeNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const normalizeDigits = value => String(value || '').replace(/\D/g, '');

const isValidEanGtin = value => {
  const digits = normalizeDigits(value);
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const reversed = digits
    .split('')
    .reverse()
    .map(d => parseInt(d, 10));
  const checkDigit = reversed[0];
  const sum = reversed
    .slice(1)
    .reduce((acc, digit, idx) => acc + digit * (idx % 2 === 0 ? 3 : 1), 0);
  const calculated = (10 - (sum % 10)) % 10;
  return checkDigit === calculated;
};

const physicalProductTypes = ['product', 'manufactured', 'feedstock', 'component', 'package'];

const extractFiscal = product => product?.extraData?.fiscal || {};
const extractStock = product => product?.extraData?.stock || {};
const extractCodes = product => (Array.isArray(product?.extraData?.codes) ? product.extraData.codes : []);
const extractStockByInventory = product => product?.extraData?.stockByInventory || {};
const extractPricing = product => product?.extraData?.pricing || {};
const PricingSources = ['manual', 'auto_bom'];
const PricingSyncModes = ['manual', 'suggest', 'auto_apply'];

export const validateProductDraft = product => {
  const errors = [];
  if (!product) {
    errors.push({ field: 'product', code: 'missing_payload', message: 'Payload de produto ausente.' });
    return errors;
  }

  if (isEmpty(product.product)) {
    errors.push({ field: 'product', code: 'required', message: 'Nome do produto e obrigatorio.' });
  }

  const price = normalizeNumber(product.price);
  if (price === null || price < 0) {
    errors.push({ field: 'price', code: 'invalid', message: 'Preco deve ser numerico e maior ou igual a zero.' });
  }

  if (!isEmpty(product.type) && !ProductTypes.includes(String(product.type))) {
    errors.push({ field: 'type', code: 'invalid_enum', message: 'Tipo de produto invalido.' });
  }

  if (
    !isEmpty(product.productCondition) &&
    !ProductConditions.includes(String(product.productCondition))
  ) {
    errors.push({
      field: 'productCondition',
      code: 'invalid_enum',
      message: 'Condicao do produto invalida.',
    });
  }

  const lifecycleStatus = String(product?.extraData?.lifecycle?.status || '').toLowerCase();
  if (lifecycleStatus && !ProductLifecycleStatuses.includes(lifecycleStatus)) {
    errors.push({
      field: 'extraData.lifecycle.status',
      code: 'invalid_enum',
      message: 'Status de ciclo de vida invalido.',
    });
  }

  const codes = extractCodes(product);
  const keySet = new Set();
  const primaryByType = {};
  codes.forEach((code, idx) => {
    const type = String(code?.type || code?.codeType || '').trim().toLowerCase();
    const value = String(code?.value || code?.codeValue || '').trim();
    const channel = String(code?.channel || '').trim().toLowerCase();
    if (!type || !value) return;
    const key = `${type}::${channel}::${value}`;
    if (keySet.has(key)) {
      errors.push({
        field: `extraData.codes[${idx}]`,
        code: 'duplicate_code',
        message: `Código duplicado para tipo ${type}${channel ? ` no canal ${channel}` : ''}.`,
      });
    }
    keySet.add(key);

    if (type === 'ean' && !isValidEanGtin(value)) {
      errors.push({
        field: `extraData.codes[${idx}]`,
        code: 'invalid_ean',
        message: 'EAN/GTIN inválido. Revise o código e dígito verificador.',
      });
    }

    if (code?.isPrimary) {
      if (primaryByType[type]) {
        errors.push({
          field: `extraData.codes[${idx}]`,
          code: 'multiple_primary',
          message: `Apenas um código principal é permitido para o tipo ${type}.`,
        });
      }
      primaryByType[type] = true;
    }
  });

  const pricing = extractPricing(product);
  const source = String(pricing?.source || '').trim().toLowerCase();
  if (source && !PricingSources.includes(source)) {
    errors.push({
      field: 'extraData.pricing.source',
      code: 'invalid_enum',
      message: 'Fonte de custo inválida.',
    });
  }
  const syncMode = String(pricing?.syncMode || '').trim().toLowerCase();
  if (syncMode && !PricingSyncModes.includes(syncMode)) {
    errors.push({
      field: 'extraData.pricing.syncMode',
      code: 'invalid_enum',
      message: 'Modo de sincronização de custo inválido.',
    });
  }
  const markup = normalizeNumber(pricing?.markup);
  if (markup !== null && markup < 0) {
    errors.push({
      field: 'extraData.pricing.markup',
      code: 'invalid_range',
      message: 'Markup não pode ser negativo.',
    });
  }
  const marginTarget = normalizeNumber(pricing?.marginTarget);
  if (marginTarget !== null && (marginTarget < 0 || marginTarget >= 100)) {
    errors.push({
      field: 'extraData.pricing.marginTarget',
      code: 'invalid_range',
      message: 'Margem alvo deve estar entre 0 e 99.99.',
    });
  }
  const minMarginPct = normalizeNumber(pricing?.minMarginPct);
  if (minMarginPct !== null && (minMarginPct < 0 || minMarginPct >= 100)) {
    errors.push({
      field: 'extraData.pricing.minMarginPct',
      code: 'invalid_range',
      message: 'Margem mínima aceitável deve estar entre 0 e 99.99.',
    });
  }
  if (marginTarget !== null && minMarginPct !== null && marginTarget < minMarginPct) {
    errors.push({
      field: 'extraData.pricing.marginTarget',
      code: 'below_min_margin',
      message: 'Margem alvo abaixo da margem mínima aceitável.',
    });
  }
  const channelPolicies = Array.isArray(pricing?.channelPolicies) ? pricing.channelPolicies : [];
  const channelSet = new Set();
  channelPolicies.forEach((policy, idx) => {
    const channel = String(policy?.channel || '').trim().toLowerCase();
    if (!channel) return;
    if (channelSet.has(channel)) {
      errors.push({
        field: `extraData.pricing.channelPolicies[${idx}]`,
        code: 'duplicate_channel',
        message: `Canal duplicado na política de preço: ${channel}.`,
      });
    }
    channelSet.add(channel);
    const commissionPct = normalizeNumber(policy?.commissionPct);
    if (commissionPct !== null && (commissionPct < 0 || commissionPct >= 100)) {
      errors.push({
        field: `extraData.pricing.channelPolicies[${idx}].commissionPct`,
        code: 'invalid_range',
        message: `Comissão inválida no canal ${channel}.`,
      });
    }
    const targetMarginPct = normalizeNumber(policy?.targetMarginPct);
    if (targetMarginPct !== null && (targetMarginPct < 0 || targetMarginPct >= 100)) {
      errors.push({
        field: `extraData.pricing.channelPolicies[${idx}].targetMarginPct`,
        code: 'invalid_range',
        message: `Margem alvo inválida no canal ${channel}.`,
      });
    }
  });

  return errors;
};

export const validateProductForPublish = (product, options = {}) => {
  const errors = [...validateProductDraft(product)];
  const categoryId =
    options.categoryId ||
    product?.categoryId ||
    product?.productCategory?.category?.id ||
    product?.productCategory?.category?.['@id'] ||
    product?.category?.id ||
    product?.category?.['@id'] ||
    null;

  Object.entries(ProductCanonicalFields).forEach(([field, meta]) => {
    if (!meta.requiredForPublish) return;
    if (field === 'categoryId') {
      if (isEmpty(categoryId)) {
        errors.push({
          field,
          code: 'required_for_publish',
          message: 'Categoria e obrigatoria para publicar o produto.',
        });
      }
      return;
    }
    if (isEmpty(product?.[field])) {
      errors.push({
        field,
        code: 'required_for_publish',
        message: `Campo obrigatorio para publicacao: ${field}.`,
      });
    }
  });

  const type = String(product?.type || '').toLowerCase();
  const fiscal = extractFiscal(product);
  const stock = extractStock(product);
  const stockByInventory = extractStockByInventory(product);
  const controlsStock = Boolean(stock.controlsStock || product?.extraData?.controlsStock);

  if (physicalProductTypes.includes(type)) {
    if (isEmpty(fiscal.ncm)) {
      errors.push({
        field: 'extraData.fiscal.ncm',
        code: 'required_for_publish',
        message: 'NCM e obrigatorio para publicacao de produto fisico.',
      });
    }
    if (isEmpty(fiscal.cfop)) {
      errors.push({
        field: 'extraData.fiscal.cfop',
        code: 'required_for_publish',
        message: 'CFOP e obrigatorio para publicacao de produto fisico.',
      });
    }
    if (isEmpty(fiscal.origin)) {
      errors.push({
        field: 'extraData.fiscal.origin',
        code: 'required_for_publish',
        message: 'Origem fiscal e obrigatoria para publicacao de produto fisico.',
      });
    }

    const ncmDigits = normalizeDigits(fiscal.ncm);
    if (ncmDigits.length > 0 && ncmDigits.length !== 8) {
      errors.push({
        field: 'extraData.fiscal.ncm',
        code: 'invalid_format',
        message: 'NCM deve conter 8 dígitos.',
      });
    }

    const cestDigits = normalizeDigits(fiscal.cest);
    if (cestDigits.length > 0 && cestDigits.length !== 7) {
      errors.push({
        field: 'extraData.fiscal.cest',
        code: 'invalid_format',
        message: 'CEST deve conter 7 dígitos.',
      });
    }

    const cfopDigits = normalizeDigits(fiscal.cfop);
    if (cfopDigits.length > 0 && cfopDigits.length !== 4) {
      errors.push({
        field: 'extraData.fiscal.cfop',
        code: 'invalid_format',
        message: 'CFOP deve conter 4 dígitos.',
      });
    }

    const fiscalOrigin = String(fiscal.origin ?? '').trim();
    if (fiscalOrigin && !['0', '1', '2', '3', '4', '5', '6', '7', '8'].includes(fiscalOrigin)) {
      errors.push({
        field: 'extraData.fiscal.origin',
        code: 'invalid_value',
        message: 'Origem fiscal deve estar entre 0 e 8.',
      });
    }

    ['icms', 'pis', 'cofins', 'ipi'].forEach(taxField => {
      const tax = normalizeNumber(fiscal[taxField]);
      if (tax !== null && (tax < 0 || tax > 100)) {
        errors.push({
          field: `extraData.fiscal.${taxField}`,
          code: 'invalid_range',
          message: `${taxField.toUpperCase()} deve estar entre 0 e 100.`,
        });
      }
    });
  }

  if (controlsStock) {
    if (isEmpty(product?.defaultOutInventory) && isEmpty(product?.defaultInInventory)) {
      errors.push({
        field: 'defaultInventory',
        code: 'required_for_stock_control',
        message: 'Defina inventario padrao de entrada/saida quando controla estoque estiver ativo.',
      });
    }

    const inventoryEntries = Object.entries(stockByInventory || {});
    if (inventoryEntries.length === 0) {
      errors.push({
        field: 'extraData.stockByInventory',
        code: 'required_for_stock_control',
        message: 'Configure parâmetros mínimos por inventário quando controla estoque estiver ativo.',
      });
    }

    inventoryEntries.forEach(([inventoryId, policy], idx) => {
      const pMin = normalizeNumber(policy?.minimum);
      const pMax = normalizeNumber(policy?.maximum);
      const pReorder = normalizeNumber(policy?.reorderPoint);

      if (pMin !== null && pMin < 0) {
        errors.push({
          field: `extraData.stockByInventory.${inventoryId}.minimum`,
          code: 'invalid',
          message: `Estoque mínimo inválido no inventário ${inventoryId}.`,
        });
      }
      if (pMax !== null && pMax < 0) {
        errors.push({
          field: `extraData.stockByInventory.${inventoryId}.maximum`,
          code: 'invalid',
          message: `Estoque máximo inválido no inventário ${inventoryId}.`,
        });
      }
      if (pMin !== null && pMax !== null && pMin > pMax) {
        errors.push({
          field: `extraData.stockByInventory.${inventoryId}`,
          code: 'invalid_range',
          message: `Mínimo maior que máximo no inventário ${inventoryId}.`,
        });
      }
      if (
        pReorder !== null &&
        pMin !== null &&
        pMax !== null &&
        (pReorder < pMin || pReorder > pMax)
      ) {
        errors.push({
          field: `extraData.stockByInventory.${inventoryId}.reorderPoint`,
          code: 'invalid_range',
          message: `Ponto de reposição fora da faixa no inventário ${inventoryId}.`,
        });
      }
      if (idx > 1000) return;
    });
  }

  return errors;
};
