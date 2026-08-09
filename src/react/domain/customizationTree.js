export const normalizeCustomizationId = value => {
  const clean = String(value || '').replace(/\D/g, '');
  return clean || null;
};

export const parseCustomizationNumber = value => {
  const parsed = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveCustomizationQuantity = value => {
  const quantity = parseCustomizationNumber(value);
  return quantity > 0 ? quantity : 1;
};

const parseNullableInteger = value => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveGroupMinimum = group => {
  const minimum = parseNullableInteger(group?.minimum);
  return minimum !== null && minimum > 0 ? minimum : group?.required ? 1 : 0;
};

export const resolveGroupMaximum = group => {
  const maximum = parseNullableInteger(group?.maximum);
  return maximum !== null && maximum > 0 ? maximum : null;
};

export const calculateCustomizationGroupPrice = (group, items) => {
  const prices = (Array.isArray(items) ? items : [])
    .filter(item => item?.selected)
    .map(item => parseCustomizationNumber(item?.price));

  if (prices.length === 0) {
    return 0;
  }

  switch (String(group?.priceCalculation || 'sum').trim().toLowerCase()) {
    case 'biggest':
      return Math.max(...prices);
    case 'average':
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    case 'free':
      return 0;
    default:
      return prices.reduce((sum, price) => sum + price, 0);
  }
};

export const calculateCustomizationTreePrice = unitTree => {
  const groups = new Map();

  (Array.isArray(unitTree) ? unitTree : []).forEach(node => {
    const groupId = normalizeCustomizationId(node?.productGroup) || 'unknown';
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId).push(node);
  });

  return Array.from(groups.values()).reduce((treeTotal, nodes) => {
    const firstDisplay = nodes[0]?.display || {};
    const directPrice = calculateCustomizationGroupPrice(
      {priceCalculation: firstDisplay.priceCalculation || 'sum'},
      nodes.map(node => ({
        selected: true,
        price: node?.display?.price || 0,
      })),
    );
    const descendantPrice = nodes.reduce(
      (sum, node) => sum + calculateCustomizationTreePrice(node?.sub_products),
      0,
    );

    return treeTotal + directPrice + descendantPrice;
  }, 0);
};

export const summarizeCustomizationTree = unitTree => {
  const groups = new Map();

  (Array.isArray(unitTree) ? unitTree : []).forEach(node => {
    const groupId = normalizeCustomizationId(node?.productGroup) || 'unknown';
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId).push(node);
  });

  return Array.from(groups.entries()).map(([groupId, nodes]) => ({
    groupId,
    groupName: nodes[0]?.display?.groupName || 'Opcoes',
    items: nodes.map(node => ({
      productId: normalizeCustomizationId(node?.product),
      productName: node?.display?.productName || 'Item selecionado',
      price: parseCustomizationNumber(node?.display?.price),
      groups: summarizeCustomizationTree(node?.sub_products),
    })),
  }));
};

export const summarizeCustomizationGroups = (groups, selectionsByGroup) =>
  (Array.isArray(groups) ? groups : []).map(group => {
    const groupId = normalizeCustomizationId(group?.id || group?.['@id']);
    const selectedItems = (selectionsByGroup?.[groupId] || []).filter(
      item => item?.selected,
    );
    const minimum = resolveGroupMinimum(group);
    const maximum = resolveGroupMaximum(group);
    const hasInvalidDescendant = selectedItems.some(item =>
      ['checking', 'pending', 'invalid'].includes(item?.nestedState),
    );
    const countIsValid =
      selectedItems.length >= minimum &&
      (maximum === null || selectedItems.length <= maximum);

    return {
      group,
      groupId,
      minimum,
      maximum,
      selectedCount: selectedItems.length,
      extraPrice:
        calculateCustomizationGroupPrice(group, selectedItems) +
        selectedItems.reduce(
          (sum, item) => sum + calculateCustomizationTreePrice(item?.sub_products),
          0,
        ),
      isValid: countIsValid && !hasInvalidDescendant,
      hasInvalidDescendant,
    };
  });

const serializeUnitNodes = (selectionsByGroup, groups = []) => {
  const groupsById = new Map(
    (Array.isArray(groups) ? groups : []).map(group => [
      normalizeCustomizationId(group?.id || group?.['@id']),
      group,
    ]),
  );

  return (
  Object.entries(selectionsByGroup || {}).flatMap(([groupId, items]) =>
    (Array.isArray(items) ? items : [])
      .filter(item => item?.selected)
      .map(item => {
        const normalizedGroupId = normalizeCustomizationId(groupId);
        const group = groupsById.get(normalizedGroupId) || {};
        const product = item?.productChild || {};

        return {
          product: normalizeCustomizationId(product?.id || product?.['@id']),
          productGroup: normalizedGroupId,
          quantity: resolveCustomizationQuantity(item?.quantity),
          sub_products: Array.isArray(item?.sub_products)
            ? item.sub_products
            : [],
          display: {
            groupName: group?.productGroup || 'Opcoes',
            productName: product?.product || product?.name || 'Item selecionado',
            price: parseCustomizationNumber(item?.price),
            priceCalculation: group?.priceCalculation || 'sum',
          },
        };
      })
      .filter(item => item.product && item.productGroup),
  ));
};

export const buildUnitCustomizationTree = (selectionsByGroup, groups = []) =>
  serializeUnitNodes(selectionsByGroup, groups);

const scaleNode = (node, parentQuantity) => {
  const quantity = resolveCustomizationQuantity(node?.quantity) * parentQuantity;

  return {
    product: normalizeCustomizationId(node?.product),
    productGroup: normalizeCustomizationId(node?.productGroup),
    quantity: Number(quantity.toFixed(6)),
    sub_products: (Array.isArray(node?.sub_products) ? node.sub_products : []).map(
      child => scaleNode(child, quantity),
    ),
  };
};

export const scaleCustomizationTree = (unitTree, rootQuantity = 1) =>
  (Array.isArray(unitTree) ? unitTree : []).map(node =>
    scaleNode(node, resolveCustomizationQuantity(rootQuantity)),
  );

export const serializeCustomizationTree = (
  selectionsByGroup,
  rootQuantity = 1,
) => scaleCustomizationTree(buildUnitCustomizationTree(selectionsByGroup), rootQuantity);

export const findUnitTreeNode = (unitTree, groupId, productId) =>
  (Array.isArray(unitTree) ? unitTree : []).find(
    node =>
      normalizeCustomizationId(node?.productGroup) ===
        normalizeCustomizationId(groupId) &&
      normalizeCustomizationId(node?.product) === normalizeCustomizationId(productId),
  ) || null;

export const buildUnitTreeFromOrderProductComponents = (
  components,
  parentQuantity = 1,
) => (Array.isArray(components) ? components : [])
  .map(component => {
    const quantity = resolveCustomizationQuantity(component?.quantity);
    return {
      product: normalizeCustomizationId(
        component?.product?.id || component?.product?.['@id'] || component?.product,
      ),
      productGroup: normalizeCustomizationId(
        component?.productGroup?.id ||
          component?.productGroup?.['@id'] ||
          component?.productGroup,
      ),
      quantity: Number(
        (quantity / resolveCustomizationQuantity(parentQuantity)).toFixed(6),
      ),
      sub_products: buildUnitTreeFromOrderProductComponents(
        component?.orderProductComponents,
        quantity,
      ),
    };
  })
  .filter(node => node.product && node.productGroup);
