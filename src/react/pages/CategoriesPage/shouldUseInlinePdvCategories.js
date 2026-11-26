const shouldUseInlinePdvCategories = ({
  appType,
  interactionMode,
  isMobileCatalog,
  isWaiterPosMode,
} = {}) =>
  String(appType || '').trim().toUpperCase() === 'POS' &&
  String(interactionMode || '').trim().toLowerCase() === 'pdv' &&
  isMobileCatalog === true &&
  isWaiterPosMode === true;

module.exports = {shouldUseInlinePdvCategories};
