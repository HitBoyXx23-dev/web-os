// Icon system: 24px stroke glyphs + app tiles. No emoji, one consistent style.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const GLYPHS = {
  // app glyphs
  games: '<rect x="2.5" y="7" width="19" height="11" rx="4"/><path d="M7 10.5v4M5 12.5h4"/><path d="M15.5 11.5h.01M18 14h.01"/>',
  vm: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  browser: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  store: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  files: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15H17"/>',
  notepad: '<path d="M6.5 3h8l4 4v13.5a.5.5 0 0 1-.5.5h-11.5a.5.5 0 0 1-.5-.5V3.5a.5.5 0 0 1 .5-.5z"/><path d="M14 3v4.5h4.5M9 12.5h6M9 16h4"/>',
  media: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
  paint: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 1.9-.9 1.9-1.8 0-1.2-.9-1.4-.9-2.4 0-.8.6-1.3 1.4-1.3H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><path d="M7.5 11h.01M9.5 7h.01M14.5 7h.01"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/>',
  taskmgr: '<path d="M3 12.5h4l2.5-6 4.5 12 2.5-6H21"/>',
  snake: '<path d="M4 17.5c2.8 0 3.2-5 6-5s3.2 5 6 5c1.6 0 2.6-1 3-2.5"/><path d="M19 7.5h.01"/><path d="M15 7.5a4 4 0 0 1 4-4"/>',
  g2048: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  mines: '<circle cx="11" cy="14" r="6"/><path d="M15.2 9.8l2-2M18 3.5v2M21 6.5h-2M19.8 4.2l-1.2 1.2"/>',
  ttt: '<path d="M9 4v16M15 4v16M4 9h16M4 15h16"/>',
  breakout: '<path d="M4 5h4M10 5h4M16 5h4M4 8.5h4M10 8.5h4M16 8.5h4M8 19.5h8"/><circle cx="13" cy="15" r="1.3"/>',
  flappy: '<path d="M4 13c3.5 0 5.5-2 7-6 1.2 3 2.5 4.5 4.5 5.2"/><circle cx="17.5" cy="12.5" r="2.5"/><path d="M20 12.5h1.5"/>',
  web: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  // ui glyphs
  back: '<path d="M15 5l-7 7 7 7"/>', forward: '<path d="M9 5l7 7-7 7"/>', up: '<path d="M5 15l7-7 7 7"/>',
  reload: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/>',
  home: '<path d="M4 11l8-7 8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', min: '<path d="M5 12h14"/>',
  max: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>', restore: '<rect x="4" y="8" width="12" height="12" rx="1.5"/><path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  power: '<path d="M12 3v8"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 15.8a4.8 4.8 0 0 1 6.4 0"/><path d="M12 19.2h.01"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>', folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  file: '<path d="M6.5 3h8l4 4v14h-12z"/><path d="M14 3v4.5h4.5"/>', moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  eraser: '<path d="M8 20h12M5.5 15.5l9-9a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L12 18H8z"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>', open: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v1.3"/><path d="M3 18l2.5-7h16L19 18z"/>',
};
const glyph = (name, size = 16) => `<svg class="gl" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[name] || GLYPHS.web}</svg>`;

// Tile colors per app glyph — muted, consistent saturation.
const TILE = {
  games: '#7c5cff', vm: '#2563eb', browser: '#0ea5e9', store: '#ec4899', files: '#f59e0b', terminal: '#27272a', notepad: '#64748b',
  media: '#ef4444', paint: '#f97316', calc: '#52525b', settings: '#6b7280', about: '#3b82f6', taskmgr: '#10b981',
  snake: '#16a34a', g2048: '#d97706', mines: '#475569', ttt: '#0891b2', breakout: '#db2777', flappy: '#eab308', web: '#6366f1',
};
// icon: a glyph key, or { mono: 'YT', bg: '#c00' } for monogram tiles.
function tile(icon, size = 40) {
  const r = Math.round(size * .26);
  if (icon && typeof icon === 'object') {
    return `<span class="tile" style="width:${size}px;height:${size}px;border-radius:${r}px;--t:${icon.bg};font-size:${Math.round(size * (icon.mono.length > 2 ? .3 : .38))}px">${esc(icon.mono)}</span>`;
  }
  return `<span class="tile" style="width:${size}px;height:${size}px;border-radius:${r}px;--t:${TILE[icon] || TILE.web}">${glyph(icon, Math.round(size * .56))}</span>`;
}
