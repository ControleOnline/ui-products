export const shouldUseInlinePdvCategories = ({
  appType,
  interactionMode,
  isMobileCatalog,
} = {}) =>
  String(appType || '').trim().toUpperCase() === 'POS' &&
  String(interactionMode || '').trim().toLowerCase() === 'pdv' &&
  isMobileCatalog === true
