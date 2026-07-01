import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import TopNavBar from "@/views/top-nav-bar/TopNavBar";
import ToolbarContainer from "@/views/toolbar-container/ToolbarContainer";
import MainBodyTabBar from "@/views/main-body-tab-bar/MainBodyTabBar";
import StateWindow from "@/views/state-window/StateWindow";
import AppFooter from "@/views/footer/AppFooter";
import AppSnackbar from "@/views/common/AppSnackbar";
import UserManagementDialog from "@/views/auth/UserManagementDialog";
import LeftNav from "@/views/left-nav/LeftNav";
import MiddleBody from "@/views/middle-body/MiddleBody";
import RightNav from "@/views/right-nav/RightNav";
import LogWindow from "@/views/log-window/LogWindow";
import { useKeyboardShortcuts } from "@/views/layout/useKeyboardShortcuts";
import { useAuthStore } from "@/resources/store/authStore";

// Shared column geometry, mirroring my-app.scss (.column1/.column3 ~20vw capped
// 200..330px; .column2 flexes). The tab/state row uses the same widths so the
// tab bar sits above the middle body and the state window above the right nav.
const sideCol = {
  width: "20vw",
  minWidth: 200,
  maxWidth: 330,
  flexShrink: 0,
  borderRight: "1px solid",
  borderColor: "primary.main",
} as const;

const midCol = {
  flex: 1,
  minWidth: 0,
  borderRight: "1px solid",
  borderColor: "primary.main",
} as const;

// Mirrors my-app.html + main-body-tab-bar.html: the full app chrome — title bar,
// toolbar row, scene-tab/state row, 3-column body, footer, snackbar and the
// auth-gated login dialog. The body renders only when a user is logged in; the
// login dialog auto-opens otherwise (user-management.attached()).
export default function AppLayout() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  // Window-level keyboard shortcuts (Ctrl+S save, arrow-key nudge). Registered
  // once for the app lifetime; the handlers no-op when nothing is selected.
  useKeyboardShortcuts();

  // Auto-open the login dialog when not authenticated.
  useEffect(() => {
    if (!currentUser) setLoginOpen(true);
  }, [currentUser]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <TopNavBar />
      <ToolbarContainer onOpenLogin={() => setLoginOpen(true)} />

      {currentUser ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* tab/state row */}
          <Box sx={{ display: "flex", height: 48, flexShrink: 0 }}>
            <Box sx={sideCol} />
            <Box sx={midCol}>
              <MainBodyTabBar />
            </Box>
            <Box sx={sideCol}>
              <StateWindow />
            </Box>
          </Box>

          {/* main 3-column body */}
          <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
            <Box sx={{ ...sideCol, overflowY: "auto" }}>
              <LeftNav />
            </Box>
            <Box sx={{ ...midCol, display: "flex", flexDirection: "column" }}>
              <MiddleBody />
            </Box>
            <Box
              sx={{
                width: "20vw",
                minWidth: 200,
                maxWidth: 330,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                <RightNav />
              </Box>
              <Box
                sx={{
                  height: "30%",
                  borderTop: "1px solid",
                  borderColor: "primary.main",
                  overflowY: "auto",
                }}
              >
                <LogWindow />
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}

      <AppFooter />

      <UserManagementDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      <AppSnackbar />
    </Box>
  );
}
