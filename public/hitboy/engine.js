// HitBoy Proxy page engine. This file is the rewriter. It is not Scramjet, Ultraviolet, or Hammerhead.
// A proxied URL looks like /hb/https://example.com/path?q=1. The service worker fetches that address
// through the Wisp transport (bare-mux) and rewrites the document so the next request stays under /hb/.
(function (root) {
  function encode(remote, base) {
    const u = new URL(remote, root.location ? root.location.href : 'https://example.invalid/');
    const hash = u.hash || '';
    u.hash = '';
    return base + 'hb/' + u.href + hash;
  }

  function targetOf(requestUrl, base) {
    let u;
    try { u = new URL(requestUrl, root.location && root.location.href); }
    catch (e) { return null; }
    const prefix = base + 'hb/';
    if (!u.pathname.startsWith(prefix)) return null;
    let rest = u.pathname.slice(prefix.length) + u.search;
    rest = rest.replace(/^(https?:)\/(?!\/)/i, '$1//');
    if (!/^https?:\/\//i.test(rest)) return null;
    try { return new URL(rest); }
    catch (e) { return null; }
  }

  const entities = s => String(s)
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');

  function makeProxify(pageUrl, originBase) {
    const prefix = originBase + 'hb/';
    let origin = '';
    try { origin = new URL(originBase).origin; } catch (e) {}
    return function proxify(value) {
      if (value == null) return '';
      const v = entities(String(value)).trim();
      if (!v || /^(data:|blob:|javascript:|mailto:|about:|#)/i.test(v)) return '';
      if (v.startsWith(prefix)) return v;
      let abs;
      try { abs = new URL(v, pageUrl).href; }
      catch (e) { return ''; }
      if (!/^https?:/i.test(abs)) return '';
      try {
        const u = new URL(abs);
        if (u.origin === origin && u.pathname.indexOf('/hb/') !== -1) return abs;
      } catch (e) {}
      return prefix + abs;
    };
  }

  function rewriteCss(css, proxify) {
    return String(css)
      .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, v) => {
        const p = proxify(v.trim());
        if (!p) return m;
        const quote = q || '"';
        return 'url(' + quote + p + quote + ')';
      })
      .replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, v) => {
        const p = proxify(v.trim());
        return p ? '@import ' + q + p + q : m;
      });
  }

  function rewriteAttrs(html, proxify) {
    let out = html.replace(/\s(href|src|action|poster|formaction|data-src|background)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
      (m, attr, _whole, dq, sq, bare) => {
        const val = dq != null ? dq : sq != null ? sq : bare;
        const next = proxify(val);
        if (!next) return m;
        return ' ' + attr + '="' + next.replace(/"/g, '%22') + '"';
      });
    out = out.replace(/\ssrcset\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, _whole, dq, sq) => {
      const val = dq != null ? dq : sq;
      const next = val.split(',').map(part => {
        const bits = part.trim().split(/\s+/);
        if (!bits[0]) return part.trim();
        const p = proxify(bits[0]);
        if (p) bits[0] = p;
        return bits.join(' ');
      }).join(', ');
      return ' srcset="' + next.replace(/"/g, '%22') + '"';
    });
    out = out.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, css, close) => open + rewriteCss(css, proxify) + close);
    out = out.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, _whole, dq, sq) => {
      const val = dq != null ? dq : sq;
      const next = rewriteCss(val, proxify);
      if (next === val) return m;
      return ' style="' + next.replace(/"/g, '&quot;') + '"';
    });
    return out;
  }

  // Runs inside the proxied page. Rewrites URLs created after the first HTML pass and sends
  // fetch, XHR, and WebSocket calls back through this same /hb/ path (WebSocket via the Wisp transport).
  function hbClient(pageUrl, originBase) {
    var prefix = originBase + 'hb/';
    function proxify(value) {
      if (value == null) return '';
      var v = String(value).trim();
      if (!v || /^(data:|blob:|javascript:|mailto:|about:|#)/i.test(v)) return '';
      if (v.indexOf(prefix) === 0) return v;
      var abs;
      try { abs = new URL(v, pageUrl).href; } catch (e) { return ''; }
      if (!/^https?:/i.test(abs)) return '';
      try {
        var u = new URL(abs);
        if (u.origin === location.origin && u.pathname.indexOf('/hb/') !== -1) return abs;
      } catch (e) {}
      return prefix + abs;
    }
    var attrs = ['href', 'src', 'action', 'poster', 'formaction', 'data-src', 'background'];
    function rewriteNode(node) {
      if (!node || node.nodeType !== 1 || node.getAttribute('data-hb') != null) return;
      for (var i = 0; i < attrs.length; i++) {
        if (!node.hasAttribute(attrs[i])) continue;
        var cur = node.getAttribute(attrs[i]);
        var next = proxify(cur);
        if (next && next !== cur) node.setAttribute(attrs[i], next);
      }
      if (node.hasAttribute('srcset')) {
        var joined = node.getAttribute('srcset').split(',').map(function (part) {
          var bits = part.trim().split(/\s+/);
          var p = proxify(bits[0]);
          if (p) bits[0] = p;
          return bits.join(' ');
        }).join(', ');
        if (joined !== node.getAttribute('srcset')) node.setAttribute('srcset', joined);
      }
      if (node.hasAttribute('style')) {
        var style = node.getAttribute('style');
        var styled = style.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, function (m, q, v) {
          var p = proxify(v.trim());
          return p ? 'url("' + p + '")' : m;
        });
        if (styled !== style) node.setAttribute('style', styled);
      }
    }
    function walk(root) {
      if (!root || root.nodeType !== 1) return;
      rewriteNode(root);
      if (!root.querySelectorAll) return;
      var list = root.querySelectorAll('[href],[src],[action],[poster],[formaction],[data-src],[srcset],[style]');
      for (var i = 0; i < list.length; i++) rewriteNode(list[i]);
    }
    try {
      var setAttr = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        if (/^(href|src|action|poster|formaction|data-src|background)$/i.test(name)) {
          var p = proxify(value);
          if (p) value = p;
        }
        return setAttr.call(this, name, value);
      };
    } catch (e) {}
    function hookProp(proto, prop) {
      try {
        var desc = Object.getOwnPropertyDescriptor(proto, prop);
        if (!desc || !desc.set || !desc.get) return;
        Object.defineProperty(proto, prop, {
          configurable: true,
          enumerable: desc.enumerable,
          get: function () { return desc.get.call(this); },
          set: function (v) { var p = proxify(v); desc.set.call(this, p || v); },
        });
      } catch (e) {}
    }
    hookProp(HTMLImageElement.prototype, 'src');
    hookProp(HTMLScriptElement.prototype, 'src');
    hookProp(HTMLIFrameElement.prototype, 'src');
    hookProp(HTMLAnchorElement.prototype, 'href');
    hookProp(HTMLLinkElement.prototype, 'href');
    hookProp(HTMLFormElement.prototype, 'action');
    try {
      var origFetch = window.fetch;
      window.fetch = function (input, init) {
        try {
          if (typeof input === 'string' || input instanceof URL) {
            var p = proxify(String(input));
            if (p) input = p;
          } else if (input && input.url) {
            var p2 = proxify(input.url);
            if (p2 && p2 !== input.url) input = new Request(p2, input);
          }
        } catch (e) {}
        return origFetch.call(this, input, init);
      };
    } catch (e) {}
    try {
      var xhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        var args = Array.prototype.slice.call(arguments);
        try { var p = proxify(url); if (p) args[1] = p; } catch (e) {}
        return xhrOpen.apply(this, args);
      };
    } catch (e) {}
    try {
      if (navigator.sendBeacon) {
        var beacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function (url, data) {
          var p = proxify(url);
          return beacon(p || url, data);
        };
      }
    } catch (e) {}
    try {
      if (window.BareMux && BareMux.BareClient) {
        var RealWS = window.WebSocket;
        var HBWS = function (url, protocols) {
          var abs;
          try { abs = new URL(url, pageUrl).href; } catch (e) { return new RealWS(url, protocols); }
          if (!/^wss?:/i.test(abs)) return new RealWS(url, protocols);
          try { return new BareMux.BareClient().createWebSocket(abs, protocols); }
          catch (e) { return new RealWS(url, protocols); }
        };
        HBWS.CONNECTING = 0; HBWS.OPEN = 1; HBWS.CLOSING = 2; HBWS.CLOSED = 3;
        window.WebSocket = HBWS;
      }
    } catch (e) {}
    try {
      var push = history.pushState, replace = history.replaceState;
      history.pushState = function (state, title, url) {
        if (url) { var p = proxify(url); if (p) url = p; }
        return push.call(history, state, title, url);
      };
      history.replaceState = function (state, title, url) {
        if (url) { var p = proxify(url); if (p) url = p; }
        return replace.call(history, state, title, url);
      };
    } catch (e) {}
    try {
      var opened = window.open;
      window.open = function (url) {
        var args = Array.prototype.slice.call(arguments);
        if (args[0]) { var p = proxify(args[0]); if (p) args[0] = p; }
        return opened.apply(window, args);
      };
    } catch (e) {}
    function arm() { try { walk(document.documentElement); } catch (e) {} }
    arm();
    document.addEventListener('DOMContentLoaded', arm);
    try {
      new MutationObserver(function (recs) {
        for (var i = 0; i < recs.length; i++) {
          var rec = recs[i];
          if (rec.type === 'attributes') rewriteNode(rec.target);
          else for (var j = 0; j < rec.addedNodes.length; j++) if (rec.addedNodes[j].nodeType === 1) walk(rec.addedNodes[j]);
        }
      }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'src', 'action', 'poster', 'formaction', 'data-src', 'srcset', 'style'] });
    } catch (e) {}
    try {
      var want = proxify(pageUrl);
      if (want && location.href.split('#')[0] !== want.split('#')[0]) history.replaceState(null, '', want);
    } catch (e) {}
  }

  function rewriteHtml(html, pageUrl, originBase) {
    const proxify = makeProxify(pageUrl, originBase);
    const pieces = String(html).split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi);
    let out = pieces.map((part, i) => {
      if (i % 2 === 0) return rewriteAttrs(part, proxify);
      return part.replace(/^<script\b[^>]*>/i, tag => rewriteAttrs(tag, proxify));
    }).join('');
    out = out.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?\s*content-security-policy[^>]*>/gi, '');
    out = out.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?\s*x-frame-options[^>]*>/gi, '');
    out = out.replace(/<base\b[^>]*>/gi, '');
    const boot = '<script src="' + originBase + 'baremux/index.js" data-hb="1"><\/script><script data-hb="1">(' + hbClient + ')(' + JSON.stringify(pageUrl) + ',' + JSON.stringify(originBase) + ')<\/script>';
    if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, m => m + boot);
    else out = '<head>' + boot + '</head>' + out;
    return out;
  }

  const DROP = ['content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'content-length', 'content-encoding', 'strict-transport-security', 'report-to', 'nel', 'permissions-policy', 'x-content-type-options'];

  async function rewriteResponse(res, finalURL, originBase, dest) {
    const headers = new Headers();
    res.headers.forEach((value, key) => { if (!DROP.includes(key.toLowerCase())) headers.set(key, value); });
    const type = (res.headers.get('content-type') || '').toLowerCase();
    const status = res.status;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get('location');
      if (loc) {
        try { headers.set('location', originBase + 'hb/' + new URL(loc, finalURL).href); }
        catch (e) {}
      }
      return new Response(null, { status, statusText: res.statusText, headers });
    }
    const asHtml = /text\/html|application\/xhtml/.test(type) || ((dest === 'document' || dest === 'iframe') && (!type || type.startsWith('text/plain')));
    if (asHtml) {
      const html = rewriteHtml(await res.text(), finalURL, originBase);
      headers.set('content-type', 'text/html; charset=utf-8');
      headers.set('cache-control', 'no-store');
      return new Response(html, { status, statusText: res.statusText, headers });
    }
    if (/text\/css/.test(type)) {
      const css = rewriteCss(await res.text(), makeProxify(finalURL, originBase));
      headers.set('content-type', type.includes('charset') ? res.headers.get('content-type') : 'text/css; charset=utf-8');
      headers.set('cache-control', 'no-store');
      return new Response(css, { status, statusText: res.statusText, headers });
    }
    return new Response(res.body, { status, statusText: res.statusText, headers });
  }

  root.HitBoyProxy = { encode, targetOf, rewriteResponse };
})(typeof globalThis !== 'undefined' ? globalThis : self);
