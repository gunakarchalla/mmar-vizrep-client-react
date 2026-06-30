import { Box } from "@mui/material";

// Mirrors state-window.html: a tiny centered label showing the current tool
// mode. For the vizrep client this is the static string "VizRep".
export default function StateWindow() {
  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "8pt",
      }}
    >
      VizRep
    </Box>
  );
}
