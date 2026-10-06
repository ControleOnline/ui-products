const {createCustomizationImageQueue} = require('../../../react/utils/customizationImageQueue');
it('admits one visible image at a time and pauses new requests during a write', () => {
 const queue = createCustomizationImageQueue(true), first = jest.fn(), second = jest.fn();
 queue.enqueue('one', '/one', first); queue.enqueue('two', '/two', second);
 expect(first).not.toHaveBeenCalled(); queue.setPaused(false);
 expect(first).toHaveBeenCalledWith('loading'); expect(second).not.toHaveBeenCalled();
 queue.setPaused(true); queue.complete('one'); expect(second).not.toHaveBeenCalled();
 queue.setPaused(false); expect(second).toHaveBeenCalledWith('loading');
});
it('does not retry a failed URL during the same customization', () => {
 const queue = createCustomizationImageQueue(), first = jest.fn(), retry = jest.fn();
 queue.enqueue('one', '/missing', first); queue.complete('one', true);
 queue.enqueue('two', '/missing', retry); expect(retry).toHaveBeenCalledWith('failed');
});
it('drops canceled offscreen requests and ignores a second completion', () => {
 const queue = createCustomizationImageQueue(), first = jest.fn(), canceled = jest.fn(), third = jest.fn();
 queue.enqueue('one', '/one', first); queue.enqueue('two', '/two', canceled); queue.enqueue('three', '/three', third);
 queue.cancel('two'); queue.complete('one'); queue.complete('one');
 expect(canceled).not.toHaveBeenCalled(); expect(third).toHaveBeenCalledTimes(1);
});
it('clears failed URLs for a new screen and never starts a request after disposal', () => {
 const queue = createCustomizationImageQueue(true), callback = jest.fn();
 queue.enqueue('one', '/one', callback); queue.dispose(); queue.setPaused(false);
 expect(callback).not.toHaveBeenCalled();
 const fresh = createCustomizationImageQueue(); fresh.enqueue('one', '/one', callback);
 expect(callback).toHaveBeenCalledWith('loading');
});
