export const SERVICE_TYPE = 'service';

const SERVICE_BILLING_PATTERNS = [
  { pattern: /mens|month/, priority: 0 },
  { pattern: /seman|week/, priority: 1 },
  { pattern: /quinzen/, priority: 2 },
  { pattern: /bimens|bimes|bimestre/, priority: 3 },
  { pattern: /trimes|quarter/, priority: 4 },
  { pattern: /semes/, priority: 5 },
  { pattern: /anual|year/, priority: 6 },
  { pattern: /hora|hour/, priority: 7 },
  { pattern: /diar|day/, priority: 8 },
  { pattern: /unitar|execucao unica|execucao unica|execucao|avuls|unic[ao]?|^un$|und/, priority: 9 },
  { pattern: /atend|sess/, priority: 10 },
];

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

  const match = SERVICE_BILLING_PATTERNS.find(({ pattern }) => pattern.test(normalized));
  if (match) {
    return match.priority;
  }

  return 100;
};

export const isServiceBillingUnit = label => (
  getServiceUnitPriority(label) < 100
);

export const buildProductUnitOptions = (items, isServiceProduct, selectedValue = null) => {
  const options = (items || []).map(option => {
    const label = getUnitOptionLabel(option);
    const servicePriority = getServiceUnitPriority(label);

    return {
      value: option.id,
      label,
      servicePriority,
      isServiceBillingUnit: servicePriority < 100,
      isRecommendedServiceUnit: servicePriority < 100,
    };
  });

  if (!isServiceProduct) {
    return options;
  }

  const normalizedSelectedValue = String(selectedValue || '');
  const filteredOptions = options.filter(option => (
    option.isServiceBillingUnit ||
    String(option.value) === normalizedSelectedValue
  ));

  return [...filteredOptions].sort((left, right) => {
    if (left.servicePriority !== right.servicePriority) {
      return left.servicePriority - right.servicePriority;
    }

    return left.label.localeCompare(right.label, 'pt-BR');
  });
};

export const findRecommendedServiceUnit = options => (
  (options || []).find(option => option.isRecommendedServiceUnit) || null
);
