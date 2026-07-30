const t = (type, key) => global.t?.t?.('categories', type, key)

export const buildCategoryToolbarActions = ({
  canUseCompany,
  hasActivePlatforms,
  isDownloadingCatalog,
  isLoadingMenuModels,
  marketplaceSyncingKey,
  onDownloadCatalog,
  onOpenAllProducts,
  onOpenIntegrations,
  onOpenMenuModelPicker,
  onSyncAllEligible,
}) => [
  {
    key: 'all-products',
    icon: 'package',
    label: t('button', 'allProducts'),
    disabled: !canUseCompany,
    onPress: onOpenAllProducts,
  },
  {
    key: 'menu-model',
    icon: 'file-text',
    label: isLoadingMenuModels
      ? t('label', 'loadingModels')
      : t('button', 'menuModel'),
    disabled: !canUseCompany,
    onPress: onOpenMenuModelPicker,
  },
  {
    key: 'integrations',
    icon: 'refresh-cw',
    label: t('button', 'integrations'),
    onPress: onOpenIntegrations,
  },
  {
    key: 'sync-eligible',
    icon: 'cloud',
    label: marketplaceSyncingKey === 'all'
      ? t('label', 'syncing')
      : t('button', 'syncEligible'),
    disabled: !hasActivePlatforms || marketplaceSyncingKey === 'all',
    onPress: onSyncAllEligible,
  },
  {
    key: 'download-menu',
    icon: 'download-cloud',
    label: isDownloadingCatalog
      ? t('label', 'downloading')
      : t('button', 'downloadMenu'),
    disabled: isDownloadingCatalog || !canUseCompany,
    onPress: onDownloadCatalog,
  },
]
