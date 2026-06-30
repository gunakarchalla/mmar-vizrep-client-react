import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { apiFetch } from "@/resources/services/api";
import { eventBus } from "@/resources/services/event-bus";
import { useLogStore } from "./logStore";

export interface CurrentUser {
  username: string;
  isAdmin: boolean;
}

// NOTE: the OLD vizrep client stored its JWT under localStorage["jwtToken"]
// (the metamodeling precedent uses "auth_token"). We deliberately keep the
// vizrep key here so the running old client and this port don't clobber each
// other and so any vizrep-specific assumptions hold. (plan.md gotcha)
const TOKEN_KEY = "jwtToken";

// localStorage is guarded so the store can also be imported in a non-DOM
// (node/vitest) context without throwing at module-load time.
function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* no-op outside the browser */
  }
}

function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op outside the browser */
  }
}

interface AuthState {
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getToken: () => string | null;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isTokenExpired: (token: string) => boolean;
  setCurrentUser: () => void;
  checkTokenAndLogoutIfExpired: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await apiFetch("login/signin", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) return false;
      // The server replies with the JWT as a JSON string.
      const data = await response.json();
      setToken(data);
      get().setCurrentUser();
      useLogStore.getState().log(`User ${username} logged in`, "info");
      // Mirror the old user-management dialog: announce login so the load flow runs.
      eventBus.publish("login", true);
      return true;
    } catch (error) {
      console.error("There was an error logging in:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      const token = getToken();
      await apiFetch("login/signout", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // signout is best-effort; clear the local session regardless.
      console.error("There was an error logging out:", error);
    } finally {
      removeToken();
      set({ currentUser: null });
      useLogStore.getState().log("User logged out", "info");
    }
  },

  getToken,

  isAuthenticated(): boolean {
    return getToken() !== null;
  },

  isAdmin(): boolean {
    if (!get().isAuthenticated()) return false;
    const token = getToken() as string;
    try {
      const decoded = jwtDecode(token);
      // @ts-expect-error isAdmin is an mmar-server custom claim
      return decoded.isAdmin === true;
    } catch {
      return false;
    }
  },

  setCurrentUser(): void {
    const token = getToken();
    if (token) {
      set({
        currentUser: {
          // @ts-expect-error username is an mmar-server custom claim
          username: jwtDecode(token).username,
          isAdmin: get().isAdmin(),
        },
      });
    }
  },

  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode(token);
      if (!decoded.exp) return true; // no expiration -> treat as expired
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime > decoded.exp;
    } catch {
      return true;
    }
  },

  checkTokenAndLogoutIfExpired(): boolean {
    const token = getToken();
    if (token && get().isTokenExpired(token)) {
      get().logout();
      return true;
    }
    return false;
  },
}));

// Mirror the original UserManagement.attached(): if a non-expired token is
// already stored, hydrate currentUser; otherwise drop the stale token.
{
  const token = getToken();
  if (token && useAuthStore.getState().isTokenExpired(token)) {
    removeToken();
  } else {
    useAuthStore.getState().setCurrentUser();
  }
}
