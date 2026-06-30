import { globalObject } from "@/engine/global-definition";

/**
 * PHASE 3 PARTIAL STUB — completed in Phase 5.
 *
 * The full `transform_control_events.ts` is a Phase 5 port (it depends on the
 * GlobalSelectedObject + InstanceUtility translate/scale/rotate logic). The engine
 * core (P3) only wires these two handlers as TransformControls event listeners in
 * `scene-initiator.ts`; they merely need to exist and flag a re-render. The
 * faithful final line of each original method (`globalObject.render = true`) is
 * preserved so the preview still repaints on a transform gesture. The Phase 5
 * agent must REPLACE this file with the full port (keeping these two method
 * names + the `globalObject` import).
 */
export class TransformControlsEvents {
  private globalObjectInstance = globalObject;

  onTransformControlsPropertyChange() {
    // TODO P5: restore proportional-scale of the selected object.
    this.globalObjectInstance.render = true;
  }

  // this event is triggered, when the button is released in the transformControl mode
  async onTransformControlsMouseUp() {
    // TODO P5: restore translate / scale / rotate -> instance custom_variables sync.
    this.globalObjectInstance.render = true;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const transformControlsEvents = new TransformControlsEvents();
