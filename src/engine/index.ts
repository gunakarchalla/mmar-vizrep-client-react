/**
 * engine/index.ts — COMPOSITION ROOT + mount facade.
 *
 * Each engine module already exports its own module singleton (the P2/P3 pattern
 * that replaced Aurelia `@singleton()` DI). This file imports them in dependency
 * order — global-definition first, then the leaf helpers (ray-helper, mouse-object,
 * resize, animator), then the handlers, then the initiator — so the import side
 * effects (the `new ClassName()` at the bottom of each file) run in a deterministic
 * order. P3 has no circular engine deps yet; P4/P5 add graphic-context + the
 * dynamics handlers, which must keep being wired through this file in order to
 * avoid the circular-import crashes noted in plan §3.
 *
 * The `engine` facade exposes `mount(container)` / `unmount()` for the React
 * `ThreeCanvas` (P8): it replaces the old `my-app.attached()` flow
 * (`initiator.init()` + `initiator.initEventListeners()`) and the old
 * `#container` DOM-polling — the container element is passed in directly.
 */
import { globalObject } from "@/engine/global-definition";
import { rayHelper } from "@/engine/ray-helper";
import { mouseObject } from "@/engine/mouse-object";
import { resize } from "@/engine/resize";
import { animator } from "@/engine/animator";
import { arInitiator } from "@/engine/ar-initiator";
import { interactionHandler } from "@/engine/interaction-handler";
import { instanceCreationHandler } from "@/engine/instance-creation-handler";
import { transformControlsEvents } from "@/engine/transform-control-events";
import { sceneInitiator } from "@/engine/scene-initiator";
import { initiator } from "@/engine/initiator";

export {
  globalObject,
  rayHelper,
  mouseObject,
  resize,
  animator,
  arInitiator,
  interactionHandler,
  instanceCreationHandler,
  transformControlsEvents,
  sceneInitiator,
  initiator,
};

// init() is expensive (builds cameras / scene / controls / mock objects) and must
// run exactly ONCE for the lifetime of the singleton engine. React StrictMode
// double-invokes effects in dev (mount -> unmount -> mount); guarding with this
// flag keeps the second mount a cheap re-attach instead of a duplicate init.
let initialized = false;

export const engine = {
  /**
   * Boot (or re-attach) the engine into `container`. Idempotent: the heavy
   * `initiator.init()` + `initEventListeners()` run only on the first mount;
   * subsequent mounts (e.g. after a StrictMode unmount) re-attach the existing
   * canvas and restart the render loop.
   */
  async mount(container: HTMLElement): Promise<void> {
    globalObject.elementContainer = container;

    if (!initialized) {
      await initiator.init();
      await initiator.initEventListeners();
      initialized = true;
    } else {
      if (globalObject.renderer.domElement.parentElement !== container) {
        container.appendChild(globalObject.renderer.domElement);
      }
      globalObject.renderer.setSize(container.clientWidth, container.clientHeight, true);
      globalObject.renderer.setAnimationLoop(arInitiator.render.bind(arInitiator));
      globalObject.render = true;
    }
  },

  /**
   * Stop the render loop and detach the canvas from the DOM. The singleton scene /
   * cameras / controls are preserved so a later `mount()` is a cheap re-attach.
   */
  unmount(): void {
    globalObject.renderer.setAnimationLoop(null);
    const dom = globalObject.renderer.domElement;
    if (dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
  },
};
