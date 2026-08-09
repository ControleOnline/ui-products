const React = require('react');
const renderer = require('react-test-renderer');
const {jest} = require('@jest/globals');

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => {
  const React = require('react');
  const createComponent = name => props =>
    React.createElement(name, props, props.children);

  return {
    ActivityIndicator: createComponent('ActivityIndicator'),
    Modal: createComponent('Modal'),
    Platform: {select: values => values.web || values.default},
    ScrollView: createComponent('ScrollView'),
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    useWindowDimensions: () => ({width: 480, height: 800}),
    View: createComponent('View'),
  };
});

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}), {virtual: true});

const NestedCustomizationModal =
  require('../../../react/components/NestedCustomizationModal').default;

const palette = {
  border: '#ddd',
  danger: '#c00',
  modal: '#fff',
  muted: '#667',
  page: '#eef',
  panel: '#f7f7f7',
  primary: '#078',
  primarySoft: '#def',
  text: '#123',
  white: '#fff',
};

describe('NestedCustomizationModal', () => {
  it('returns the selected second-level customization', async () => {
    const onSave = jest.fn();
    const productGroupActions = {
      getItems: jest.fn().mockResolvedValue([]),
    };
    const productGroupProductActions = {
      getItems: jest.fn().mockResolvedValue([{
        '@id': '/product_group_products/70',
        productChild: {
          '@id': '/products/103',
          product: 'Lemon pepper',
        },
        quantity: 1,
        price: 0,
      }]),
    };
    const groups = [{
      '@id': '/product_groups/60',
      id: 60,
      productGroup: 'Escolha seu tempero',
      required: true,
      minimum: 1,
      maximum: 1,
    }];

    let tree;
    await renderer.act(async () => {
      tree = renderer.create(
        <NestedCustomizationModal
          onCancel={jest.fn()}
          onSave={onSave}
          palette={palette}
          preloadedGroups={groups}
          product={{id: 102, product: 'Batata Frita Media'}}
          productGroupActions={productGroupActions}
          productGroupProductActions={productGroupProductActions}
          visible
        />,
      );
    });

    await renderer.act(async () => {
      tree.root.findByProps({
        accessibilityLabel: 'Selecionar Lemon pepper',
      }).props.onPress();
      await Promise.resolve();
    });

    await renderer.act(async () => {
      tree.root.findByProps({
        accessibilityLabel: 'Confirmar personalizacao de Batata Frita Media',
      }).props.onPress();
    });

    expect(onSave).toHaveBeenCalledWith([{
      display: {
        groupName: 'Escolha seu tempero',
        price: 0,
        priceCalculation: 'sum',
        productName: 'Lemon pepper',
      },
      product: '103',
      productGroup: '60',
      quantity: 1,
      sub_products: [],
    }]);
  });
});
