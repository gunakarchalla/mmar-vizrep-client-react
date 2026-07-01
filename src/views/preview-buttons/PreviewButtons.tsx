import { useEffect } from "react";
import { Box, Button } from "@mui/material";
import { eventBus } from "@/resources/services/event-bus";
import { saveSelectedObject } from "@/resources/services/save-selected";
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

  function save() {
    void saveSelectedObject();
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
