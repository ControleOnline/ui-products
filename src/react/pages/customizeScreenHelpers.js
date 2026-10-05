// Pure helper functions for CustomizeScreen — extracted for QA line-limit compliance.
// Before: CustomizeScreen.js ~2064 lines. These helpers have no side effects.

import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {resolveFileImageUrl} from '@controleonline/ui-common/src/react/utils/fileUrl';

export const normalizeEntityId = value => {
  const clean = String(value || '').replace(/\D/g, '');
  return clean || null;
};

export const parseNumericValue = value => {
  const parsedValue = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const resolvePositiveQuantity = value => {
  const quantity = parseNumericValue(value);
  return quantity > 0 ? quantity : 1;
};

export const parseNullableInteger = value => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const parsedValue = parseInt(String(value), 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const formatOptionQuantity = value => {
  const quantity = parseNumericValue(value);

  if (Number.isInteger(quantity)) {
    return String(quantity);
  }

  return quantity.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const resolveEffectiveGroupMinimum = group => {
  const minimum = parseNullableInteger(group?.minimum);

  if (minimum !== null && minimum > 0) {
    return minimum;
  }

  return group?.required ? 1 : 0;
};

export const resolveEffectiveGroupMaximum = group => {
  const maximum = parseNullableInteger(group?.maximum);

  if (maximum !== null && maximum > 0) {
    return maximum;
  }

  return null;
};

export const resolvePriceCalculationLabel = value => {
  switch (String(value || '').trim().toLowerCase()) {
    case 'biggest':
      return 'maior valor';
    case 'average':
      return 'media';
    case 'free':
      return 'gratis';
    case 'sum':
    default:
      return 'soma';
  }
};

export const resolveCompactSelectionRuleLabel = (minimum, maximum) => {
  if (minimum > 0 && maximum !== null) {
    if (minimum === maximum) {
      return minimum === 1 ? '1 selecao' : `${minimum} selecoes`;
    }

    return `${minimum} a ${maximum} selecoes`;
  }

  if (minimum > 0) {
    return `min. ${minimum}`;
  }

  if (maximum !== null) {
    return `max. ${maximum}`;
  }

  return 'sem limite';
};

export const resolveCompactGroupStateLabel = summary => {
  const selectedCount = summary?.selectedCount || 0;
  const selectedLabel = `${selectedCount} selecionado${selectedCount === 1 ? '' : 's'}`;
  const extraPrice = parseNumericValue(summary?.extraPrice);

  if (extraPrice <= 0) {
    return selectedLabel;
  }

  return `${selectedLabel} • +${Formatter.formatMoney(extraPrice, 'R$', 'pt-br')}`;
};

export const calculateGroupExtraPrice = (group, groupItems) => {
  const selectedItems = (Array.isArray(groupItems) ? groupItems : []).filter(
    item => item?.selected,
  );
  const prices = selectedItems.map(item => parseNumericValue(item?.price));
  const priceCalculation = String(group?.priceCalculation || 'sum')
    .trim()
    .toLowerCase();

  if (prices.length === 0) {
    return 0;
  }

  switch (priceCalculation) {
    case 'biggest':
      return Math.max(...prices);
    case 'average':
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    case 'free':
      return 0;
    case 'sum':
    default:
      return prices.reduce((sum, price) => sum + price, 0);
  }
};

export const buildCoverUrl = product => {
  const files = Array.isArray(product?.productFiles) ? product.productFiles : [];
  const coverRelationId = normalizeEntityId(product?.extraData?.imageCoverRelationId);
  const filesByNewestRelation = [...files].sort(
    (left, right) =>
      parseNumericValue(normalizeEntityId(right?.id)) -
      parseNumericValue(normalizeEntityId(left?.id)),
  );
  const coverRelation =
    files.find(item => normalizeEntityId(item?.id) === coverRelationId && item?.file) ||
    filesByNewestRelation.find(item => item?.file);

  return coverRelation?.file ? resolveFileImageUrl(coverRelation.file) : null;
};

export const resolveProductInitial = product =>
  String(product?.product || product?.name || '?').trim().charAt(0).toUpperCase() ||
  '?';

export const normalizeOptionDedupKey = option => {
  const product = option?.value?.productChild || {};
  const name = String(product?.product || product?.name || option?.label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const price = parseNumericValue(option?.value?.price).toFixed(2);

  return `${name}:${price}`;
};

export const computeGroupSummary = (group, groupItems) => {
  const selectedOptions = (Array.isArray(groupItems) ? groupItems : []).filter(
    item => item?.selected,
  );
  const selectedCount = selectedOptions.length;
  const hasInvalidDescendant = selectedOptions.some(item =>
    ['checking', 'pending', 'invalid'].includes(item?.nestedState),
  );
  const minimum = resolveEffectiveGroupMinimum(group);
  const maximum = resolveEffectiveGroupMaximum(group);
  const groupId = String(
    normalizeEntityId(group?.id || group?.['@id']) || '',
  );

  // calculateCustomizationTreePrice imported separately by consumer
  const extraPrice = calculateGroupExtraPrice(group, groupItems);

  let validationMessage = '';
  if (selectedCount < minimum) {
    validationMessage =
      minimum === 1 ? 'Selecione 1 opcao.' : `Selecione pelo menos ${minimum} opcoes.`;
  } else if (maximum !== null && selectedCount > maximum) {
    validationMessage =
      maximum === 1
        ? 'Selecione no maximo 1 opcao.'
        : `Selecione no maximo ${maximum} opcoes.`;
  } else if (hasInvalidDescendant) {
    validationMessage = 'Conclua a personalizacao da opcao selecionada.';
  }

  let selectionRuleLabel = 'Sem limite de selecao.';
  if (minimum > 0 && maximum !== null) {
    selectionRuleLabel = `Escolha de ${minimum} ate ${maximum} opcoes.`;
  } else if (minimum > 0) {
    selectionRuleLabel = `Escolha no minimo ${minimum} opcoes.`;
  } else if (maximum !== null) {
    selectionRuleLabel = `Escolha ate ${maximum} opcoes.`;
  }

  return {
    groupId,
    groupName: group?.productGroup || `Grupo ${groupId}`,
    selectedCount,
    minimum,
    maximum,
    extraPrice,
    isValid: validationMessage === '',
    validationMessage,
    selectionRuleLabel,
    priceCalculationLabel: resolvePriceCalculationLabel(group?.priceCalculation),
    isRequired: minimum > 0 || !!group?.required,
    hasInvalidDescendant,
    selectedOptions,
  };
};

export const parseCsv = value =>
  String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

export const timeNow = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const isBetweenTime = (current, from, to) => {
  if (!from && !to) return true;
  if (!from || !to) return true;
  return current >= from && current <= to;
};
