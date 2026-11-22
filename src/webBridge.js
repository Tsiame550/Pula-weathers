// Shared by the browser WebSurface and the Node test suite.
const BRIDGE = '<script>window.ReactNativeWebView={postMessage:function(payload){window.parent.postMessage({__pulaBridge:true,payload:String(payload)},"*");}};</script>';

function withBridge(html) {
  if (typeof html !== 'string') return '<!doctype html><html><body>Visualization unavailable</body></html>';
  if (/<head(?:\s[^>]*)?>/i.test(html)) return html.replace(/<head(?:\s[^>]*)?>/i, match => match + BRIDGE);
  return BRIDGE + html;
}
module.exports = { withBridge };
