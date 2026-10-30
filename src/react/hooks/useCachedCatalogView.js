import {useCallback, useEffect, useRef, useState} from 'react';
import {getCatalogCacheScope} from '../utils/catalogCacheScope';
import {readCatalogRecord, writeCatalogRecord} from '../utils/cachedCatalogActions';

export default function useCachedCatalogView({enabled, companyId, context, viewKey, view, restore, scopeRevision, resetKey}) {
  const [key, setKey] = useState('');
  const listRef = useRef(null);
  const snapshot = useRef(null);
  const ready = useRef(false);
  const restoredScroll = useRef(false);
  const restoringView = useRef(false);
  const timer = useRef(null);
  const restoreRef = useRef(restore);
  const viewRef = useRef(view);
  const previousView = useRef(JSON.stringify(view));
  restoreRef.current = restore;
  viewRef.current = view;
  if (ready.current && snapshot.current) snapshot.current.view = view;
  const save = useCallback(() => {
    if (ready.current && snapshot.current) void writeCatalogRecord({...snapshot.current});
  }, []);

  useEffect(() => {
    save();
    ready.current = false;
    restoredScroll.current = false;
    restoringView.current = true;
    if (enabled) restoreRef.current?.({});
    let cancelled = false;
    if (enabled) void (async () => {
      const scope = await getCatalogCacheScope(companyId, context);
      if (!scope || cancelled) return;
      const id = `view:${scope}:${viewKey}`;
      const saved = await readCatalogRecord(id);
      if (cancelled) return;
      // A completed custom item clears navigation state, never cached catalog data.
      const resetSelection = !!resetKey && saved?.resetKey !== resetKey;
      const restoredView = resetSelection ? {} : saved?.view || viewRef.current;
      snapshot.current = {id, view: restoredView, y: resetSelection ? 0 : Number(saved?.y) || 0,
        resetKey: resetKey || saved?.resetKey};
      restoreRef.current?.(restoredView);
      if (resetSelection) {
        listRef.current?.scrollToOffset({offset: 0, animated: false});
        void writeCatalogRecord({...snapshot.current});
      }
      ready.current = true;
      setKey(id);
    })();
    return () => { cancelled = true; };
  }, [enabled, companyId, context, viewKey, scopeRevision, resetKey, save]);

  const signature = JSON.stringify(view);
  useEffect(() => {
    if (!enabled || !key || !ready.current) return undefined;
    if (previousView.current !== signature && !restoringView.current) {
      snapshot.current.y = 0;
      listRef.current?.scrollToOffset({offset: 0, animated: false});
    }
    previousView.current = signature;
    restoringView.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 400);
    return () => clearTimeout(timer.current);
  }, [enabled, key, signature, save]);
  useEffect(() => () => { clearTimeout(timer.current); save(); }, [save]);

  return enabled ? {
    // A callback ref keeps React/native instances out of table config serialization.
    ref: node => { listRef.current = node; },
    onScroll: event => {
      if (!ready.current || !snapshot.current) return;
      snapshot.current.y = Number(event.nativeEvent?.contentOffset?.y) || 0;
      clearTimeout(timer.current);
      timer.current = setTimeout(save, 400);
    },
    onContentSizeChange: (_width, height) => {
      const y = snapshot.current?.y || 0;
      if (!ready.current || restoredScroll.current || !y || height <= y) return;
      restoredScroll.current = true;
      listRef.current?.scrollToOffset({offset: y, animated: false});
    },
  } : {};
}
