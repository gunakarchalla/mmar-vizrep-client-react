import * as THREE from "three";
import { globalObject } from "@/engine/global-definition";
import { rayHelper } from "@/engine/ray-helper";

/**
 * PHASE 3 PARTIAL STUB — completed in Phase 5.
 *
 * The full `interaction_handler.ts` depends on GraphicContext (P4) + several
 * utilities and is a Phase 5 port. The engine core (P3) only registers
 * `onDocumentMouseDown` as the `pointerdown` listener (wired in the initiator).
 * That method is ported faithfully here (it only touches `transformControls` +
 * `rayHelper`, both of which exist by P3). The Phase 5 agent must REPLACE this
 * file with the full port (keeping `onDocumentMouseDown` + these imports).
 */
export class InteractionHandler {
  private objects: THREE.Mesh[];
  private intersects: THREE.Intersection[];
  private intersect: THREE.Intersection;

  // get programState
  private programState: string;

  // check variable
  private allowed = true;
  private dragging: boolean;

  // left == 0, right == 2
  private clickedButton: number;

  private globalObjectInstance = globalObject;
  private rayHelper = rayHelper;

  // function that is called on mouse click
  // ------------------------------------
  // check sequence diagram in the wiki of mm-ar: https://github.com/MM-AR/mmar/wiki/InteractionHandler
  // ------------------------------------
  async onDocumentMouseDown(event: MouseEvent) {
    this.clickedButton = event.button;
    this.dragging = this.globalObjectInstance.transformControls.dragging;

    // set the raycaster
    this.globalObjectInstance.raycaster = this.rayHelper.shootRay(event);
  }

  // -------------------------------------------------
  // helper functions
  // -------------------------------------------------
  parseObj(obj: string) {
    const ret: string = Function('"use strict";return (' + obj + ")")();
    return ret;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const interactionHandler = new InteractionHandler();
