import {normalizeEntityId} from './customizeScreenHelpers';

// Resolve all public customization reads from one company-bound Shop projection.
export function createShopCustomizationSource({companyId, productId, fetchCatalog}) {
  const rootId = normalizeEntityId(productId);
  const company = normalizeEntityId(companyId);
  const products = new Map();
  const groups = new Map();
  let pending;
  const indexProduct = product => {
    const id = normalizeEntityId(product?.id || product?.['@id']);
    if (!id || products.has(id)) return;
    products.set(id, product);
    for (const group of Array.isArray(product.productGroups) ? product.productGroups : []) {
      const groupId = normalizeEntityId(group.id || group['@id']);
      if (!groupId) continue;
      const items = (Array.isArray(group.products) ? group.products : []).map(item => ({
        ...item, productChild: item.product,
      }));
      groups.set(groupId, {...group, products: items});
      items.forEach(item => indexProduct(item.productChild));
    }
  };
  const load = () => {
    if (!pending) pending = (async () => {
      if (!rootId || !company) throw new Error('Empresa ou produto do cardapio nao identificado.');
      const payload = await fetchCatalog('product-showcases/catalog', {
        params: {company, integration_key: 'shop', id: rootId, itemsPerPage: 1},
      });
      const members = payload?.member || payload?.['hydra:member'];
      if (!Array.isArray(members)) throw new Error('Cardapio indisponivel.');
      const root = members.find(item => normalizeEntityId(item.id || item['@id']) === rootId);
      if (!root || !Array.isArray(root.productGroups) || root.customizationGroupsLoaded !== true) {
        throw new Error('Produto indisponivel no cardapio.');
      }
      indexProduct(root);
      return root;
    })().catch(error => { pending = null; throw error; });
    return pending;
  };
  const requireProduct = async id => {
    await load();
    const product = products.get(normalizeEntityId(id));
    if (!product) throw new Error('Produto indisponivel no cardapio.');
    return product;
  };
  return {
    load,
    productsActions: {
      get: requireProduct,
      getItems: async ({id}) => Promise.all((Array.isArray(id) ? id : [id]).map(requireProduct)),
    },
    productGroupActions: {
      getItems: async ({product}) => (await requireProduct(product)).productGroups || [],
    },
    productGroupProductActions: {
      getItems: async ({productGroup, productType}) => {
        await load();
        const group = groups.get(normalizeEntityId(productGroup));
        if (!group) throw new Error('Grupo indisponivel no cardapio.');
        return group.products.filter(item => !productType || item.productType === productType);
      },
    },
  };
}
