const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => {
  const React = require('react');
  const createComponent = name => props => React.createElement(name, props, props.children);

  return {
    Platform: {select: values => values.web || values.default},
    StyleSheet: {create: value => value},
    ScrollView: createComponent('ScrollView'),
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  };
});

const PdvCategoryTabs = require('../../../react/pages/CategoriesPage/PdvCategoryTabs').default;

describe('PdvCategoryTabs', () => {
  it('shows compact category tabs and selects the tapped category', () => {
    const onSelectCategory = jest.fn();
    const categories = [
      {id: 10, name: 'Combos'},
      {id: 11, name: 'Águas'},
    ];
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        React.createElement(PdvCategoryTabs, {
          categories,
          onSelectCategory,
          selectedCategoryId: '10',
        }),
      );
    });

    expect(tree.root.findByProps({children: 'Combos'})).toBeTruthy();
    expect(tree.root.findByProps({children: 'Águas'})).toBeTruthy();

    renderer.act(() => {
      tree.root.findByProps({accessibilityLabel: 'Categoria Águas'}).props.onPress();
    });

    expect(onSelectCategory).toHaveBeenCalledWith(categories[1]);
  });
});
