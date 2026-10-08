/*global Ultraviolet*/
// Paths are derived from where this file is served so the OS works from any sub-path (e.g. GitHub Pages).
(() => {
  let base = '/';
  try {
    const src = self.document ? document.currentScript.src : self.location.href;
    base = new URL(src).pathname.replace(/(uv\/)?[^/]*$/, ''); // works from /uv/uv.config.js and from /sw.js
  } catch (e) {}
  self.__uv$config = {
    prefix: base + 'uv/service/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: base + 'uv/uv.handler.js',
    client: base + 'uv/uv.client.js',
    bundle: base + 'uv/uv.bundle.js',
    config: base + 'uv/uv.config.js',
    sw: base + 'uv/uv.sw.js',
  };
})();
