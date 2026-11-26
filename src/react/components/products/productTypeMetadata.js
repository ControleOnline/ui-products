export const PRODUCT_TYPE_CONFIG = {
  product: {
    label: 'Produto',
    pluralLabel: 'Produtos',
    backgroundToken: 'chipSelectedBackground',
    textToken: 'chipSelectedText',
  },
  service: {
    label: 'Serviço',
    pluralLabel: 'Serviços',
    backgroundToken: 'buttonBackgroundSecondary',
    textToken: 'buttonTextSecondary',
  },
  component: {
    label: 'Componente',
    pluralLabel: 'Componentes',
    backgroundToken: 'chipBackground',
    textToken: 'textWarning',
  },
  feedstock: {
    label: 'Matéria Prima',
    pluralLabel: 'Matérias-primas',
    backgroundToken: 'chipBackground',
    textToken: 'textSuccess',
  },
  package: {
    label: 'Embalagem',
    pluralLabel: 'Embalagens',
    backgroundToken: 'chipSelectedBackground',
    textToken: 'chipSelectedText',
  },
  custom: {
    label: 'Custom',
    pluralLabel: 'Customizados',
    backgroundToken: 'buttonBackgroundSecondary',
    textToken: 'buttonTextSecondary',
  },
  manufactured: {
    label: 'Fabricado',
    pluralLabel: 'Fabricados',
    backgroundToken: 'chipBackground',
    textToken: 'textWarning',
  },
  recipe: {
    label: 'Preparo',
    pluralLabel: 'Preparos',
    backgroundToken: 'chipBackground',
    textToken: 'textMuted',
  },
};

export const getProductTypeLabel = type =>
  PRODUCT_TYPE_CONFIG[type]?.label || String(type || '').trim() || '';

export const getProductTypePluralLabel = type =>
  PRODUCT_TYPE_CONFIG[type]?.pluralLabel || getProductTypeLabel(type);

export const resolveProductTypeTheme = (type, palette = {}) => {
  const typeConfig = PRODUCT_TYPE_CONFIG[type] || null;

  if (!typeConfig) {
    return null;
  }

  return {
    ...typeConfig,
    backgroundColor: palette[typeConfig.backgroundToken],
    textColor: palette[typeConfig.textToken],
  };
};
