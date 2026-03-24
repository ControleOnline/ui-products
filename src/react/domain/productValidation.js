import { ProductConditions, ProductTypes } from './productContracts';

const isEmpty = value =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '');

const normalizeNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * Valida os campos obrigatórios do produto antes de salvar.
 * Verifica apenas campos que existem na tabela `product`.
 */
export const validateProductDraft = product => {
  const errors = [];

  if (!product) {
    errors.push({ field: 'product', code: 'missing_payload', message: 'Payload de produto ausente.' });
    return errors;
  }

  if (isEmpty(product.product)) {
    errors.push({ field: 'product', code: 'required', message: 'Nome do produto é obrigatório.' });
  }

  const price = normalizeNumber(product.price);
  if (price === null || price < 0) {
    errors.push({ field: 'price', code: 'invalid', message: 'Preço deve ser numérico e maior ou igual a zero.' });
  }

  if (!isEmpty(product.type) && !ProductTypes.includes(String(product.type))) {
    errors.push({ field: 'type', code: 'invalid_enum', message: 'Tipo de produto inválido.' });
  }

  if (!isEmpty(product.productCondition) && !ProductConditions.includes(String(product.productCondition))) {
    errors.push({ field: 'productCondition', code: 'invalid_enum', message: 'Condição do produto inválida.' });
  }

  return errors;
};
