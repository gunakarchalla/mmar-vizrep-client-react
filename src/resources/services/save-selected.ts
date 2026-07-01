import { Class, Port, Relationclass } from "@gds";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";
import { logger } from "@/resources/services/logger";

// Shared save path used by BOTH the "Save to DB" button (PreviewButtons) and the
// Ctrl+S keyboard shortcut (useKeyboardShortcuts). PATCHes the currently edited
// geometry back onto the selected Class / RelationClass / Port. Framework-agnostic
// (reads stores via getState()), so it can be called from a keydown handler too.
export async function saveSelectedObject(): Promise<void> {
  const store = useSelectedObjectStore.getState();
  const objectToPatch = store.getSelectedObject();
  const type = store.type;

  if (!objectToPatch) {
    logger.log("No object selected to save", "error");
    return;
  }

  try {
    if (type === "Class") {
      await backendService.classesPATCH(objectToPatch.uuid, objectToPatch as unknown as Class);
      logger.log("Class updated successfully", "info");
    } else if (type === "RelationClass") {
      await backendService.relationClassesPATCH(
        objectToPatch.uuid,
        objectToPatch as unknown as Relationclass,
      );
      logger.log("Relationclass updated successfully", "info");
    } else if (type === "Port") {
      await backendService.portsPATCH(objectToPatch.uuid, objectToPatch as unknown as Port);
      logger.log("Port updated successfully", "info");
    } else {
      logger.log("No saveable object type selected", "error");
    }
  } catch (error) {
    logger.log(
      "Error updating " + type + ":" + objectToPatch.uuid + " with message " + error,
      "error",
    );
  }
}
