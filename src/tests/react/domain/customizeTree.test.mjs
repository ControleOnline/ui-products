import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCustomizationNodeKey,
  buildCustomizationSelectionKey,
  buildExistingCustomizationTree,
  buildRecursiveSubProducts,
} from '../../../react/domain/customizeTree.js';

test('buildExistingCustomizationTree normalizes nested component quantities per parent item', () => {
  const rootNodeKey = 'root:900';
  const childNodeKey = buildCustomizationNodeKey(rootNodeKey, '10', '200');
  const selectionKey = buildCustomizationSelectionKey(rootNodeKey, '10', '200');
  const orderProduct = {
    quantity: 2,
    product: {id: 900, product: 'Combo Gyros'},
    orderProductComponents: [
      {
        quantity: 6,
        productGroup: {id: 10, productGroup: 'Batata'},
        product: {id: 200, product: 'Batata Rustica'},
        orderProductComponents: [
          {
            quantity: 6,
            productGroup: {id: 11, productGroup: 'Molho'},
            product: {id: 300, product: 'Molho da Casa'},
          },
        ],
      },
    ],
  };

  const tree = buildExistingCustomizationTree({
    orderProduct,
    rootNodeKey,
    rootQuantity: orderProduct.quantity,
  });

  assert.deepEqual(tree.existingSelectionsByNode[rootNodeKey]['10']['200'], {
    selected: true,
    quantity: 3,
  });
  assert.equal(tree.childNodeBySelectionKey[selectionKey], childNodeKey);
  assert.deepEqual(tree.existingSelectionsByNode[childNodeKey]['11']['300'], {
    selected: true,
    quantity: 1,
  });
});

test('buildRecursiveSubProducts preserves nested customization trees without flattening descendants', () => {
  const rootNodeKey = 'root:900';
  const childNodeKey = buildCustomizationNodeKey(rootNodeKey, '10', '200');
  const selectionKey = buildCustomizationSelectionKey(rootNodeKey, '10', '200');

  const subProducts = buildRecursiveSubProducts({
    rootNodeKey,
    rootQuantity: 2,
    childNodeBySelectionKey: {
      [selectionKey]: childNodeKey,
    },
    groupsByNode: {
      [rootNodeKey]: {
        10: [
          {
            selected: true,
            quantity: 3,
            productChild: {id: 200, product: 'Batata Rustica'},
          },
        ],
      },
      [childNodeKey]: {
        11: [
          {
            selected: true,
            quantity: 1,
            productChild: {id: 300, product: 'Molho da Casa'},
          },
        ],
      },
    },
  });

  assert.deepEqual(subProducts, [
    {
      product: 200,
      productGroup: 10,
      quantity: 6,
      sub_products: [
        {
          product: 300,
          productGroup: 11,
          quantity: 6,
        },
      ],
    },
  ]);
});
