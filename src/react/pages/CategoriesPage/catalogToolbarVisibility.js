export const isCatalogToolbarHidden = params => {
    const asBoolean = value => {
      if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true'
      }

      return value === true
    }

    return (
      asBoolean(params?.hideCatalogToolbar) ||
      asBoolean(params?.hideBottomToolBar)
    )
}
