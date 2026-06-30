import { AppBar, Box, Toolbar, Typography } from "@mui/material";

/**
 * Temporary scaffold layout (Phase 0). The real 3-column VizRep shell
 * (toolbar, scene-tab bar, left nav, middle body, right nav, footer) lands
 * in Phase 6. For now this just proves the app boots, themes, and builds.
 */
export default function AppLayout() {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            MMAR VizRep Design Client
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h5" color="text.secondary">
          VizRep React — scaffold OK
        </Typography>
      </Box>
    </Box>
  );
}
