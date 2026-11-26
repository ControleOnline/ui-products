import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Image, Platform, View} from 'react-native';
import {createCustomizationImageQueue} from '../utils/customizationImageQueue';

const ImageContext = createContext(null);
export function CustomizationImageProvider({enabled, paused, children}) {
  const [queue] = useState(() => createCustomizationImageQueue(true));
  const deferred = enabled && Platform.OS === 'web';
  useEffect(() => {
    queue.setPaused(!deferred || paused);
    return () => queue.setPaused(true);
  }, [queue, deferred, paused]);
  const context = useMemo(() => deferred ? queue : null, [queue, deferred]);
  return <ImageContext.Provider value={context}>{children}</ImageContext.Provider>;
}

export default function CustomizationImage({uri, style, imageStyle, children}) {
  const queue = useContext(ImageContext);
  const host = useRef(null), ticket = useRef({});
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState('idle');
  useEffect(() => {
    if (!queue || !uri) return undefined;
    setVisible(false);
    // Older webviews still benefit from sequential loading and write priority.
    if (typeof IntersectionObserver === 'undefined' || !host.current) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {setVisible(true); observer.disconnect();}
    }, {rootMargin: '0px'});
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [queue, uri]);
  useEffect(() => {
    if (!queue || !uri || !visible) return undefined;
    const id = ticket.current;
    setStatus('idle');
    queue.enqueue(id, uri, setStatus);
    return () => queue.cancel(id);
  }, [queue, uri, visible]);
  const showImage = uri && (!queue || (status === 'loading' || status === 'loaded'));
  return (
    <View ref={host} style={style}>
      {showImage ? (
        <Image source={{uri}} style={imageStyle} resizeMode="cover"
          onError={() => {setStatus('failed'); queue?.complete(ticket.current, true);}}
          onLoadEnd={() => queue?.complete(ticket.current)} />
      ) : children}
    </View>
  );
}
