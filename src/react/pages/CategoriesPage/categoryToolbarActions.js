const t = (type, key) => global.t?.t?.('categories', type, key)

export const buildCategoryToolbarActions = ({
  buttonPalette,
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
}) => {
  const primaryButtonStyle = {
    backgroundColor: buttonPalette?.buttonBackground,
    borderColor: buttonPalette?.buttonBorder,
  }
  const primaryLabelStyle = {
    color: buttonPalette?.buttonText,
  }
  const primaryIconColor = buttonPalette?.buttonIcon || buttonPalette?.buttonText

  return [
  {
    key: 'all-products',
    icon: 'package',
    color: primaryIconColor,
    style: primaryButtonStyle,
    labelStyle: primaryLabelStyle,
    label: t('button', 'allProducts'),
    disabled: !canUseCompany,
    onPress: onOpenAllProducts,
  },
  {
    key: 'menu-model',
    icon: 'file-text',
    color: primaryIconColor,
    style: primaryButtonStyle,
    labelStyle: primaryLabelStyle,
    label: isLoadingMenuModels
      ? t('label', 'loadingModels')
      : t('button', 'menuModel'),
    disabled: !canUseCompany,
    onPress: onOpenMenuModelPicker,
  },
  {
    key: 'integrations',
    icon: 'refresh-cw',
    color: primaryIconColor,
    style: primaryButtonStyle,
    labelStyle: primaryLabelStyle,
    label: t('button', 'integrations'),
    onPress: onOpenIntegrations,
  },
  {
    key: 'sync-eligible',
    icon: 'cloud',
    color: primaryIconColor,
    style: primaryButtonStyle,
    labelStyle: primaryLabelStyle,
    label: marketplaceSyncingKey === 'all'
      ? t('label', 'syncing')
      : t('button', 'syncEligible'),
    disabled: !hasActivePlatforms || marketplaceSyncingKey === 'all',
    onPress: onSyncAllEligible,
  },
  {
    key: 'download-menu',
    icon: 'download-cloud',
    color: primaryIconColor,
    style: primaryButtonStyle,
    labelStyle: primaryLabelStyle,
    label: isDownloadingCatalog
      ? t('label', 'downloading')
      : t('button', 'downloadMenu'),
    disabled: isDownloadingCatalog || !canUseCompany,
    onPress: onDownloadCatalog,
  },
]
}
