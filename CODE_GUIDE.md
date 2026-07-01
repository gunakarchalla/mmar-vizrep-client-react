# Code guide (React + Three.js newcomer-friendly)

A walkthrough of `mmar-vizrep-client-react` for someone new to this codebase. It
doubles as a short tour of the two things that make this app unusual: **Zustand
state** and an **imperative Three.js engine bridged into React by a `ref`**. For
the terse reference-style overview see [README.md](README.md); this file is the
narrated version. See the sibling `mmar-metamodeling-client-react/CODE_GUIDE.md`
for a fuller React-from-scratch primer — this app follows the same conventions.

---

## What this app is

`mmar-vizrep-client-react` is a **rewrite** of the Aurelia VizRep client
(`../mmar-vizrep-client`) on React + Vite + MUI + Zustand. Functionally it is the
same tool: you design **how a metamodel object looks in 3D** by writing a
`vizRep(gc)` JavaScript function that calls a *GraphicContext* API
(`gc.graphic_cube(...)`, `gc.graphic_sphere(...)`, `gc.rel_graphic_line(...)`, …)
to build a Three.js scene. It talks to the same `mmar-server` on port 8000 and
uses the same shared data classes (`@gds`).

The stack swap:

| Concern | Old (Aurelia) | New (React) |
|---|---|---|
| UI framework | Aurelia 2 | **React 18** |
| State / services | DI services + EventAggregator | **Zustand** stores + `event-bus` |
| UI components | `@aurelia-mdc-web` | **MUI** (Material UI) |
| Build tool | webpack | **Vite** |
| 3D | raw Three.js (imperative) | **same raw Three.js**, bridged by a canvas `ref` |
| Code editor | Monaco | **`@monaco-editor/react`** (self-hosted workers) |

---

## The three layers

The code splits cleanly into three layers, and understanding which layer a file
belongs to tells you its rules:

1. **`src/engine/`** — the Three.js engine. Plain imperative TypeScript, **no
   React**. Ported almost verbatim from the old Aurelia classes; the only edits
   were mechanical (remove `@singleton()`/Aurelia DI, swap `EventAggregator` for
   the `event-bus`, swap the `Logger` for the `logger` shim, fix import paths).
   Every file exports a **module singleton** (e.g. `export const graphicContext =
   new GraphicContext()`). It mutates a big shared state holder, `globalObject`.
2. **`src/resources/`** — framework-agnostic services (`services/`) and the
   Zustand `store/`. Also no React in `services/`; the stores are React-aware but
   usable imperatively via `getState()`.
3. **`src/views/`** — the React + MUI UI. Components read state from Zustand and
   drive the engine through the `engine` facade and the `event-bus`.

---

## The engine and how React touches it

### `globalObject` — the shared mutable state ([engine/global-definition.ts](src/engine/global-definition.ts))

The old client kept one giant `GlobalDefinition` object holding the Three.js
scene, cameras, renderer, orbit controls, raycasters, the current instances, etc.
It is ported verbatim as the module singleton `globalObject`. **The whole engine
reads and writes `globalObject.*` directly.** (Importing it constructs a
`THREE.WebGLRenderer`, so engine modules can't be imported in a node/jsdom test
without a WebGL stub.)

### The composition root ([engine/index.ts](src/engine/index.ts))

Because the engine singletons have circular dependencies (graphic-context ↔
instance/expression utilities ↔ vizrep-update-checker), they must be constructed
in a fixed order. `engine/index.ts` imports them in dependency order so the
`new ClassName()` side effects run deterministically, then exports them plus the
`engine` facade:

- `engine.mount(container)` — the old `my-app.attached()` flow: sets
  `globalObject.elementContainer` and runs `initiator.init()` +
  `initEventListeners()` **once** (guarded by an `initialized` flag so React
  StrictMode's double-mount is a cheap re-attach). Attaches the renderer canvas to
  `container`.
- `engine.unmount()` — stops the animation loop and detaches the canvas (keeps the
  singleton scene, so a later mount is cheap).
- `engine.setThreeDimensional(is3d)` — the 2D/3D toggle: swaps the active camera +
  orbit controls (perspective/orthographic) and flags a re-render.

### The bridge ([views/three-canvas/ThreeCanvas.tsx](src/views/three-canvas/ThreeCanvas.tsx))

This is the **one place** React and the engine meet. A `<div ref>` gets handed to
`engine.mount(ref.current)` inside a `useEffect` with an empty dependency array
(so it runs once), and `engine.unmount()` in the cleanup. A `ResizeObserver`
calls the engine's `resize`. That's the whole trick: React owns the DOM box, the
engine owns everything inside the `<canvas>`, and they never fight because React
never re-renders the canvas's contents.

### The render loop

`renderer.setAnimationLoop(arInitiator.render)` runs every frame, but
`animator.animate()` only actually re-renders when `globalObject.render === true`
(a dirty flag). So engine code that changes the scene sets `globalObject.render =
true` and the next frame paints it — you'll see this everywhere (orbit controls,
attribute edits, the arrow-key nudge).

---

## The stores ([src/resources/store/](src/resources/store/))

Zustand stores replace the Aurelia DI services. A store is made with `create(...)`
and holds both data and the functions that change it. Read them two ways:
`useStore((s) => s.slice)` (hook form) **inside a component's render body** — it
subscribes and re-renders; `useStore.getState()` **in handlers / services /
engine code** — it just reads/calls without subscribing.

- **[selectedObjectStore.ts](src/resources/store/selectedObjectStore.ts)** — the
  in-memory meta objects (`classes`, `relationClasses`, `ports`, `sceneTypes`)
  plus the current selection (`selectedObject` + `type`). Trimmed to the four
  collections the VizRep tool needs (the metamodeling precedent had ~10). It also
  carries the **`reref` + `revision`** trick: gds objects are class instances
  mutated *in place*, so they stay `===` their old self and React would miss the
  change; `reref` clones-with-prototype to give a new identity and bumps a
  `revision` counter that edit-sensitive components subscribe to.
- **[editorStore.ts](src/resources/store/editorStore.ts)** — the Monaco buffer
  (`codeEditorValue`, seeded with a default sample VizRep), `threeDimensional`,
  the open scene `tabs`, and `readyForVizRepUpdate`. It is the **React-facing
  mirror** of the UI fields that also live on `globalObject`; views sync the two.
- **[authStore.ts](src/resources/store/authStore.ts)** — login/logout; JWT in
  `localStorage["jwtToken"]` (**not** the precedent's `auth_token`). Publishes the
  `login` bus event on success; restores the session at import time.
- **[logStore.ts](src/resources/store/logStore.ts)** / **[uiStore.ts](src/resources/store/uiStore.ts)**
  — the log list + snackbar, and the refresh-nonce signal (copied from the
  precedent).

---

## The services ([src/resources/services/](src/resources/services/))

Framework-agnostic. Highlights:

- **[event-bus.ts](src/resources/services/event-bus.ts)** — a tiny typed emitter
  with `.subscribe(event, cb)` / `.publish(event, payload)`, deliberately the same
  shape as Aurelia's `EventAggregator` so the engine ports barely changed.
  `.subscribe` returns a disposable so React effects can unsubscribe in cleanup.
  The channels (`previewButtonClicked`, `updatedGeometryValue`,
  `changeCodeEditorCode`, `updateAttributeGui`, `checkForVizRepUpdate…`, …) are
  the imperative handshakes between the editor, the preview pipeline and the
  attribute window.
- **[meta-utility.ts](src/resources/services/meta-utility.ts)** — keeps
  `parseMetaFunction`, which does `new Function('"use strict";return (' + code +
  ')')()` to turn the edited `vizRep` **string** into a callable function. This
  eval is intentional and works fine under Vite.
- **[backend-service.ts](src/resources/services/backend-service.ts)** — the ~12
  REST calls the client uses, under the **old `fetchHelper` method names**
  (`classesAllGET`, `classesPATCH`, `sceneInstancesAllGET`, …) so the utility
  ports could swap `this.fetchHelper.X` → `backendService.X` verbatim. GET-all
  methods deserialize via gds `.fromJS(...)` and push into `selectedObjectStore`.
- **[save-selected.ts](src/resources/services/save-selected.ts)** — the shared
  save path (PATCH the edited geometry) used by both the **Save to DB** button and
  **Ctrl+S**.

---

## The views, walking down

- **[AppLayout.tsx](src/views/layout/AppLayout.tsx)** — the page skeleton: title
  bar, toolbar row, scene-tab/state row, the fixed 3-column body (left nav |
  middle body | right nav + log), footer, snackbar, and the auth-gated login
  dialog. It registers the window keyboard shortcuts via
  [useKeyboardShortcuts.ts](src/views/layout/useKeyboardShortcuts.ts) (Ctrl+S save;
  arrow keys nudge the selected 3D object, suppressed while typing in a field or
  Monaco).
- **[ToolbarContainer.tsx](src/views/toolbar-container/ToolbarContainer.tsx)** —
  Login/Logout, the inert zoom/undo/redo/delete stubs (parity — disabled in the
  original too), and the working **2D/3D toggle**.
- **[LeftNav.tsx](src/views/left-nav/LeftNav.tsx)** → `ObjectList` → `ObjectCard`
  — three accordions (Class/RelationClass/Port) loaded from the server; clicking a
  card is the *lightweight* select: set the selection and push the object's
  geometry into `editorStore`, then publish `changeCodeEditorCode` +
  `updateAttributeGui`.
- **[MiddleBody.tsx](src/views/middle-body/MiddleBody.tsx)** — stacks
  **CodeEditor** (Monaco, with the `gc` IntelliSense extra-lib) / **PreviewButtons**
  / **ThreeCanvas**. The 3D preview is built **only on Preview click**, via the bus
  chain `previewButtonClicked → updatedGeometryValue →`
  [preview-pipeline.runPreview](src/views/preview-buttons/preview-pipeline.ts) (a
  faithful port of the old `object-card.onButtonClicked` build flow).
- **[RightNav.tsx](src/views/right-nav/RightNav.tsx)** hosts
  **[AttributeWindow.tsx](src/views/attribute-window/AttributeWindow.tsx)** — reads
  the current instance off imperative engine state (populated after a Preview),
  renders the attribute instances (text / enum-select / boolean-switch), and on
  edit mutates `attributeInstance.value` in place then calls
  `vizrepUpdateChecker.checkForVizRepUpdate(ai)` for the live redraw. The
  never-implemented file/table/reference dialogs are rendered as inert stubs.
- **[LogWindow.tsx](src/views/log-window/LogWindow.tsx)** — the scrolling log
  (copied from the precedent).

---

## The one mental model to keep

There are **two** wiring mechanisms, and picking the right one is the whole game:

```
UI STATE (what to render)             ENGINE HANDSHAKES (imperative, per-frame)
────────────────────────             ────────────────────────────────────────
Zustand stores                        event-bus  +  direct engine calls
components read via useStore(...)      publish/subscribe in useEffect
re-render on change                    engine mutates globalObject, sets render=true
```

Use a **store** for anything that drives what React paints (selection, the code
buffer, the log, auth). Use the **event-bus / direct engine calls** for the
imperative editor↔preview↔attribute handshakes and anything that touches the
Three.js scene. The canvas itself never re-renders through React — it lives behind
the `ThreeCanvas` ref and repaints on its own animation loop whenever
`globalObject.render` is flipped true.
