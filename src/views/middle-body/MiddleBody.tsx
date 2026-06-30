import { Box } from "@mui/material";
import CodeEditor from "@/views/code-editor/CodeEditor";
import PreviewButtons from "@/views/preview-buttons/PreviewButtons";
import ThreeCanvas from "@/views/three-canvas/ThreeCanvas";

// Ports `views/middle-body/middle-body.{ts,html}`: the VizRep editing core,
// stacked top-to-bottom in the original order — Monaco code editor (40%), the
// Preview / Save buttons (5%), then the live Three.js canvas (55%). Heights
// mirror my-app.scss (.editor / .previeButtons / .three_canvas).
export default function MiddleBody() {
  return (
    <Box
      className="middle_body"
      sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
    >
      <CodeEditor />
      <PreviewButtons />
      <ThreeCanvas />
    </Box>
  );
}
