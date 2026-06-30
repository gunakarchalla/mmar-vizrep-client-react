import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { useAuthStore } from "@/resources/store/authStore";
import { useLogStore } from "@/resources/store/logStore";
import { useUiStore } from "@/resources/store/uiStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Replaces dialogs/user-management. Login-only against authStore (the old
// dialog had no sign-up). authStore.login already stores the JWT under
// "jwtToken", hydrates currentUser and publishes the "login" bus event; on
// success we trigger the global refresh so the left-nav lists load (P7).
// Dev credentials are admin / admin.
export default function UserManagementDialog({ open, onClose }: Props) {
  // Prefill the dev credentials (admin / admin), mirroring the old user-management
  // dialog which seeded its fields from process.env.USERNAME/PASSWORD.
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [errorMessage, setErrorMessage] = useState("");

  const login = useAuthStore((s) => s.login);
  const log = useLogStore((s) => s.log);
  const triggerRefresh = useUiStore((s) => s.triggerRefresh);

  async function handleLogin() {
    if (!username || !password) {
      setErrorMessage("Please enter username and password");
      return;
    }
    try {
      const success = await login(username, password);
      if (success) {
        setErrorMessage("");
        triggerRefresh("Refresh button");
        onClose();
      } else {
        setErrorMessage("Invalid username or password");
      }
    } catch {
      setErrorMessage("Invalid username or password");
      log("Login failed", "error");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>User Management</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            fullWidth
          />
          {errorMessage && (
            <Typography color="error" variant="body2">
              {errorMessage}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleLogin}>
          Login
        </Button>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
