export const normalizeCustomizeTreeId = value => {
  const clean = String(value || '').replace(/\D/g, '');
  return clean || null;
};

export const parseCustomizeTreeNumber = value => {
  const parsedValue = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const resolveCustomizeTreeQuantity = value => {
  const quantity = parseCustomizeTreeNumber(value);
  return quantity > 0 ? quantity : 1;
};

export const getEmbeddedOrderProductComponents = orderProduct => {
  const collections = [
    orderProduct?.orderProductComponents,
    orderProduct?.order_product_components,
  ];

  for (const collection of collections) {
    if (Array.isArray(collection)) {
      return collection;
    }

    if (Array.isArray(collection?.['hydra:member'])) {
      return collection['hydra:member'];
    }

    if (Array.isArray(collection?.member)) {
      return collection.member;
    }
  }

  return [];
};

export const buildCustomizationNodeKey = (parentNodeKey, groupId, productId) =>
  `node::${String(parentNodeKey || 'root')}::${String(groupId || 'group')}::${String(productId || 'product')}`;

export const buildCustomizationSelectionKey = (nodeKey, groupId, productId) =>
  `selection::${String(nodeKey || 'root')}::${String(groupId || 'group')}::${String(productId || 'product')}`;

const roundCustomizationQuantity = value =>
  Number(parseCustomizeTreeNumber(value).toFixed(2));

const normalizeReferenceValue = value => {
  const normalizedId = normalizeCustomizeTreeId(value);
  return normalizedId ? Number(normalizedId) : value;
};

export const buildExistingCustomizationTree = ({
  orderProduct,
  rootNodeKey = 'root',
  rootQuantity = 1,
} = {}) => {
  const existingSelectionsByNode = {};
  const childNodeBySelectionKey = {};
  const nodeProductsByKey = {
    [rootNodeKey]: {
      nodeKey: rootNodeKey,
      product: orderProduct?.product || null,
      productId: normalizeCustomizeTreeId(
        orderProduct?.product?.id ||
          orderProduct?.product?.['@id'] ||
          orderProduct?.product,
      ),
      parentNodeKey: null,
    },
  };

  const registerSelection = (nodeKey, groupId, productId, quantity) => {
    if (!existingSelectionsByNode[nodeKey]) {
      existingSelectionsByNode[nodeKey] = {};
    }

    if (!existingSelectionsByNode[nodeKey][groupId]) {
      existingSelectionsByNode[nodeKey][groupId] = {};
    }

    existingSelectionsByNode[nodeKey][groupId][productId] = {
      selected: true,
      quantity: roundCustomizationQuantity(quantity),
    };
  };

  const visitNode = (parentOrderProduct, parentNodeKey, parentQuantity) => {
    getEmbeddedOrderProductComponents(parentOrderProduct).forEach(component => {
      const groupId = normalizeCustomizeTreeId(
        component?.productGroup?.id ||
          component?.productGroup?.['@id'] ||
          component?.productGroup,
      );
      const product = component?.product || null;
      const productId = normalizeCustomizeTreeId(
        product?.id || product?.['@id'] || product,
      );

      if (!groupId || !productId) {
        return;
      }

      const localQuantity =
        resolveCustomizeTreeQuantity(component?.quantity) /
        resolveCustomizeTreeQuantity(parentQuantity);
      const resolvedComponentQuantity = resolveCustomizeTreeQuantity(
        component?.quantity,
      );

      registerSelection(parentNodeKey, groupId, productId, localQuantity);

      const selectionKey = buildCustomizationSelectionKey(
        parentNodeKey,
        groupId,
        productId,
      );
      const childNodeKey = buildCustomizationNodeKey(
        parentNodeKey,
        groupId,
        productId,
      );

      childNodeBySelectionKey[selectionKey] = childNodeKey;
      nodeProductsByKey[childNodeKey] = {
        nodeKey: childNodeKey,
        product,
        productId,
        parentNodeKey,
      };

      visitNode(component, childNodeKey, resolvedComponentQuantity);
    });
  };

  visitNode(orderProduct, rootNodeKey, rootQuantity);

  return {
    existingSelectionsByNode,
    childNodeBySelectionKey,
    nodeProductsByKey,
  };
};

export const buildRecursiveSubProducts = ({
  rootNodeKey = 'root',
  groupsByNode = {},
  childNodeBySelectionKey = {},
  rootQuantity = 1,
} = {}) => {
  const visitNode = (nodeKey, parentQuantity) => {
    const currentGroups = groupsByNode[nodeKey] || {};

    return Object.entries(currentGroups).flatMap(([groupId, groupItems]) =>
      (Array.isArray(groupItems) ? groupItems : [])
        .filter(item => item?.selected)
        .map(item => {
          const productId = normalizeCustomizeTreeId(
            item?.productChild?.id ||
              item?.productChild?.['@id'] ||
              item?.productChild,
          );
          const selectionKey = buildCustomizationSelectionKey(
            nodeKey,
            groupId,
            productId,
          );
          const nextQuantity = roundCustomizationQuantity(
            resolveCustomizeTreeQuantity(item?.quantity) *
              resolveCustomizeTreeQuantity(parentQuantity),
          );
          const nestedSubProducts = childNodeBySelectionKey[selectionKey]
            ? visitNode(childNodeBySelectionKey[selectionKey], nextQuantity)
            : [];
          const subProduct = {
            product: normalizeReferenceValue(
              item?.productChild?.['@id'] || item?.productChild?.id || productId,
            ),
            productGroup: normalizeReferenceValue(groupId),
            quantity: nextQuantity,
          };

          if (nestedSubProducts.length > 0) {
            subProduct.sub_products = nestedSubProducts;
          }

          return subProduct;
        }),
    );
  };

  return visitNode(rootNodeKey, rootQuantity);
};
