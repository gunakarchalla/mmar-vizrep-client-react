import { Box, Button, Divider, IconButton, Tooltip } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAuthStore } from "@/resources/store/authStore";
import { useLogStore } from "@/resources/store/logStore";

interface Props {
  onOpenLogin: () => void;
}

// Replaces toolbar-container.{html,ts}: a thin toolbar row with the
// Login/Logout buttons plus the zoom/undo/redo/delete controls. Mirroring the
// original, zoom and undo/redo are disabled inert stubs and delete only logs
// (the real delete is wired in P10). Logout uses authStore.logout() instead of
// the old removeJWT()+location.reload().
export default function ToolbarContainer({ onOpenLogin }: Props) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const log = useLogStore((s) => s.log);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        height: 38,
        px: 1,
        borderBottom: "1px solid",
        borderColor: "primary.main",
        flexShrink: 0,
      }}
    >
      {currentUser ? (
        <Button variant="outlined" size="small" onClick={() => logout()}>
          Logout
        </Button>
      ) : (
        <Button variant="outlined" size="small" onClick={onOpenLogin}>
          Login
        </Button>
      )}

      <Tooltip title="zoom in">
        <span>
          <IconButton size="small" disabled onClick={() => log("zoomIn", "info")}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="zoom out">
        <span>
          <IconButton size="small" disabled onClick={() => log("zoomOut", "info")}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem />

      <Tooltip title="undo">
        <span>
          <IconButton size="small" disabled onClick={() => log("undo", "info")}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="redo">
        <span>
          <IconButton size="small" disabled onClick={() => log("redo", "info")}>
            <RedoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem />

      <Tooltip title="delete">
        <IconButton size="small" onClick={() => log("delete", "info")}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
