import { create } from "zustand";

// Replaces the original Aurelia EventAggregator "refresh" channel.
// Components that need to reload data subscribe to `refreshNonce`; anything
// that previously called `eventAggregator.publish("refresh", ...)` calls
// `triggerRefresh()` instead.
//
// `refreshType` mirrors the original payload distinction:
//   - "Refresh button" / login  -> full reload of every list (resetObjects).
//   - undefined (post-save)      -> reload only the currently selected type,
//     preserving the current selection.
interface UiState {
  refreshNonce: number;
  refreshType: string | undefined;
  triggerRefresh: (refreshType?: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  refreshNonce: 0,
  refreshType: undefined,
  triggerRefresh: (refreshType?: string) =>
    set((s) => ({ refreshNonce: s.refreshNonce + 1, refreshType })),
}));
