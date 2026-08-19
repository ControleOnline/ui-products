/**
 * Factory for ProductForm save handler.
 */
export function createProductFormSaveHandler(deps) {
  const {
    getProduct,
    getSelectedCategoryIds,
    ProductId,
    currentCompany,
    context,
    getControlarEstoque,
    initialProviderId,
    productActions,
    productCategoryActions,
    productPeopleActions,
    findDuplicateFeedstockProduct,
    entityLabels,
    setProduct,
    setSelectedCategoryIds,
    setActionStatus,
    setErrorSections,
    setOpenSections,
    reloadProduct,
    navigation,
    onSaved,
    onSavedProductId,
    propProductId,
  } = deps;

  const {
    uniqueCategoryIds,
    extractId,
    extractCategoryIdValue,
    collectionFrom,
    extractCategoryIds,
    normalizeProductRelationId,
    mergeProductDraftIntoExisting,
    buildProductPeopleSupplierPayload,
    normalizeProductForForm,
  } = deps.helpers;

  return async function handleSave() {
    const product = getProduct();
    const selectedCategoryIds = getSelectedCategoryIds();
    const controlarEstoque = getControlarEstoque();
    if (!product) return;
    setActionStatus('');

    // Mapa campo → seção para abrir automaticamente em caso de erro
    const FIELD_SECTION = {
      product: 'identificacao',
      productUnit: 'preco',
      price: 'preco',
    };

    const errors = [];
    const sectionsWithError = new Set();

    const addError = (field, msg) => {
      errors.push(msg);
      if (FIELD_SECTION[field]) sectionsWithError.add(FIELD_SECTION[field]);
    };

    if (!String(product.product || '').trim())
      addError('product', 'Nome do produto é obrigatório.');
    if (!product.productUnit)
      addError('productUnit', 'Unidade de Medida é obrigatória.');
    const priceRaw = String(product.price ?? '').replace(',', '.');
    const priceVal = parseFloat(priceRaw);
    if (priceRaw === '' || isNaN(priceVal) || priceVal < 0)
      addError('price', 'Preço inválido (deve ser um número ≥ 0).');

    if (errors.length > 0) {
      setErrorSections(sectionsWithError);
      setOpenSections(prev => new Set([...prev, ...sectionsWithError]));
      setActionStatus(errors.join('\n'));
      return;
    }
    setErrorSections(new Set());

    const payload = { ...product };

    // Remove campos read-only / não mapeados no product:write
    delete payload.productFiles;
    delete payload.productCategories;
    delete payload.productCategory;
    // extraData é mantido — está em product:write e persiste via EAV

    // Converte valor para IRI; retorna null se vazio
    const toIri = (val, prefix) => {
      if (!val && val !== 0) return null;
      const s = String(val);
      if (s.startsWith('/')) return s;
      const id = s.replace(/[^0-9]/g, '');
      return id ? `${prefix}${id}` : null;
    };

    // company → IRI obrigatório (validação já passou, mas garantimos o IRI)
    const companySource = payload.company || currentCompany?.id;
    payload.company = toIri(companySource, '/people/');

    // productUnit → IRI obrigatório (validação já passou)
    payload.productUnit = toIri(payload.productUnit, '/product_unities/');

    // Campos de relação opcionais: se vazio, remove do payload (não envia null)
    const queueIri = toIri(payload.queue, '/queues/');
    if (queueIri) payload.queue = queueIri;
    else delete payload.queue;

    if (controlarEstoque) {
      const outIri = toIri(payload.defaultOutInventory, '/inventories/');
      if (outIri) payload.defaultOutInventory = outIri;
      else delete payload.defaultOutInventory;

      const inIri = toIri(payload.defaultInInventory, '/inventories/');
      if (inIri) payload.defaultInInventory = inIri;
      else delete payload.defaultInInventory;
    } else {
      payload.defaultOutInventory = null;
      payload.defaultInInventory = null;
    }

    // active → boolean
    payload.active = payload.active === true || payload.active === 1 || payload.active === '1' || String(payload.active).toLowerCase() === 'true';
    // featured → boolean
    payload.featured = payload.featured === true || payload.featured === 1;
    // productCondition → valor válido
    payload.productCondition = String(payload.productCondition || 'new').trim().toLowerCase() || 'new';
    // type → valor válido
    payload.type = String(payload.type || 'product').trim() || 'product';
    // description → nunca undefined
    payload.description = String(payload.description || '');
    // sku vazio → null (campo nullable no DB)
    if (!payload.sku) payload.sku = null;
    // price → float
    payload.price = priceVal;

    try {
      const duplicateCandidate = await findDuplicateFeedstockProduct(payload);
      const duplicateId = extractId(duplicateCandidate?.match);

      if (duplicateCandidate?.match && duplicateId && String(duplicateId) !== String(ProductId || '')) {
        if (ProductId) {
          setActionStatus('Já existe um ingrediente com este nome ou SKU.');
          return;
        }

        const mergedPayload = mergeProductDraftIntoExisting(duplicateCandidate.match, payload);
        payload.id = duplicateId;
        Object.assign(payload, mergedPayload, { id: duplicateId });
      }

      const data = await productActions.save(payload);
      if (data) {
        await syncProductCategories(data);
        let providerLinkError = '';
        if (!ProductId && initialProviderId) {
          const linkPayload = buildProductPeopleSupplierPayload({
            productData: data,
            initialProviderId,
          });
          if (linkPayload && productPeopleActions?.save) {
            try {
              await productPeopleActions.save(linkPayload);
            } catch (linkError) {
              providerLinkError =
                'Nao foi possivel vincular o fornecedor ao novo produto.';
            }
          }
        }
        const refreshed = await productActions.get(data.id || ProductId);
        setProduct(normalizeProductForForm(refreshed || data));
        setActionStatus(
          providerLinkError
            ? `Produto salvo, mas o fornecedor nao foi vinculado automaticamente. ${providerLinkError}`
            : duplicateCandidate?.match && !ProductId
              ? 'Ingrediente já existia. Cadastro existente atualizado.'
              : entityLabels.saveSuccess,
        );
        if (onSaved) onSaved(refreshed || data);
        if (!propProductId) {
          const newId = data.id || (data['@id'] && String(data['@id']).split('/').pop());
          if (newId) {
            if (onSavedProductId) {
              onSavedProductId(newId);
            } else {
              const parent = navigation.getParent();
              if (parent && parent.setParams) parent.setParams({ ProductId: newId });
            }
          }
        }
      }
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.['hydra:description'] ||
        e?.message ||
        'Falha ao salvar produto.';
      setActionStatus(detail);
    }
  
  };
}
