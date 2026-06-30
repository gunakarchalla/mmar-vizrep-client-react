import { AppBar, Toolbar, Typography } from "@mui/material";

// Mirrors top-nav-bar.html: the application title bar. The original's menu
// entries (File/View/Edit/Diagram/Settings) are commented out in the source
// template, so the vizrep top bar shows only the title — kept faithful here.
export default function TopNavBar() {
  return (
    <AppBar position="static" color="primary" elevation={1} sx={{ flexShrink: 0 }}>
      <Toolbar variant="dense">
        <Typography variant="h6" noWrap component="div" sx={{ color: "#000" }}>
          MMAR VizRep Design Client
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
