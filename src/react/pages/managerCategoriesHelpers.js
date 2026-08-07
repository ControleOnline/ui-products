import { Platform } from 'react-native';

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 4px 14px rgba(15,23,42,0.06)' },
});

export const COLOR_PRESETS = [
  '#c10015',
  '#F97316',
  '#EAB308',
  '#10b981',
  '#14B8A6',
  '#0EA5E9',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
  '#0F172A',
];

export const normalizeEntityId = value => {
  if (value == null) {
    return '';
  }

  const rawValue =
    typeof value === 'object' ? value?.['@id'] || value?.id || value?.value || '' : value;

  return String(rawValue || '')
    .replace(/\D+/g, '')
    .trim();
};

export const buildCompanyIri = companyId => {
  const normalizedCompanyId = normalizeEntityId(companyId);
  return normalizedCompanyId ? `/people/${normalizedCompanyId}` : '';
};

export const buildCategoryIri = categoryId => {
  const normalizedCategoryId = normalizeEntityId(categoryId);
  return normalizedCategoryId ? `/categories/${normalizedCategoryId}` : '';
};

export const sortContextValues = (values, humanizeCategoryContext) =>
  [...values].sort((left, right) =>
    humanizeCategoryContext(left).localeCompare(humanizeCategoryContext(right), 'pt-BR', {
      sensitivity: 'base',
    }),
  );
