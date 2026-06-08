const PRODUCT_DETAILS_TAB_SUFFIX_REGEX =
  /\/(?:Dados|Fornecedores|Insumos|Grupos|Estoque|Vendas)$/i;

const normalizeProductId = value => String(value || '').replace(/\D+/g, '').trim();

export const buildProductDetailsBrowserPath = ({
  pathname,
  routeName,
  productId,
}) => {
  const normalizedPathname = String(pathname || '');

  if (!normalizedPathname.includes('/product-details')) {
    return normalizedPathname;
  }

  const strippedPathname = normalizedPathname.replace(PRODUCT_DETAILS_TAB_SUFFIX_REGEX, '');
  const resolvedProductId = normalizeProductId(productId);
  const useModalPath =
    String(routeName || '').trim() === 'ProductDetailsModal' ||
    strippedPathname.includes('/product-details-modal');
  const basePath = useModalPath ? '/product-details-modal' : '/product-details';

  if (!resolvedProductId) {
    return basePath;
  }

  return `${basePath}/${resolvedProductId}`;
};
