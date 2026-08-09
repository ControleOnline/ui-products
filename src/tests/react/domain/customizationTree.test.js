import {
  buildUnitTreeFromOrderProductComponents,
  buildUnitCustomizationTree,
  calculateCustomizationTreePrice,
  serializeCustomizationTree,
  summarizeCustomizationTree,
  summarizeCustomizationGroups,
} from '../../../react/domain/customizationTree';

describe('customizationTree', () => {
  const requiredGroup = {
    id: 50,
    required: true,
    minimum: 1,
    maximum: 1,
    priceCalculation: 'sum',
  };

  it('serializes quantities proportionally through every tree level', () => {
    const selections = {
      50: [{
        selected: true,
        quantity: 1,
        productChild: {id: 102},
        sub_products: [{
          product: 103,
          productGroup: 60,
          quantity: 2,
          sub_products: [],
        }],
      }],
    };

    expect(serializeCustomizationTree(selections, 2)).toEqual([{
      product: '102',
      productGroup: '50',
      quantity: 2,
      sub_products: [{
        product: '103',
        productGroup: '60',
        quantity: 4,
        sub_products: [],
      }],
    }]);
  });

  it('blocks a parent group while a selected descendant is pending', () => {
    const [summary] = summarizeCustomizationGroups([requiredGroup], {
      50: [{selected: true, nestedState: 'pending'}],
    });

    expect(summary).toMatchObject({
      selectedCount: 1,
      hasInvalidDescendant: true,
      isValid: false,
    });
  });

  it('keeps nested selections as per-parent unit quantities', () => {
    const tree = buildUnitCustomizationTree({
      50: [{
        selected: true,
        quantity: 1.5,
        productChild: {'@id': '/products/102'},
        sub_products: [],
      }],
    });

    expect(tree[0]).toMatchObject({
      product: '102',
      productGroup: '50',
      quantity: 1.5,
    });
  });

  it('preserves display metadata while keeping the API payload clean', () => {
    const selections = {
      60: [{
        selected: true,
        quantity: 1,
        price: 5.99,
        productChild: {id: 103, product: 'Maionese da Casa'},
        sub_products: [],
      }],
    };
    const groups = [{
      id: 60,
      productGroup: 'Molhos extra',
      priceCalculation: 'sum',
    }];
    const tree = buildUnitCustomizationTree(selections, groups);

    expect(tree[0].display).toEqual({
      groupName: 'Molhos extra',
      productName: 'Maionese da Casa',
      price: 5.99,
      priceCalculation: 'sum',
    });
    expect(serializeCustomizationTree(selections, 1)).toEqual([{
      product: '103',
      productGroup: '60',
      quantity: 1,
      sub_products: [],
    }]);
  });

  it('calculates and summarizes paid descendants recursively', () => {
    const tree = [{
      product: '103',
      productGroup: '60',
      quantity: 1,
      display: {
        groupName: 'Molhos extra',
        productName: 'Maionese da Casa',
        price: 5.99,
        priceCalculation: 'sum',
      },
      sub_products: [{
        product: '104',
        productGroup: '61',
        quantity: 1,
        display: {
          groupName: 'Temperos',
          productName: 'Paprica',
          price: 1.5,
          priceCalculation: 'sum',
        },
        sub_products: [],
      }],
    }];

    expect(calculateCustomizationTreePrice(tree)).toBeCloseTo(7.49);
    expect(summarizeCustomizationTree(tree)).toEqual([{
      groupId: '60',
      groupName: 'Molhos extra',
      items: [{
        productId: '103',
        productName: 'Maionese da Casa',
        price: 5.99,
        groups: [{
          groupId: '61',
          groupName: 'Temperos',
          items: [{
            productId: '104',
            productName: 'Paprica',
            price: 1.5,
            groups: [],
          }],
        }],
      }],
    }]);

    const [groupSummary] = summarizeCustomizationGroups([requiredGroup], {
      50: [{selected: true, price: 0, sub_products: tree}],
    });
    expect(groupSummary.extraPrice).toBeCloseTo(7.49);
  });

  it('rehydrates a persisted recursive order-product tree', () => {
    expect(buildUnitTreeFromOrderProductComponents([{
      product: {id: 102},
      productGroup: {id: 50},
      quantity: 2,
      orderProductComponents: [{
        product: {id: 103},
        productGroup: {id: 60},
        quantity: 4,
      }],
    }], 2)).toEqual([{
      product: '102',
      productGroup: '50',
      quantity: 1,
      sub_products: [{
        product: '103',
        productGroup: '60',
        quantity: 2,
        sub_products: [],
      }],
    }]);
  });
});
