import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { engine, resize } from "@/engine";

// Ports `views/three-canvas/three-canvas.{ts,html}`. The old client found the
// canvas container via `document.getElementById('container')` and a polling
// interval; in React we pass the container element straight into engine.mount()
// (plan §273/§314). The engine is mounted ONCE (ref + empty-dep useEffect);
// engine.mount/unmount are idempotent so StrictMode's double-invoke is safe.
// A ResizeObserver keeps the renderer + cameras in sync with the container size.
export default function ThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let observer: ResizeObserver | undefined;
    let arButton: HTMLElement | undefined;

    engine.mount(el).then(() => {
      if (disposed) return;
      // Match the renderer/cameras to the actual container size, then keep them
      // synced (replaces the old window 'resize' + setInterval steady-render).
      resize.resize();
      observer = new ResizeObserver(() => resize.resize());
      observer.observe(el);
      // Phase 11: overlay three's ARButton on the canvas. It feature-detects XR
      // (shows an inert "AR NOT SUPPORTED" label otherwise) and toggles the AR
      // session, which drives arInitiator.onSessionStarted/onSessionEnded.
      arButton = engine.createARButton();
      el.appendChild(arButton);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      arButton?.remove();
      engine.unmount();
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      className="three_canvas"
      id="container"
      sx={{ position: "relative", width: "100%", height: "55%", bgcolor: "#1e1e1e", overflow: "hidden" }}
    />
  );
}
