# Game URL lists

Add JSON files here to extend the Games catalog. Each file is an array of objects:

```json
[
  { "cat": "Arcade", "name": "Example Game", "url": "https://example.com/play" }
]
```

Run `npm run games` to merge these with `WEB_CATALOG` in `public/js/catalog.js` and `catalog-data.js`. Only use real, verifiable play URLs — no generated titles.