import { globalObject } from "@/engine/global-definition";

/**
 * PHASE 3 PARTIAL STUB — completed in Phase 5.
 *
 * The full `instance_creation_handler.ts` (~674 lines) is a Phase 5 port. The
 * engine core (P3) only needs `create_UUID()` (used by the initiator to build the
 * mock SceneType / Class / ClassInstance). Only that method is ported here; the
 * Phase 5 agent must REPLACE this file with the full port (keeping `create_UUID`
 * and the `globalObject` import).
 */
export class InstanceCreationHandler {
  private globalObjectInstance = globalObject;

  // create_uuid
  create_UUID() {
    let dt = new Date().getTime();
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const instanceCreationHandler = new InstanceCreationHandler();
