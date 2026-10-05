// Presentation-only queue, scoped to one customization screen. No file contents,
// credentials or catalog/order data are cached here.
export function createCustomizationImageQueue(initiallyPaused = false) {
  const pending = new Map(), failedUrls = new Set();
  let paused = initiallyPaused, active = null, disposed = false;
  const drain = () => {
    if (paused || active || disposed || !pending.size) return;
    const [id, entry] = pending.entries().next().value;
    pending.delete(id);
    if (failedUrls.has(entry.uri)) {
      entry.notify('failed');
      drain();
      return;
    }
    active = {id, ...entry};
    entry.notify('loading');
  };
  return {
    enqueue(id, uri, notify) {
      if (disposed) return;
      if (failedUrls.has(uri)) {notify('failed'); return;}
      pending.set(id, {uri, notify});
      drain();
    },
    complete(id, failed = false) {
      if (active?.id !== id) return;
      if (failed) failedUrls.add(active.uri);
      active.notify(failed ? 'failed' : 'loaded');
      active = null;
      drain();
    },
    cancel(id) {
      pending.delete(id);
      if (active?.id === id) {active = null; drain();}
    },
    setPaused(value) {paused = value; drain();},
    dispose() {disposed = true; pending.clear(); failedUrls.clear(); active = null;},
  };
}
