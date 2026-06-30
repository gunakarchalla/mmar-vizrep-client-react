import { useEffect } from "react";
import { Box, Button } from "@mui/material";
import { Class, Port, Relationclass } from "@gds";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";
import { logger } from "@/resources/services/logger";
import { eventBus } from "@/resources/services/event-bus";
import { runPreview } from "@/views/preview-buttons/preview-pipeline";

// Ports `views/preview-buttons/preview-buttons.{ts,html}`. Two actions:
//   Preview    -> publishes previewButtonClicked. CodeEditor flushes the editor
//                 value onto the selected object's geometry and publishes
//                 updatedGeometryValue; the subscriber below then runs the build
//                 pipeline (rebuild scene + instance + drawVizRep). This keeps the
//                 original bus choreography (preview-buttons listened on
//                 updatedGeometryValue) while doing a full, always-correct rebuild.
//   Save to DB -> PATCHes the edited geometry back onto the Class/RelationClass/Port.
export default function PreviewButtons() {
  // updatedGeometryValue (published by CodeEditor after previewButtonClicked) ->
  // run the preview pipeline.
  useEffect(() => {
    const sub = eventBus.subscribe("updatedGeometryValue", async () => {
      await runPreview();
    });
    return () => sub.dispose();
  }, []);

  function preview() {
    eventBus.publish("previewButtonClicked");
  }

  async function save() {
    const store = useSelectedObjectStore.getState();
    const objectToPatch = store.getSelectedObject();
    const type = store.type;

    if (!objectToPatch) {
      logger.log("No object selected to save", "error");
      return;
    }

    if (type === "Class") {
      backendService
        .classesPATCH(objectToPatch.uuid, objectToPatch as unknown as Class)
        .then(() => logger.log("Class updated successfully", "info"))
        .catch((error) =>
          logger.log("Error updating class:" + objectToPatch.uuid + " with message " + error, "error"),
        );
    } else if (type === "RelationClass") {
      backendService
        .relationClassesPATCH(objectToPatch.uuid, objectToPatch as unknown as Relationclass)
        .then(() => logger.log("Relationclass updated successfully", "info"))
        .catch((error) =>
          logger.log("Error updating relationclass:" + objectToPatch.uuid + " with message " + error, "error"),
        );
    } else if (type === "Port") {
      backendService
        .portsPATCH(objectToPatch.uuid, objectToPatch as unknown as Port)
        .then(() => logger.log("Port updated successfully", "info"))
        .catch((error) =>
          logger.log("Error updating port:" + objectToPatch.uuid + " with message " + error, "error"),
        );
    }
  }

  return (
    <Box
      className="preview-buttons"
      sx={{ display: "flex", gap: 1, alignItems: "center", px: 1, height: "5%", minHeight: 44 }}
    >
      <Button variant="outlined" size="small" onClick={preview}>
        Preview
      </Button>
      <Button variant="outlined" size="small" onClick={save}>
        Save to DB
      </Button>
    </Box>
  );
}
