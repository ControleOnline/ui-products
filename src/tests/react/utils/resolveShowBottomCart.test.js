const {resolveShowBottomCart} = require('../../../react/utils/resolveShowBottomCart');
const {describe, expect, it} = global;

describe('resolveShowBottomCart', () => {
  it('preserves an explicit false override for a PDV route', () => {
    expect(resolveShowBottomCart('pdv', false)).toBe(false);
  });

  it('preserves an explicit true override for a PDV route', () => {
    expect(resolveShowBottomCart('pdv', true)).toBe(true);
  });

  it('keeps the existing PDV default when no override is provided', () => {
    expect(resolveShowBottomCart('pdv')).toBe(true);
  });

  it('keeps the existing non-PDV default when no override is provided', () => {
    expect(resolveShowBottomCart('manager')).toBe(false);
  });
});
