import * as THREE from "three";
import { globalObject } from "@/engine/global-definition";
import { animator } from "@/engine/animator";
import { logger } from "@/resources/services/logger";

/**
 * Port of the old `ar_initiator.ts`. DI stripped (P3 recipe): GlobalDefinition /
 * Animator / Logger become module-singleton imports.
 *
 * P3 scope: ONLY `render()` (the active render loop, which just calls
 * `animator.animate()`) is ported. The WebXR / AR session methods
 * (onSessionStarted / onSessionEnded / initHands / onSelectStart / onSelectEnd /
 * createWorldOriginMarker / removeWorldOriginMarker) are intentionally STUBBED to
 * no-ops here and will be fully restored in Phase 11. The non-AR path never calls
 * them, so the engine is unaffected.
 */
export class ArInitiator {
  controller1: any;
  controller2: any;
  controllerGrip1: any;
  hand1: any;
  controllerGrip2: any;
  hand2: any;
  handPointer1: any;
  handPointer2: any;

  raycaster = new THREE.Raycaster();
  tempMatrix = new THREE.Matrix4();

  xrSession: any = null;
  xrReferenceSpace: any = null;

  private globalObjectInstance = globalObject;
  private animator = animator;
  private logger = logger;

  // for AR additional support, e.g., image-tracking
  // compare https://github.com/ShirinStar/webAR_experiments/tree/main/16-webxr-image_tracking
  render(timestamp: number, frame?: any) {
    this.animator.animate();
  }

  // AR events — STUBBED for Phase 11 (see class doc comment).
  async onSessionStarted() {
    // TODO P11: restore AR camera switch + world-origin marker + initHands().
  }

  onSessionEnded() {
    // TODO P11: restore normal camera switch + removeWorldOriginMarker().
  }

  initHands() {
    // TODO P11: restore controllers / hands / pointers + pinch select handlers.
  }

  onSelectStart(event: any) {
    // TODO P11
  }

  onSelectEnd(event: any) {
    // TODO P11
  }

  createWorldOriginMarker() {
    // TODO P11
  }

  removeWorldOriginMarker() {
    // TODO P11
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const arInitiator = new ArInitiator();
