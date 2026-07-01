# mmar-vizrep-client-react

A React port of the MMAR **visual-representation (VizRep) design** tool
(`mmar-vizrep-client`), built for functional parity with the Aurelia 2 original.
Same backend, same shared DTOs, same workflows — re-implemented on **React 18 +
TypeScript + Vite + MUI (Material UI) + Zustand**, with the Three.js rendering
engine ported **as-is** (imperative Three.js bridged to React through a canvas
`ref`, *not* react-three-fiber).

It is a single-page, **no-router** app. You log in, pick a **Class**,
**RelationClass** or **Port** from the left nav, edit its `vizRep(gc)` geometry
function in a Monaco editor, click **Preview** to build a live 3D representation
on a Three.js canvas, tweak attributes to see the preview update live, and **Save
to DB** to PATCH the geometry back onto the object.

## Architecture

- **`src/resources/store/`** — Zustand stores ported from the Aurelia services:
  - `selectedObjectStore` — the in-memory meta objects (`classes`,
    `relationClasses`, `ports`, `sceneTypes`) + current selection (port of the
    relevant slice of `SelectedObjectService`), with the `reref`/`revision`
    in-place-mutation reactivity trick.
  - `editorStore` — the Monaco buffer (`codeEditorValue`), `threeDimensional`
    (2D/3D), open scene-instance `tabs`, and the `readyForVizRepUpdate` gate.
  - `authStore` — login/logout, JWT in `localStorage["jwtToken"]` (note: the
    key differs from the metamodeling precedent's `auth_token`).
  - `logStore` — log list + MUI Snackbar. `uiStore` — refresh signal.
- **`src/resources/services/`** — framework-agnostic logic (plain TS, no React),
  ported from the original with the DI stripped out: `math-utility`,
  `file-utility`, `meta-utility` (incl. `parseMetaFunction`'s `new Function`
  executor), `instance-utility`, `expression-utility`, plus the small
  `backend-service` (the ~12 REST calls this client actually uses), the
  `event-bus` (replaces Aurelia's `EventAggregator`), the `logger` shim, `api.ts`
  and `save-selected.ts`.
- **`src/engine/`** — **the Three.js engine**, ported ~verbatim, plain TS, no
  React imports. Each old Aurelia class became a module singleton (`@singleton()`
  + DI removed). `engine/index.ts` is the composition root: it instantiates every
  singleton in dependency order and exports the `engine` facade
  (`mount(container)` / `unmount()` / `setThreeDimensional(is3d)`).
- **`src/views/`** — the UI as React + MUI components, one folder per region:
  `layout/`, `top-nav-bar/`, `toolbar-container/`, `main-body-tab-bar/`,
  `state-window/`, `left-nav/` + `object-list/` + `object-card/`, `middle-body/`
  + `code-editor/` + `three-canvas/` + `preview-buttons/`, `right-nav/` +
  `attribute-window/`, `log-window/`, `footer/`, `common/`, `auth/`.

## The core loop

```
pick object (left nav)  →  its geometry loads into Monaco (editorStore)
        │
        ▼  click Preview
CodeEditor flushes editor text onto object.geometry, publishes updatedGeometryValue
        │
        ▼
preview-pipeline.runPreview(): reset engine, build a mock scene + instance,
parseMetaFunction(code) → gc.runVizRepFunction → gc.drawVizRep[_rel]  →  3D canvas
        │
        ▼  edit an attribute value
attributeInstance.value mutated in place → vizrepUpdateChecker.checkForVizRepUpdate
→ gc re-runs the VizRep → canvas redraws (animation loop)
        │
        ▼  Save to DB (or Ctrl+S)
backendService.{classes,relationClasses,ports}PATCH(object.geometry)
```

## Shared DTOs (`@gds`)

The shared TypeScript DTOs in the sibling `../mmar-global-data-structure` are
consumed **unchanged** via a path alias `@gds` (configured in both
`vite.config.ts` and `tsconfig.json`). They are not copied or npm-installed.
DTOs are (de)serialized with `class-transformer` exactly as the original does
(`SomeType.fromJS(json)`); `reflect-metadata` is imported as the **first line**
of `src/main.tsx`. Because the gds `User` class statically imports the Node-only
`jsonwebtoken`, the browser build **aliases it to a stub**
(`src/stubs/jsonwebtoken.ts` + `optimizeDeps.exclude`).

## Configuration

Config comes from Vite env vars (`import.meta.env.VITE_*`), surfaced through
`src/config.ts`:

| Var | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of `mmar-server` (browser context) |
| `PORT` | `8095` | Dev-server port |

Set them in `.env` / `.env.development`. The browser runs on the host, so keep
`VITE_API_URL=http://localhost:8000` even inside Docker. The dev port is **8095**
(8090 is held by the running original Aurelia VizRep client, for side-by-side
comparison).

## Run / build

```bash
npm install
npm run dev        # Vite dev server on http://localhost:8095
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run lint       # eslint
```

The app talks to **`mmar-server` on `:8000`** (start it with
`cd ../mmar-server && npm run debug`, plus a reachable Postgres seeded from
`mmar-database/init.sql`). Log in with the dev credentials (`admin` / `admin`).

> **Build note:** Monaco is **self-hosted** (its workers are bundled via Vite
> `?worker`, not loaded from a CDN), so `vite build` emits a large main chunk plus
> per-language worker chunks and prints a "chunks > 500 kB" warning. That warning
> is **informational, not a failure**.

## Scope

Core parity with the Aurelia client: auth, the three left-nav lists
(Class/RelationClass/Port), Monaco editing with `gc` IntelliSense, the live 3D
preview (including on attribute edits), Save to DB, the attribute window, the log
panel, the 2D/3D toggle, and the keyboard shortcuts (Ctrl+S save, arrow-key
nudge). The intentionally-inert parts of the original — disabled top-nav menus,
zoom/undo/redo toolbar stubs, and the never-implemented upload/table/reference
attribute dialogs — are rendered as static stubs. **WebXR/AR is deferred** (see
`plan.md` P11).
