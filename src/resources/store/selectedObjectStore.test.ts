import { describe, it, expect, beforeEach } from "vitest";
import { useSelectedObjectStore } from "./selectedObjectStore";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";

const reset = () => useSelectedObjectStore.getState().resetObjects();

describe("selectedObjectStore.getIcon", () => {
  beforeEach(reset);

  it("returns the default png data-url when vizRep is empty", () => {
    const icon = useSelectedObjectStore.getState().getIcon("");
    expect(icon.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("extracts the data-url defined after 'let icon'", () => {
    const vizRep = "function r(){ let icon = 'data:image/png;base64,ABC123'; }";
    const icon = useSelectedObjectStore.getState().getIcon(vizRep);
    expect(icon).toBe("data:image/png;base64,ABC123");
  });

  it("falls back to a data-url defined after 'let map' when no icon", () => {
    const vizRep = "function r(){ let map = 'data:image/png;base64,MAPDATA'; }";
    const icon = useSelectedObjectStore.getState().getIcon(vizRep);
    expect(icon).toBe("data:image/png;base64,MAPDATA");
  });
});

describe("selectedObjectStore.getTypeFromUuid round-trip", () => {
  beforeEach(reset);

  it("resolves the type for a uuid present in a collection", () => {
    const store = useSelectedObjectStore.getState();
    const st = SceneType.fromJS({ uuid: "abc-123", name: "Test" }) as SceneType;
    store.setSceneTypes([st]);
    expect(store.getTypeFromUuid("abc-123")).toBe("SceneType");
    expect(store.getObjectFromUuid("abc-123")).toBe(st);
  });

  it("returns null for an unknown uuid", () => {
    expect(useSelectedObjectStore.getState().getTypeFromUuid("nope")).toBeNull();
  });
});

describe("selectedObjectStore selection", () => {
  beforeEach(reset);

  it("selects a class by uuid and bumps revision", () => {
    const store = useSelectedObjectStore.getState();
    const cls = Class.fromJS({ uuid: "cls-1", name: "MyClass", geometry: "vizRep" }) as Class;
    store.setClasses([cls]);
    const beforeRevision = useSelectedObjectStore.getState().revision;

    store.setSelectedObject("cls-1");

    const after = useSelectedObjectStore.getState();
    expect(after.type).toBe("Class");
    expect(after.selectedObject?.uuid).toBe("cls-1");
    // a working copy is stored (new identity), not the collection item itself
    expect(after.selectedObject).not.toBe(cls);
    expect(after.revision).toBeGreaterThan(beforeRevision);
  });

  it("deselects and clears the selection", () => {
    const store = useSelectedObjectStore.getState();
    const cls = Class.fromJS({ uuid: "cls-2", name: "X" }) as Class;
    store.setClasses([cls]);
    store.setSelectedObject("cls-2");
    store.deselectObject();

    const after = useSelectedObjectStore.getState();
    expect(after.selectedObject).toBeNull();
    expect(after.type).toBeNull();
  });
});
