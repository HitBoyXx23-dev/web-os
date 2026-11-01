// Catalog: web games (official sites, official publishers and open-source projects), extra apps,
// the Movies app (public-domain films from the Internet Archive) and Recorder (an OBS-style screen recorder).

// [category, name, url, icon?] — every link was checked when this list was made.
const WEB_CATALOG = [
  ['Multiplayer', 'Minecraft Classic', 'https://classic.minecraft.net/', 'minecraft'], ['Multiplayer', 'Bloxd.io', 'https://bloxd.io/'], ['Multiplayer', 'Krunker', 'https://krunker.io/'],
  ['Multiplayer', 'Shell Shockers', 'https://shellshock.io/'], ['Multiplayer', 'Slither.io', 'https://slither.io/'], ['Multiplayer', 'Agar.io', 'https://agar.io/'],
  ['Multiplayer', 'Diep.io', 'https://diep.io/'], ['Multiplayer', 'Smash Karts', 'https://smashkarts.io/'], ['Multiplayer', 'Venge.io', 'https://venge.io/'],
  ['Multiplayer', 'Ev.io', 'https://ev.io/'], ['Multiplayer', 'Paper.io 2', 'https://paper-io.com/'], ['Multiplayer', 'Zombs.io', 'https://zombs.io/'],
  ['Multiplayer', 'ZombsRoyale.io', 'https://zombsroyale.io/'], ['Multiplayer', 'MooMoo.io', 'https://moomoo.io/'], ['Multiplayer', 'Bonk.io', 'https://bonk.io/'],
  ['Multiplayer', 'Powerline.io', 'https://powerline.io/'], ['Multiplayer', 'Territorial.io', 'https://territorial.io/'], ['Multiplayer', 'Skribbl.io', 'https://skribbl.io/'],
  ['Multiplayer', 'Gartic Phone', 'https://garticphone.com/'], ['Multiplayer', 'TETR.IO', 'https://tetr.io/'], ['Multiplayer', 'Jstris', 'https://jstris.jezevec10.com/'],
  ['Multiplayer', 'Lichess', 'https://lichess.org/'], ['Multiplayer', 'TypeRacer', 'https://play.typeracer.com/'], ['Multiplayer', 'Freeciv-web', 'https://www.freecivweb.org/'],
  ['Multiplayer', 'Wings.io', 'https://wings.io/'], ['Multiplayer', 'Hole.io', 'https://hole-io.com/'], ['Multiplayer', 'Snake.io', 'https://snake.io/'],
  ['Multiplayer', 'Narrow.one', 'https://narrow.one/'], ['Multiplayer', 'Deeeep.io', 'https://deeeep.io/'], ['Multiplayer', 'Hexanaut.io', 'https://hexanaut.io/'],
  ['Multiplayer', 'Lordz.io', 'https://lordz.io/'], ['Multiplayer', 'Starblast.io', 'https://starblast.io/'], ['Multiplayer', 'Taming.io', 'https://taming.io/'],
  ['Multiplayer', 'Sploop.io', 'https://sploop.io/'], ['Multiplayer', 'Mope.io', 'https://mope.io/'], ['Multiplayer', 'Little Big Snake', 'https://littlebigsnake.com/'],
  ['Multiplayer', 'Ships 3D', 'https://ships3d.io/'], ['Multiplayer', 'Kirka.io', 'https://kirka.io/'], ['Multiplayer', 'Voxiom.io', 'https://voxiom.io/'],
  ['Arcade', '2048', 'https://play2048.co/'], ['Arcade', 'T-Rex Runner', 'https://wayou.github.io/t-rex-runner/'], ['Arcade', 'Tetris', 'https://chvin.github.io/react-tetris/?lan=en'],
  ['Arcade', 'Clumsy Bird', 'https://ellisonleao.github.io/clumsy-bird/'], ['Arcade', 'Pac-Man', 'https://masonicgit.github.io/pacman/'], ['Arcade', 'Snake (Google)', 'https://www.google.com/fbx?fbx=snake_arcade'],
  ['Arcade', 'Solitaire', 'https://www.solitr.com/'], ['Arcade', 'Minesweeper Online', 'https://minesweeperonline.com/'], ['Arcade', 'Arkanoid', 'https://arkanoid.online/'],
  ['Arcade', 'Doodle Jump', 'https://doodlejump.io/'], ['Arcade', 'QWOP', 'https://www.foddy.net/Athletics.html'], ['Arcade', 'Prince of Persia', 'https://princejs.com/'],
  ['Puzzle', 'Wordle', 'https://www.nytimes.com/games/wordle/index.html'], ['Puzzle', 'Little Alchemy 2', 'https://littlealchemy2.com/'], ['Puzzle', 'Sudoku', 'https://sudoku.com/'],
  ['Puzzle', 'Cut the Rope', 'https://www.crazygames.com/game/cut-the-rope'], ['Puzzle', 'Bloxorz', 'https://www.coolmathgames.com/0-bloxorz'], ['Puzzle', 'Sugar, Sugar', 'https://www.coolmathgames.com/0-sugar-sugar'],
  ['Puzzle', 'Mahjong Solitaire', 'https://www.crazygames.com/game/mahjongg-solitaire'], ['Puzzle', 'Quordle', 'https://www.merriam-webster.com/games/quordle/'], ['Puzzle', 'Contexto', 'https://contexto.me/'],
  ['Puzzle', 'Infinite Craft', 'https://neal.fun/infinite-craft/'], ['Puzzle', 'Semantle', 'https://semantle.com/'], ['Puzzle', 'The Password Game', 'https://neal.fun/password-game/'],
  ['Idle', 'Cookie Clicker', 'https://orteil.dashnet.org/cookieclicker/'], ['Idle', 'Universal Paperclips', 'https://www.decisionproblem.com/paperclips/'], ['Idle', 'A Dark Room', 'https://adarkroom.doublespeakgames.com/'],
  ['Idle', 'Candy Box 2', 'https://candybox2.github.io/'], ['Idle', 'Trimps', 'https://trimps.github.io/'], ['Idle', 'Clicker Heroes', 'https://www.clickerheroes.com/play.html'],
  ['Idle', "Spend Bill Gates' Money", 'https://neal.fun/spend/'], ['Idle', 'Antimatter Dimensions', 'https://ivark.github.io/AntimatterDimensions/'], ['Idle', 'Kittens Game', 'https://kittensgame.com/web/'],
  ['Action', 'Subway Surfers', 'https://poki.com/en/g/subway-surfers'], ['Action', 'Temple Run 2', 'https://poki.com/en/g/temple-run-2'], ['Action', 'Stickman Hook', 'https://poki.com/en/g/stickman-hook'],
  ['Action', 'Run 3', 'https://www.coolmathgames.com/0-run-3'], ['Action', 'Slope', 'https://www.crazygames.com/game/slope'], ['Action', 'Fireboy and Watergirl', 'https://www.coolmathgames.com/0-fireboy-and-water-girl-in-the-forest-temple'],
  ['Action', 'Geometry Dash (Scratch)', 'https://scratch.mit.edu/projects/105500895/'], ['Action', 'Tunnel Rush', 'https://www.crazygames.com/game/tunnel-rush'], ['Action', 'Getaway Shootout', 'https://www.crazygames.com/game/getaway-shootout'],
  ['Action', 'Crossy Road', 'https://poki.com/en/g/crossy-road'], ['Action', 'Bullet Force', 'https://www.crazygames.com/game/bullet-force-multiplayer'], ['Action', 'Happy Wheels', 'https://totaljerkface.com/happy_wheels.tjf'],
  ['Action', 'Bad Time Simulator', 'https://jcw87.github.io/c2-sans-fight/'],
  ['Racing', 'Moto X3M', 'https://poki.com/en/g/moto-x3m'], ['Racing', 'Drift Hunters', 'https://www.crazygames.com/game/drift-hunters'], ['Racing', 'HexGL', 'https://hexgl.bkcore.com/play/'],
  ['Racing', 'Madalin Stunt Cars 2', 'https://www.crazygames.com/game/madalin-stunt-cars-2'], ['Racing', 'Highway Racer', 'https://www.crazygames.com/game/highway-racer'], ['Racing', 'Eggy Car', 'https://www.crazygames.com/game/eggy-car'],
  ['Racing', 'Polytrack', 'https://www.kodub.com/apps/polytrack'],
  ['Sports', 'Retro Bowl', 'https://poki.com/en/g/retro-bowl'], ['Sports', 'Basketball Stars', 'https://poki.com/en/g/basketball-stars'], ['Sports', 'Football Legends', 'https://poki.com/en/g/football-legends'],
  ['Sports', '8 Ball Pool', 'https://www.miniclip.com/games/8-ball-pool-multiplayer/en/'], ['Sports', 'Penalty Shooters 2', 'https://www.crazygames.com/game/penalty-shooters-2'],
  ['Strategy', 'Bloons TD 5', 'https://www.crazygames.com/game/bloons-tower-defense-5'], ['Strategy', 'Kingdom Rush', 'https://www.crazygames.com/game/kingdom-rush'], ['Strategy', "Papa's Pizzeria", 'https://www.coolmathgames.com/0-papas-pizzeria'],
  ['Strategy', 'Chess vs Computer', 'https://www.chess.com/play/computer'], ['Strategy', 'Checkers', 'https://www.coolmathgames.com/0-checkers'], ['Strategy', 'Age of War', 'https://www.crazygames.com/game/age-of-war'],
  ['Strategy', 'Territory War', 'https://www.crazygames.com/game/territory-war'],
  ['Sandbox', 'Sandboxels', 'https://sandboxels.r74n.com/'], ['Sandbox', 'Powder Game', 'https://dan-ball.jp/en/javagame/dust/'], ['Sandbox', 'Townscaper', 'https://oskarstalberg.com/Townscaper/'],
];
const GAME_CATS = ['Multiplayer', 'Action', 'Racing', 'Sports', 'Puzzle', 'Arcade', 'Idle', 'Strategy', 'Sandbox'];

// The game library: thousands of HTML5 games from GameMonetize's publisher feed (see scripts/games-feed.mjs).
const PAGE = 120;
let libraryPromise;
const loadGameLibrary = () => libraryPromise || (libraryPromise = fetch('games/catalog.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => d.games.map(([h, name, cat, w, hh, tags]) => ({ name, cat, lib: true, url: `https://html5.gamemonetize.co/${h}/`, thumb: `https://img.gamemonetize.com/${h}/512x384.jpg`, sub: cat, s: `${name} ${tags} ${cat}`.toLowerCase() })))
  .catch(e => { libraryPromise = null; throw e; }));
const thumbFail = img => { const s = document.createElement('span'); s.className = 'hub-thumb'; s.textContent = img.dataset.fb || '?'; img.replaceWith(s); };

// Opens a site through the proxy browser in app mode (most game sites refuse to load in a plain frame).
const openWeb = (name, url, icon) => WM.open({ title: name, icon: icon || favIcon(url), w: 1100, h: 720, content: (b, w) => BrowserApp(b, w, { url, single: true, title: name }) });

// HitBoy's own sites: installed for everyone (see OS.load in os.js) and shown at the top of Movies.
const HITBOY_SITES = [
  { id: 'hitboyflix', name: 'HitBoyFlix', icon: { img: 'icons/sites/hitboyflix.png' }, desc: 'Movies and TV', url: 'https://hitboyflix.vercel.app/', cat: 'HitBoy' },
  { id: 'hitboystream', name: 'HitBoyStream', icon: { img: 'icons/sites/hitboystream.png' }, desc: 'Shows, movies and live streams', url: 'https://hitboystream.vercel.app/', cat: 'HitBoy' },
  { id: 'navianime', name: 'NaviAnime', icon: { img: 'icons/sites/navianime.svg' }, desc: 'Anime, sub and dub', url: 'https://navianime.vercel.app/', cat: 'HitBoy' },
];
STORE.unshift(...HITBOY_SITES);

// More App Store entries (opened through the proxy as well).
STORE.push(
  { id: 'sculptgl', name: 'SculptGL', fav: 1, desc: '3D sculpting (Blender-style)', url: 'https://stephaneginier.com/sculptgl/', cat: 'Create' },
  { id: 'threeeditor', name: 'three.js Editor', fav: 1, desc: '3D scene editor', url: 'https://threejs.org/editor/', cat: 'Create' },
  { id: 'tinkercad', name: 'Tinkercad', fav: 1, desc: '3D design for beginners', url: 'https://www.tinkercad.com/', cat: 'Create' },
  { id: 'minipaint', name: 'miniPaint', fav: 1, desc: 'Image editor', url: 'https://viliusle.github.io/miniPaint/', cat: 'Create' },
  { id: 'kleki', name: 'Kleki', fav: 1, desc: 'Digital painting', url: 'https://kleki.com/', cat: 'Create' },
  { id: 'pixlr', name: 'Pixlr', fav: 1, desc: 'Photo editor', url: 'https://pixlr.com/x/', cat: 'Create' },
  { id: 'audiomass', name: 'AudioMass', fav: 1, desc: 'Audio editor (Audacity-style)', url: 'https://audiomass.co/', cat: 'Create' },
  { id: 'excalidraw', name: 'Excalidraw', fav: 1, desc: 'Whiteboard', url: 'https://excalidraw.com/', cat: 'Create' },
  { id: 'drawio', name: 'diagrams.net', fav: 1, desc: 'Diagrams and flowcharts', url: 'https://app.diagrams.net/', cat: 'Create' },
  { id: 'squoosh', name: 'Squoosh', fav: 1, desc: 'Image compressor', url: 'https://squoosh.app/', cat: 'Tools' },
  { id: 'gdocs', name: 'Google Docs', fav: 1, desc: 'Documents, Sheets, Slides', url: 'https://docs.google.com/', cat: 'Productivity' },
  { id: 'office', name: 'Microsoft 365', fav: 1, desc: 'Word, Excel, PowerPoint online', url: 'https://www.office.com/', cat: 'Productivity' },
  { id: 'notion', name: 'Notion', fav: 1, desc: 'Notes and wikis', url: 'https://www.notion.so/', cat: 'Productivity' },
  { id: 'figma', name: 'Figma', fav: 1, desc: 'Design', url: 'https://www.figma.com/', cat: 'Productivity' },
  { id: 'canva', name: 'Canva', fav: 1, desc: 'Graphic design', url: 'https://www.canva.com/', cat: 'Productivity' },
  { id: 'desmos', name: 'Desmos', fav: 1, desc: 'Graphing calculator', url: 'https://www.desmos.com/calculator', cat: 'Education' },
  { id: 'geogebra', name: 'GeoGebra', fav: 1, desc: 'Math tools', url: 'https://www.geogebra.org/calculator', cat: 'Education' },
  { id: 'onlinegdb', name: 'OnlineGDB', fav: 1, desc: 'Compile and run code', url: 'https://www.onlinegdb.com/', cat: 'Create' },
  { id: 'replit', name: 'Replit', fav: 1, desc: 'Code in the browser', url: 'https://replit.com/', cat: 'Create' },
  { id: 'tubi', name: 'Tubi', fav: 1, desc: 'Free movies and TV (ads)', url: 'https://tubitv.com/', cat: 'Movies & TV' },
  { id: 'plutotv', name: 'Pluto TV', fav: 1, desc: 'Free live TV (ads)', url: 'https://pluto.tv/', cat: 'Movies & TV' },
  { id: 'plex', name: 'Plex', fav: 1, desc: 'Free movies and TV (ads)', url: 'https://www.plex.tv/watch-free/', cat: 'Movies & TV' },
  { id: 'kanopy', name: 'Kanopy', fav: 1, desc: 'Free with a library card', url: 'https://www.kanopy.com/', cat: 'Movies & TV' },
);

// ---- Games hub (replaces the earlier one) ----
APPS.games = ALL_APPS.games = { ...APPS.games, w: 980, h: 660, run(body) {
  let cat = 'All', q = '';
  const custom = () => JSON.parse(localStorage.getItem('novaos.customGames') || '[]');
  const builtin = Object.entries(GAME_APPS).map(([id, g]) => ({ name: g.name, cat: 'Built-in', app: id, icon: g.icon, sub: g.desc, s: g.name.toLowerCase() }))
    .concat(Object.entries(DOS_APPS).map(([id, g]) => ({ name: g.name, cat: 'Built-in', app: id, icon: g.icon, sub: g.desc, s: g.name.toLowerCase() })));
  const web = () => WEB_CATALOG.map(([c, name, url, img]) => ({ name, cat: c, url, icon: img ? realIcon(img) : favIcon(url), sub: new URL(url).hostname.replace(/^www\./, ''), s: name.toLowerCase() }))
    .concat(custom().map((g, i) => ({ name: g.name, cat: 'My games', url: g.url, icon: favIcon(g.url), sub: 'Added by you', rm: i, s: g.name.toLowerCase() })));
  // The big library (public/games/catalog.json, built by `npm run games`) loads on first open; only one page of cards is drawn at a time.
  let lib = [], libState = 'loading', shown = PAGE, list = [];
  const libCounts = () => { const m = {}; for (const g of lib) m[g.cat] = (m[g.cat] || 0) + 1; return m; };
  loadGameLibrary().then(g => { lib = g; libState = 'ready'; draw(); }, () => { libState = 'failed'; draw(); });
  const card = g => `<div class="hub-card${g.lib ? ' lib' : ''}" ${g.app ? `data-app="${g.app}"` : `data-url="${esc(g.url)}" data-name="${esc(g.name)}"`}>${g.lib ? `<img class="hub-thumb" src="${esc(g.thumb)}" width="128" height="96" alt="" loading="lazy" draggable="false" data-fb="${esc(g.name[0] || '?')}" onerror="thumbFail(this)">` : tile(g.icon, 48)}<b>${esc(g.name)}</b><small>${esc(g.sub)}</small>${g.rm !== undefined ? `<button class="icon-btn hub-rm" data-rm="${g.rm}" title="Remove">${glyph('trash', 14)}</button>` : ''}</div>`;
  const grid = (append) => {
    const g = body.querySelector('.hub-grid'), from = append ? g.querySelectorAll('.hub-card').length : 0, end = Math.min(list.length, shown);
    const html = list.slice(from, end).map(card).join('');
    if (append) g.querySelector('.hub-more')?.remove(); else { g.innerHTML = ''; g.scrollTop = 0; }
    g.insertAdjacentHTML('beforeend', html || (append ? '' : `<div class="empty">${libState === 'loading' ? 'Loading the game library…' : 'No games match.'}</div>`));
    if (end < list.length) g.insertAdjacentHTML('beforeend', `<button class="hub-more ghost">Show more (${(list.length - end).toLocaleString()} left)</button>`);
    body.querySelector('.hub-n').textContent = `${list.length.toLocaleString()} games`;
  };
  const filter = () => {
    const words = q.split(/\s+/).filter(Boolean);
    list = [...builtin, ...web(), ...lib].filter(g => (cat === 'All' || g.cat === cat) && words.every(w => g.s.includes(w)));
    shown = PAGE;
  };
  const draw = () => {
    const mine = web().filter(g => g.cat === 'My games').length, base = [...builtin, ...web()], counts = libCounts(), n = c => c === 'All' ? base.length + lib.length : base.filter(g => g.cat === c).length + (counts[c] || 0);
    const extra = Object.keys(counts).filter(c => !GAME_CATS.includes(c)).sort((a, b) => counts[b] - counts[a]);
    const cats = ['All', 'Built-in', ...GAME_CATS, ...extra, ...(mine ? ['My games'] : [])];
    filter();
    body.innerHTML = `<div class="hub"><nav>${cats.map(c => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}">${esc(c)}<span>${n(c).toLocaleString()}</span></button>`).join('')}</nav>
      <section><div class="hub-head"><div><h3>${cat === 'All' ? 'Games' : esc(cat)}</h3><p class="muted small"><span class="hub-n"></span> · ${libState === 'failed' ? 'the game library couldn’t load · ' : libState === 'loading' ? 'loading the library… · ' : ''}built-in ones work offline; web games open through the proxy</p></div>
        <input class="hub-q" placeholder="Search games" value="${esc(q)}"></div>
      <div class="hub-grid"></div>
      <div class="row hub-add"><input class="gn" placeholder="Name" style="width:160px"><input class="gu grow" placeholder="Add any game by its address: https://…"><button class="primary ga">Add game</button></div></section></div>`;
    grid(false);
    let timer; const qi = body.querySelector('.hub-q'); qi.oninput = () => { clearTimeout(timer); timer = setTimeout(() => { q = qi.value.trim().toLowerCase(); filter(); grid(false); }, 120); };
  };
  body.onclick = e => {
    if (e.target.closest('.hub-more')) { shown += PAGE; return grid(true); }
    const rm = e.target.closest('[data-rm]'); if (rm) { const c = custom(); c.splice(+rm.dataset.rm, 1); localStorage.setItem('novaos.customGames', JSON.stringify(c)); return draw(); }
    const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; return draw(); }
    if (e.target.closest('.ga')) {
      const name = body.querySelector('.gn').value.trim(), url = body.querySelector('.gu').value.trim();
      if (!name || !/^https?:\/\//.test(url)) return OS.toast('Enter a name and a full http(s) address.');
      localStorage.setItem('novaos.customGames', JSON.stringify([...custom(), { name, url }])); cat = 'My games'; return draw();
    }
    const g = e.target.closest('.hub-card'); if (!g) return;
    if (g.dataset.app) OS.launch(g.dataset.app); else openWeb(g.dataset.name, g.dataset.url);
  };
  draw();
} };

// ---- Movies ----
const MOVIE_ROWS = [
  ['Featured', 'identifier:(his_girl_friday OR charlie_chaplin_film_fest OR night_of_the_living_dead_dvd OR Sintel OR BigBuckBunny_124)'],
  ['Classic movies', 'collection:feature_films AND year:[1930 TO 1965]'],
  ['Comedy', 'collection:Comedy_Films'], ['Film noir', 'collection:film_noir'], ['Sci-fi & horror', 'collection:SciFi_Horror'],
  ['Silent films', 'collection:silent_films'], ['Cartoons', 'collection:classic_cartoons'],
];
const MOVIE_FILTER = ' AND mediatype:movies AND NOT subject:(adult OR erotica OR nudity OR sexploitation OR exploitation)';
const archiveSearch = async (query, rows = 24, extra = '') => {
  const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query + MOVIE_FILTER + extra)}&fl[]=identifier&fl[]=title&fl[]=year&sort[]=downloads+desc&rows=${rows}&output=json`;
  return ((await (await fetch(u)).json()).response.docs || []).filter(d => !/sex|nude|strip|burlesque|concentration camp/i.test(d.title || ''));
};
APPS.movies = ALL_APPS.movies = { name: 'Movies', icon: realIcon('kodi'), cat: 'Apps', w: 1000, h: 680, run(body, win) {
  body.innerHTML = `<div class="movies"><div class="mv-head"><h3>Movies</h3><span class="muted small grow">Thousands of public-domain films from the Internet Archive</span>
      <input class="mv-q" placeholder="Search films"><button class="ghost" data-a="free">${glyph('media', 14)}Free TV services</button></div><div class="mv-body"></div></div>`;
  const main = body.querySelector('.mv-body');
  const card = d => `<button class="mv-card" data-id="${esc(d.identifier)}" data-title="${esc(d.title || d.identifier)}"><img loading="lazy" alt="" src="https://archive.org/services/img/${encodeURIComponent(d.identifier)}"><b>${esc(d.title || d.identifier)}</b><small>${d.year || ''}</small></button>`;
  const home = async () => {
    main.innerHTML = `<div class="mv-row"><h4>HitBoy</h4><div class="mv-sites">${HITBOY_SITES.map(x => `<button class="mv-site" data-svc="${x.id}">${tile(x.icon, 40)}<span><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span></button>`).join('')}</div></div>` + MOVIE_ROWS.map(([name], i) => `<div class="mv-row"><h4>${name}</h4><div class="mv-strip" data-row="${i}"><div class="spinner"></div></div></div>`).join('');
    MOVIE_ROWS.forEach(async ([, q], i) => {
      const strip = main.querySelector(`[data-row="${i}"]`);
      try { const docs = await archiveSearch(q, 24, ' AND NOT subject:(documentary OR propaganda OR newsreel)'); if (strip) strip.innerHTML = docs.map(card).join('') || '<span class="muted small">Nothing here right now.</span>'; }
      catch (e) { if (strip) strip.innerHTML = '<span class="muted small">Could not reach the Internet Archive.</span>'; }
    });
  };
  const play = async (id, title) => {
    main.innerHTML = `<div class="mv-player"><button class="ghost" data-a="home">${glyph('back', 14)}Back</button><h3>${esc(title)}</h3><div class="mv-video"><div class="spinner"></div></div><p class="muted small mv-desc"></p></div>`;
    WM.setTitle(win, title + ' — Movies');
    try {
      const [files, meta] = await Promise.all([fetch(`https://archive.org/metadata/${id}/files`).then(r => r.json()), fetch(`https://archive.org/metadata/${id}/metadata`).then(r => r.json())]);
      // Prefer MP4 (plays everywhere), then WebM, then Ogg; the full-quality file unless it's huge, else the 512kb copy.
      const rank = f => ['mp4', 'm4v', 'webm', 'ogv'].indexOf(extOf(f.name)), vids = (files.result || []).filter(f => rank(f) >= 0).sort((a, b) => rank(a) - rank(b));
      const pick = vids.find(f => !/512kb/i.test(f.name) && (+f.size || 0) < 1.5e9) || vids[0];
      const box = main.querySelector('.mv-video');
      if (!pick) { box.innerHTML = '<p class="muted">No playable video file for this one.</p>'; return; }
      box.innerHTML = `<video controls autoplay playsinline src="https://archive.org/download/${encodeURIComponent(id)}/${pick.name.split('/').map(encodeURIComponent).join('/')}"></video>`;
      const desc = new DOMParser().parseFromString(String(meta.result?.description || ''), 'text/html').body.textContent.trim();
      main.querySelector('.mv-desc').textContent = (meta.result?.year ? meta.result.year + ' · ' : '') + desc.slice(0, 600);
    } catch (e) { main.querySelector('.mv-video').innerHTML = '<p class="muted">Could not load this film.</p>'; }
  };
  const free = () => {
    const svc = STORE.filter(s => s.cat === 'Movies & TV');
    main.innerHTML = `<div class="pad"><button class="ghost" data-a="home">${glyph('back', 14)}Back</button><h3 style="margin:12px 0 4px">Free, legal streaming services</h3>
      <p class="muted small">These are ad-supported or free with a library card. They open through the proxy browser; some are only available in certain countries.</p>
      <div class="cards" style="padding:12px 0">${svc.map(s => card2(s)).join('')}</div></div>`;
  };
  const card2 = s => `<div class="card" data-svc="${s.id}">${tile(favIcon(s.url), 40)}<div class="meta"><div class="name">${esc(s.name)}</div><div class="sub">${esc(s.desc)}</div></div></div>`;
  body.onclick = e => {
    const c = e.target.closest('.mv-card'); if (c) return play(c.dataset.id, c.dataset.title);
    const s = e.target.closest('[data-svc]'); if (s) { const x = STORE.find(t => t.id === s.dataset.svc); return openWeb(x.name, x.url, storeIcon(x)); }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'home') { WM.setTitle(win, 'Movies'); home(); } if (a === 'free') free();
  };
  const qi = body.querySelector('.mv-q');
  qi.onkeydown = async e => {
    if (e.key !== 'Enter' || !qi.value.trim()) return;
    main.innerHTML = '<div class="mv-row"><h4>Results</h4><div class="mv-grid"><div class="spinner"></div></div></div>';
    try { const docs = await archiveSearch(`(collection:(feature_films OR classic_cartoons OR silent_films OR film_noir OR SciFi_Horror OR Comedy_Films)) AND title:(${qi.value.trim().replace(/[()":]/g, ' ')})`, 60); main.querySelector('.mv-grid').innerHTML = docs.map(card).join('') || '<p class="muted">No films found.</p>'; }
    catch (err) { main.querySelector('.mv-grid').innerHTML = '<p class="muted">Could not reach the Internet Archive.</p>'; }
  };
  home();
} };

// ---- Recorder (OBS-style): screens, cameras and a microphone mixed into one scene → WebM/MP4 file ----
// quality: [width, height, fps, video bits per second]
const REC_QUALITY = { '480p30': [854, 480, 30, 2.5e6], '720p30': [1280, 720, 30, 5e6], '1080p30': [1920, 1080, 30, 8e6], '1080p60': [1920, 1080, 60, 12e6] };
const REC_MIME = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'];
APPS.recorder = ALL_APPS.recorder = { name: 'Recorder', icon: realIcon('obs'), cat: 'Apps', w: 980, h: 700, run(body, win) {
  body.innerHTML = `<div class="rec">
    <div class="toolbar">
      <button class="ghost small" data-a="screen" title="Share a screen, window or tab">${glyph('vm', 14)}Add screen</button>
      <button class="ghost small" data-a="cam">${glyph('media', 14)}Add camera</button>
      <select data-camdev class="small rec-dev" title="Camera"><option value="">Default camera</option></select><div class="sep"></div>
      <label class="row small"><input type="checkbox" class="switch" data-mic> Microphone</label>
      <select data-micdev class="small rec-dev" title="Microphone"><option value="">Default microphone</option></select>
      <div class="rec-meter" title="Audio level"><i></i></div>
      <span class="grow"></span><span class="rec-time small"></span>
      <button class="small" data-a="pause" disabled>Pause</button><button class="small" data-a="dl" disabled title="Download the last recording">Download</button>
      <button class="primary" data-a="rec">${glyph('power', 14)}<span>Start recording</span></button></div>
    <div class="toolbar">
      <span class="small muted">Layout</span><select data-layout class="small"><option value="pip">Screen + camera</option><option value="side">Side by side</option><option value="screen">Screen only</option><option value="cam">Camera only</option></select>
      <span class="small muted">Camera</span><select data-pos class="small"><option value="br">Bottom right</option><option value="bl">Bottom left</option><option value="tr">Top right</option><option value="tl">Top left</option></select>
      <input type="range" min="10" max="50" value="25" data-size style="width:90px" title="Camera size"><input class="small" data-text placeholder="Text overlay" style="width:140px">
      <span class="grow"></span><span class="small muted">Quality</span><select data-quality class="small"><option value="480p30">480p · 30 fps</option><option value="720p30" selected>720p · 30 fps</option><option value="1080p30">1080p · 30 fps</option><option value="1080p60">1080p · 60 fps</option></select></div>
    <div class="rec-stage"><canvas width="1280" height="720"></canvas><div class="rec-hint">Add your screen, a window or a tab, and/or your camera, then press Start recording. Recordings are saved to Videos in Files.</div></div>
    <div class="rec-sources"></div></div>`;
  const cv = body.querySelector('canvas'), x = cv.getContext('2d'), $r = s => body.querySelector(s);
  const src = {}, vids = {}, names = { screen: 'Screen / window', cam: 'Camera', mic: 'Microphone' };
  let rec = null, chunks = [], last = null, quality = REC_QUALITY['720p30'], t0 = 0, pausedAt = 0, pausedTotal = 0, stopTick = () => {};

  // One shared audio graph: every source with sound feeds a mixer that the recorder and Live both read.
  const mix = { ac: null, dest: null, an: null, nodes: {} };
  const audioCtx = () => {
    if (!mix.ac) { mix.ac = new AudioContext(); mix.dest = mix.ac.createMediaStreamDestination(); mix.an = mix.ac.createAnalyser(); mix.an.fftSize = 512; }
    if (mix.ac.state === 'suspended') mix.ac.resume().catch(() => {});
    return mix.ac;
  };
  const unwire = key => { const n = mix.nodes[key]; if (n) { n.src.disconnect(); n.gain.disconnect(); delete mix.nodes[key]; } };
  const wire = (key, stream) => {
    unwire(key); if (!stream.getAudioTracks().length) return;
    const ac = audioCtx(), s = ac.createMediaStreamSource(new MediaStream(stream.getAudioTracks())), gain = ac.createGain();
    s.connect(gain); gain.connect(mix.dest); gain.connect(mix.an); mix.nodes[key] = { src: s, gain, muted: false };
  };
  // Only add an audio track when there's a source: a silent one stalls some recorders.
  const audioTracks = () => Object.keys(mix.nodes).length ? mix.dest.stream.getAudioTracks() : [];
  const sceneStream = fps => new MediaStream([...cv.captureStream(fps).getVideoTracks(), ...audioTracks()]);
  // Live Chat can stream this composed scene (Go live → Recorder scene).
  const scene = { cv, stream: () => sceneStream(30) }; window.RecorderScene = scene;

  const chips = () => {
    $r('.rec-sources').innerHTML = Object.keys(src).filter(k => src[k]).map(k => `<span class="rec-chip"><b>${names[k]}</b>${mix.nodes[k] ? `<button class="ghost small" data-mute="${k}">${mix.nodes[k].muted ? 'Unmute' : 'Mute'}</button>` : ''}<button class="ghost small" data-del="${k}" title="Remove">✕</button></span>`).join('') || '<span class="muted small">No sources yet</span>';
    $r('.rec-hint').style.display = src.screen || src.cam ? 'none' : '';
  };
  const drop = key => {
    src[key]?.getTracks().forEach(t => { t.onended = null; t.stop(); });
    src[key] = null; delete vids[key]; unwire(key);
    if (key === 'mic') $r('[data-mic]').checked = false;
    chips();
  };
  const take = (key, stream) => {
    if (src[key]) drop(key);
    src[key] = stream;
    if (key !== 'mic') { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = stream; v.play().catch(() => {}); vids[key] = v; }
    else $r('[data-mic]').checked = true;
    wire(key, stream);
    stream.getTracks().forEach(t => { t.onended = () => { if (src[key] === stream) { drop(key); OS.toast(`${names[key]} stopped.`); } }; });
    chips();
  };

  const fill = (sel, list, label) => {
    const cur = sel.value;
    sel.innerHTML = `<option value="">Default ${label}</option>` + list.filter(i => i.deviceId && !/^(default|communications)$/.test(i.deviceId)).map((i, n) => `<option value="${esc(i.deviceId)}">${esc(i.label || `${label} ${n + 1}`)}</option>`).join('');
    sel.value = cur;
  };
  const devices = async () => {
    try { const d = await navigator.mediaDevices.enumerateDevices(); fill($r('[data-camdev]'), d.filter(i => i.kind === 'videoinput'), 'camera'); fill($r('[data-micdev]'), d.filter(i => i.kind === 'audioinput'), 'microphone'); } catch (e) {}
  };
  navigator.mediaDevices?.addEventListener?.('devicechange', devices); devices();

  const add = async kind => {
    if (!navigator.mediaDevices) return OS.toast('Capture needs a secure page (HTTPS or localhost).');
    try {
      if (kind === 'screen') take('screen', await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: quality[2] }, audio: true }));
      else { const id = $r('[data-camdev]').value; take('cam', await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true })); }
      devices();
    } catch (e) { OS.toast(kind === 'screen' ? 'Screen sharing was cancelled or blocked.' : 'No camera, or camera access was blocked.'); }
  };
  const setMic = async on => {
    if (!on) return drop('mic');
    if (!navigator.mediaDevices) { $r('[data-mic]').checked = false; return OS.toast('Capture needs a secure page (HTTPS or localhost).'); }
    try { const id = $r('[data-micdev]').value; take('mic', await navigator.mediaDevices.getUserMedia({ audio: { deviceId: id ? { exact: id } : undefined, echoCancellation: true, noiseSuppression: true } })); devices(); }
    catch (e) { $r('[data-mic]').checked = false; OS.toast('Microphone access was blocked.'); }
  };

  // Composite the scene onto the canvas.
  const fit = (v, dx, dy, dw, dh, cover) => {
    const s = (cover ? Math.max : Math.min)(dw / v.videoWidth, dh / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
    x.save(); x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); x.drawImage(v, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h); x.restore();
  };
  const ready = k => vids[k]?.videoWidth > 0 ? vids[k] : null;
  const level = new Uint8Array(512);
  const frame = () => {
    const W = cv.width, H = cv.height, layout = $r('[data-layout]').value, scr = ready('screen'), cam = ready('cam'), only = (a, b) => (a || b) && fit(a || b, 0, 0, W, H);
    x.fillStyle = '#111'; x.fillRect(0, 0, W, H);
    if (layout === 'side' && scr && cam) { fit(scr, 0, 0, W / 2, H); fit(cam, W / 2, 0, W / 2, H, true); }
    else if (layout === 'cam') only(cam, scr);
    else if (layout === 'screen') only(scr, cam);
    else if (layout === 'pip' && scr && cam) {
      fit(scr, 0, 0, W, H);
      const w = W * $r('[data-size]').value / 100, h = w * cam.videoHeight / cam.videoWidth, m = W * .02, pos = $r('[data-pos]').value;
      const px = pos.endsWith('r') ? W - w - m : m, py = pos.startsWith('b') ? H - h - m : m;
      x.save(); x.beginPath(); x.roundRect(px, py, w, h, W * .012); x.clip(); x.drawImage(cam, px, py, w, h); x.restore();
    } else only(scr, cam);
    const text = $r('[data-text]').value;
    if (text) { const fs = Math.round(H / 20); x.font = `600 ${fs}px Inter, sans-serif`; const tw = x.measureText(text).width; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(W * .02, H * .03, tw + fs, fs * 1.6); x.fillStyle = '#fff'; x.fillText(text, W * .02 + fs / 2, H * .03 + fs * 1.15); }
    if (rec) { const s = Math.floor(((pausedAt || Date.now()) - t0 - pausedTotal) / 1000); $r('.rec-time').textContent = `${pausedAt ? '❚❚' : '●'} ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
    let peak = 0; if (mix.an) { mix.an.getByteTimeDomainData(level); for (let i = 0; i < level.length; i++) peak = Math.max(peak, Math.abs(level[i] - 128)); }
    $r('.rec-meter i').style.width = Math.min(100, peak / 128 * 140) + '%';
  };
  // A worker timer keeps frames coming when the OS tab is in the background (rAF and page timers get throttled there).
  const ticker = (fn, ms) => {
    try { const w = new Worker(URL.createObjectURL(new Blob([`setInterval(()=>postMessage(0),${ms})`], { type: 'text/javascript' }))); w.onmessage = fn; return () => w.terminate(); }
    catch (e) { const i = setInterval(fn, ms); return () => clearInterval(i); }
  };
  const setQuality = key => {
    quality = REC_QUALITY[key]; cv.width = quality[0]; cv.height = quality[1];
    stopTick(); stopTick = ticker(frame, 1000 / quality[2]);
  };
  setQuality('720p30');

  const ui = () => {
    $r('[data-a="rec"] span').textContent = rec ? 'Stop recording' : 'Start recording';
    $r('[data-a="pause"]').disabled = !rec; $r('[data-a="pause"]').textContent = pausedAt ? 'Resume' : 'Pause';
    $r('[data-quality]').disabled = !!rec; $r('[data-a="dl"]').disabled = !last;
    if (!rec) $r('.rec-time').textContent = '';
  };
  const start = () => {
    if (!src.screen && !src.cam) return OS.toast('Add a screen or a camera first.');
    if (mix.ac) mix.ac.resume().catch(() => {});
    const stream = sceneStream(quality[2]), mimeType = REC_MIME.find(m => MediaRecorder.isTypeSupported(m)) || '';
    try { rec = new MediaRecorder(stream, { ...(mimeType && { mimeType }), videoBitsPerSecond: quality[3], audioBitsPerSecond: 128000 }); }
    catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { return OS.toast('This browser can’t record video.'); } }
    const r = rec, mime = (r.mimeType || mimeType || 'video/webm').split(';')[0], ext = mime === 'video/mp4' ? 'mp4' : 'webm';
    chunks = []; r.ondataavailable = e => e.data.size && chunks.push(e.data);
    r.onerror = e => OS.toast('Recording error: ' + (e.error?.message || 'unknown'));
    r.onstop = async () => {
      stream.getVideoTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: mime }); chunks = [];
      if (!blob.size) return OS.toast('Nothing was recorded.');
      last = { blob, name: `Recording ${new Date().toLocaleString().replace(/[/:,]/g, '-')}.${ext}` }; ui();
      try { const p = FS.freeName('/Videos', last.name); FS.writeBytes(p, new Uint8Array(await blob.arrayBuffer()), mime); OS.toast(`Saved ${p} (${(blob.size / 1048576).toFixed(1)} MB)`); }
      catch (e) { OS.toast('Couldn’t save to Files (storage full?). Use Download instead.'); }
    };
    r.start(1000); t0 = Date.now(); pausedAt = pausedTotal = 0; ui();
  };
  const stop = () => { const r = rec; rec = null; pausedAt = 0; if (r && r.state !== 'inactive') r.stop(); ui(); };

  body.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a, mute = e.target.closest('[data-mute]')?.dataset.mute, del = e.target.closest('[data-del]')?.dataset.del;
    if (a === 'screen' || a === 'cam') add(a);
    else if (a === 'rec') rec ? stop() : start();
    else if (a === 'pause' && rec) { if (pausedAt) { rec.resume(); pausedTotal += Date.now() - pausedAt; pausedAt = 0; } else { rec.pause(); pausedAt = Date.now(); } ui(); }
    else if (a === 'dl' && last) { const l = document.createElement('a'); l.href = URL.createObjectURL(last.blob); l.download = last.name; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 4000); }
    else if (mute) { const n = mix.nodes[mute]; n.muted = !n.muted; n.gain.gain.value = n.muted ? 0 : 1; chips(); }
    else if (del) drop(del);
  };
  body.onchange = e => {
    const t = e.target;
    if (t.matches('[data-mic]')) setMic(t.checked);
    else if (t.matches('[data-micdev]') && src.mic) setMic(true);
    else if (t.matches('[data-camdev]') && src.cam) add('cam');
    else if (t.matches('[data-quality]')) setQuality(t.value);
  };
  chips();
  win.cleanup.push(() => {
    stopTick(); stop();
    if (window.RecorderScene === scene) window.RecorderScene = null;
    navigator.mediaDevices?.removeEventListener?.('devicechange', devices);
    Object.keys(src).forEach(k => src[k]?.getTracks().forEach(t => { t.onended = null; t.stop(); }));
    setTimeout(() => mix.ac?.close().catch(() => {}), 1500);
  });
} };

// ---- App Store (replaces the earlier one): categories, search, installed list ----
APPS.store = ALL_APPS.store = { ...APPS.store, w: 1000, h: 680, run(body) {
  let cat = 'All', q = '';
  const draw = () => {
    const inst = OS.cfg.installed || [], cats = ['All', 'Installed', ...new Set(STORE.map(s => s.cat))];
    const count = c => c === 'All' ? STORE.length : c === 'Installed' ? inst.length : STORE.filter(s => s.cat === c).length;
    const list = STORE.filter(s => (cat === 'All' || (cat === 'Installed' ? inst.includes(s.id) : s.cat === cat)) && (!q || `${s.name} ${s.desc} ${s.cat}`.toLowerCase().includes(q)));
    body.innerHTML = `<div class="hub"><nav>${cats.map(c => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}">${esc(c)}<span>${count(c)}</span></button>`).join('')}</nav>
      <section><div class="hub-head"><div><h3>${cat === 'All' ? 'App Store' : esc(cat)}</h3><p class="muted small">${list.length} apps · installed apps go on your desktop and open through the proxy browser</p></div>
        <input class="hub-q" placeholder="Search apps" value="${esc(q)}"></div>
      <div class="store-grid">${list.map(s => card(storeIcon(s), s.name, s.desc, `data-id="${s.id}"`,
        inst.includes(s.id) ? `<button data-open="${s.id}">Open</button><button class="icon-btn" data-rm="${s.id}" title="Uninstall">${glyph('trash', 15)}</button>` : `<button class="primary" data-add="${s.id}">Get</button>`)).join('') || '<div class="empty">No apps match.</div>'}</div></section></div>`;
    const qi = body.querySelector('.hub-q'); qi.oninput = () => { q = qi.value.toLowerCase(); draw(); const n = body.querySelector('.hub-q'); n.focus(); n.setSelectionRange(99, 99); };
  };
  body.onclick = e => {
    const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; return draw(); }
    const d = (e.target.closest('button') || {}).dataset || {}, inst = OS.cfg.installed || [];
    if (d.add) { OS.set({ installed: [...inst, d.add] }); OS.syncApps(); OS.toast(STORE.find(s => s.id === d.add).name + ' was added to your desktop'); draw(); }
    if (d.rm) { OS.set({ installed: inst.filter(i => i !== d.rm) }); OS.syncApps(); draw(); }
    if (d.open) OS.launch('web:' + d.open);
  };
  draw();
} };
