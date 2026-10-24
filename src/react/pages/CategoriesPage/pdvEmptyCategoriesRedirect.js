/**
 * PDV/catalog screens should list products when the company has no categories,
 * instead of rendering the DefaultTable "Empty" state.
 * Manager keeps the empty categories UI (create/import flows).
 */
export const shouldRedirectEmptyCategoriesToProducts = ({
  isManagerApp,
  data,
  fetchError = false,
} = {}) => {
  if (isManagerApp || fetchError) {
    return false;
  }

  return Array.isArray(data) && data.length === 0;
};
