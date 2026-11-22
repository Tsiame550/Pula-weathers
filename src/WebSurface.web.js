import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

// Browser WebView equivalent: a sandboxed iframe with srcDoc content.
// The iframe may execute PULA's own scene/Leaflet code, but is not given
// same-origin access to the enclosing web app or to its stored preferences.
import { withBridge } from './webBridge';

export default function WebSurface({ source, style, onMessage, scrollEnabled = true, accessible, ...rest }) {
  const ref = useRef(null);
  const html = useMemo(() => withBridge(source?.html), [source?.html]);
  useEffect(() => {
    if (!onMessage || typeof window === 'undefined') return undefined;
    const handle = (event) => {
      if (event.source !== ref.current?.contentWindow) return;
      if (!event.data || event.data.__pulaBridge !== true) return;
      onMessage({ nativeEvent: { data: event.data.payload } });
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [onMessage]);
  const flat = StyleSheet.flatten(style) || {};
  return React.createElement('iframe', {
    ref, srcDoc: html, title: rest.title || 'PULA weather visualization',
    sandbox: 'allow-scripts allow-popups', scrolling: scrollEnabled ? 'yes' : 'no',
    'aria-hidden': accessible === false ? true : undefined,
    style: { width: '100%', height: '100%', border: 'none', display: 'block', ...flat },
  });
}
