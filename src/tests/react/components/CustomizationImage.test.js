const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockNode = name => props => React.createElement(name, props, props.children);
const mockObservers = [];
jest.mock('react-native', () => ({Image: mockNode('Image'), View: mockNode('View'), Text: mockNode('Text'),
 TouchableOpacity: mockNode('TouchableOpacity'), Platform: {OS: 'web'}}));
jest.mock('@expo/vector-icons', () => ({MaterialCommunityIcons: mockNode('Icon')}));
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({formatMoney: v => String(v)}));
jest.mock('../../../react/pages/customizeScreenHelpers', () => ({
 buildCoverUrl: product => `/files/${product.id}/download`, formatOptionQuantity: String,
 normalizeEntityId: value => String(value), parseNumericValue: Number, resolveProductInitial: () => 'A',
}));
const {CustomizationImageProvider} = require('../../../react/components/CustomizationImage');
const OptionRow = require('../../../react/pages/OptionRow').default;
let tree, render;
beforeEach(() => {
 mockObservers.length = 0;
 global.IntersectionObserver = class {
  constructor(callback) {this.callback = callback; this.disconnect = jest.fn(); mockObservers.push(this);}
  observe() {}
 };
});
afterEach(async () => {if (tree) await renderer.act(async () => tree.unmount()); tree = null; delete global.IntersectionObserver;});
const mount = async ({enabled = true, paused = false, count = 1, sameUrl = false} = {}) => {
 render = nextPaused => React.createElement(CustomizationImageProvider, {enabled, paused: nextPaused},
  Array.from({length: count}, (_, i) => React.createElement(OptionRow, {key: i, group: {id: 1},
   option: {label: 'Água', value: {'@id': `/options/${i}`, productChild: {id: sameUrl ? 1 : i + 1}}},
   palette: {}, selectedItems: {}, optionProductsById: {}, onToggle: jest.fn(), onInspectNested: jest.fn()})));
 await renderer.act(async () => {tree = renderer.create(render(paused), {createNodeMock: () => ({})});});
};
const images = () => tree.root.findAllByType('Image');
const show = async () => renderer.act(async () => mockObservers.forEach(observer => observer.callback([{isIntersecting: true}])));
it('does not request option images before they enter the viewport', async () => {
 await mount(); expect(images()).toHaveLength(0); await show(); expect(images()).toHaveLength(1);
});
it('starts one image and holds the next during a write, retaining the loaded image', async () => {
 await mount({count: 2}); await show(); expect(images()).toHaveLength(1);
 await renderer.act(async () => tree.update(render(true)));
 await renderer.act(async () => images()[0].props.onLoadEnd()); expect(images()).toHaveLength(1);
 await renderer.act(async () => tree.update(render(false))); expect(images()).toHaveLength(2);
});
it('keeps placeholders during confirmation and resumes when the write finishes', async () => {
 await mount({paused: true}); await show(); expect(images()).toHaveLength(0);
 await renderer.act(async () => tree.update(render(false))); expect(images()).toHaveLength(1);
});
it('does not request a failed URL again from another option in this screen', async () => {
 await mount({count: 2, sameUrl: true}); await show();
 await renderer.act(async () => {images()[0].props.onError();}); expect(images()).toHaveLength(0);
});
it('preserves normal image rendering outside the waiter web flow', async () => {
 await mount({enabled: false}); expect(images()).toHaveLength(1); expect(mockObservers).toHaveLength(0);
});
