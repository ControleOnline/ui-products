const t = (type, key) => global.t?.t?.('categories', type, key)

export const buildCategoryToolbarActions = ({
  canUseCompany,
  hasActivePlatforms,
  isDownloadingCatalog,
  isDownloadingNormalizedCatalog,
  isLoadingMenuModels,
  marketplaceSyncingKey,
  onDownloadCatalog,
  onDownloadNormalizedCatalog,
  onImport,
  onOpenIntegrations,
  onOpenMenuModelPicker,
  onSyncAllEligible,
}) => [
  {
    key: 'import-csv',
    icon: 'upload',
    label: t('button', 'importCsv'),
    onPress: onImport,
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
    key: 'export-csv',
    icon: 'download',
    label: isDownloadingNormalizedCatalog
      ? t('label', 'exporting')
      : t('button', 'exportCsv'),
    disabled: isDownloadingNormalizedCatalog || !canUseCompany,
    onPress: onDownloadNormalizedCatalog,
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
