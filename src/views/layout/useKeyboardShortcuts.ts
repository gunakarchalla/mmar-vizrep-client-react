import { useEffect } from "react";
import { globalObject, globalSelectedObject } from "@/engine";
import { mathUtility } from "@/resources/services/math-utility";
import { saveSelectedObject } from "@/resources/services/save-selected";

// Port of the old `resources/keyboard_handler.ts` (which used Mousetrap). Bindings:
//   Ctrl/Cmd+S            -> save the selected object (the old handler published a
//                            `ctrlPlusSPressed` event that nothing consumed; here
//                            we save directly, matching plan §P10).
//   Arrow Left/Right      -> nudge the selected 3D object ±0.1 on X (rounded).
//   Arrow Up/Down         -> nudge the selected 3D object ±0.1 on Y (rounded).
// The arrow nudges are suppressed while typing in an input / the Monaco editor so
// text editing and caret movement are unaffected (the old Mousetrap default also
// ignored form fields). Ctrl+S always preventDefaults so the browser's own save
// dialog never appears, even from inside Monaco.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest(".monaco-editor") != null
  );
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        void saveSelectedObject();
        return;
      }

      if (isTypingTarget(e.target)) return;

      // globalSelectedObject.getObject() returns the mesh set by the last preview /
      // selection; it can be undefined when nothing is selected, so guard (the old
      // untyped handler would have thrown here).
      const object = globalSelectedObject.getObject();
      if (!object) return;

      switch (e.key) {
        case "ArrowLeft":
          mathUtility.roundPosOfObject(object, 10);
          object.position.x -= 0.1;
          globalObject.render = true;
          break;
        case "ArrowRight":
          mathUtility.roundPosOfObject(object, 10);
          object.position.x += 0.1;
          globalObject.render = true;
          break;
        case "ArrowUp":
          mathUtility.roundPosOfObject(object, 100);
          object.position.y += 0.1;
          globalObject.render = true;
          break;
        case "ArrowDown":
          mathUtility.roundPosOfObject(object, 100);
          object.position.y -= 0.1;
          globalObject.render = true;
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
