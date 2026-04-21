# bsky-head

## Local

```
npm install
npm run dev
```

```
http://localhost:8000/p/${BLUESKY_ACCOUNT}
```

ex: http://localhost:8000/p/bsky.app

## Deno Deploy

```
https://bsky-head.chibat.workers.dev/p/${BLUESKY_ACCOUNT}
```

ex: https://bsky-head.chibat.workers.dev/p/bsky.app

---

```txt
npm install
npm run dev
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
