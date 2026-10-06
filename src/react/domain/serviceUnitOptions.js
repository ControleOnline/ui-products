export const SERVICE_TYPE = 'service';

export const normalizeUnitLabel = value => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

export const getUnitOptionLabel = option => (
  option?.productUnit ||
  option?.unit ||
  String(option?.id || '')
);

export const getServiceUnitPriority = label => {
  const normalized = normalizeUnitLabel(label);

  if (!normalized) return 100;
  if (normalized.includes('mens') || normalized.includes('month') || normalized.includes('mes')) return 0;
  if (normalized.includes('semana') || normalized.includes('week')) return 1;
  if (normalized.includes('hora') || normalized.includes('hour')) return 2;
  if (normalized.includes('diar') || normalized.includes('dia') || normalized.includes('day')) return 3;
  if (normalized.includes('unitar') || normalized === 'un' || normalized.includes('und')) return 4;
  if (normalized.includes('atend') || normalized.includes('sess')) return 5;

  return 100;
};

export const isServiceBillingUnit = label => getServiceUnitPriority(label) < 100;

export const buildProductUnitOptions = (items, isServiceProduct, currentUnitLabel) => {
  const currentNormalized = normalizeUnitLabel(currentUnitLabel);

  const options = (items || []).map(option => {
    const label = getUnitOptionLabel(option);
    const servicePriority = getServiceUnitPriority(label);

    return {
      value: option.id,
      label,
      servicePriority,
      isRecommendedServiceUnit: servicePriority < 100,
    };
  });

  if (!isServiceProduct) {
    return options;
  }

  const filtered = options.filter(option => (
    option.isRecommendedServiceUnit ||
    (currentNormalized && normalizeUnitLabel(option.label) === currentNormalized)
  ));

  return [...filtered].sort((left, right) => {
    if (left.servicePriority !== right.servicePriority) {
      return left.servicePriority - right.servicePriority;
    }

    return left.label.localeCompare(right.label, 'pt-BR');
  });
};

export const findRecommendedServiceUnit = options => (
  (options || []).find(option => option.isRecommendedServiceUnit) || null
);
