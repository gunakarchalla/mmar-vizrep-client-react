import { create } from "zustand";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";
import { Relationclass } from "@gds/models/meta/Metamodel_relationclasses.structure";
import { Port } from "@gds/models/meta/Metamodel_ports.structure";
import { UUID } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useLogStore } from "./logStore";

// The vizrep client only ever browses/edits three meta categories (Classes,
// RelationClasses, Ports) and additionally loads SceneTypes for the live
// preview. This store is the React/Zustand port of the old
// SelectedObjectService, trimmed to exactly those collections.
export type SelectableObject = SceneType | Class | Relationclass | Port;

/**
 * Clone preserving the prototype (and therefore the class methods), giving a new
 * object identity so React subscribers re-render after an in-place mutation of
 * `selectedObject`. This replaces Aurelia's deep `@bindable` observation.
 */
function reref<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
}

const log = (value: string, status: string) => useLogStore.getState().log(value, status);

export interface SelectedObjectState {
  // collections
  sceneTypes: SceneType[];
  classes: Class[];
  relationClasses: Relationclass[];
  ports: Port[];

  // selection
  selectedObject: SelectableObject | null | undefined;
  type: string | null | undefined;
  selectedTab: string | undefined;

  // reactivity counter bumped on every in-place mutation of selectedObject
  revision: number;

  // --- core selection API ---
  getSelectedObject: () => SelectableObject | null | undefined;
  getObjectFromUuid: (uuid: UUID) => SelectableObject | null;
  setSelectedObject: (objUuid: string) => void;
  deselectObject: () => void;
  resetObjects: () => void;
  getTypeFromUuid: (uuid: UUID) => string | null;

  // --- generic collection API ---
  getType: () => string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getObjects: (type: string) => any[] | undefined;
  setObjects: <T>(objects: T[], type: string) => void;
  getIcon: (wholeVizRep: string) => string;

  // --- per-type accessors ---
  setSceneTypes: (sceneTypes: SceneType[]) => void;
  getSceneTypes: () => SceneType[];
  setClasses: (classes: Class[]) => void;
  getClasses: () => Class[];
  setRelationClasses: (relationClasses: Relationclass[]) => void;
  getRelationClasses: () => Relationclass[];
  setPorts: (ports: Port[]) => void;
  getPorts: () => Port[];

  // --- middle-body tab selection ---
  setSelectedTab: (tab: string | undefined) => void;

  // re-ref selectedObject after an external in-place mutation so subscribers re-render
  commitSelected: () => void;
}

export const useSelectedObjectStore = create<SelectedObjectState>((set, get) => {
  // commit an in-place mutation of selectedObject so React subscribers re-render
  const commit = () =>
    set((s) => ({ selectedObject: reref(get().selectedObject), revision: s.revision + 1 }));

  return {
    sceneTypes: [],
    classes: [],
    relationClasses: [],
    ports: [],

    selectedObject: undefined,
    type: undefined,
    selectedTab: undefined,
    revision: 0,

    getSelectedObject: () => get().selectedObject,

    getObjectFromUuid: (uuid) => {
      if (!uuid) return null;
      const type = get().getTypeFromUuid(uuid);
      if (!type) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((get().getObjects(type) ?? []).find((obj: any) => obj.uuid === uuid) ??
        null) as SelectableObject | null;
    },

    setSelectedObject: (objUuid) => {
      const type = get().getTypeFromUuid(objUuid);
      let selectedObject: SelectableObject | undefined = undefined;
      switch (type) {
        case "SceneType":
          selectedObject = get().sceneTypes.find((sceneType) => sceneType.uuid === objUuid);
          break;
        case "Class":
          selectedObject = get().classes.find((class_) => class_.uuid === objUuid);
          break;
        case "RelationClass":
          selectedObject = get().relationClasses.find(
            (relationClass) => relationClass.uuid === objUuid,
          );
          break;
        case "Port":
          selectedObject = get().ports.find((port) => port.uuid === objUuid);
          break;
        default:
          console.warn(`Unknown type: ${type}`);
      }

      // Store a working copy decoupled from the collection item so in-progress
      // edits (e.g. the geometry shown in the editor) are not reflected in the
      // list until a save replaces the collection item with the server response.
      set((s) => ({ selectedObject: reref(selectedObject), type, revision: s.revision + 1 }));
      const fullobj = get().getObjectFromUuid(objUuid);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      log(`Selected object: ${(fullobj as any)?.name}`, "info");
    },

    deselectObject: () => {
      set((s) => ({ selectedObject: null, type: null, revision: s.revision + 1 }));
    },

    resetObjects: () => {
      get().setSceneTypes([]);
      get().setClasses([]);
      get().setRelationClasses([]);
      get().setPorts([]);
      get().deselectObject();
    },

    getTypeFromUuid: (uuid) => {
      const typeMappings = [
        { collection: get().getSceneTypes(), type: "SceneType" },
        { collection: get().getClasses(), type: "Class" },
        { collection: get().getRelationClasses(), type: "RelationClass" },
        { collection: get().getPorts(), type: "Port" },
      ];
      for (const { collection, type } of typeMappings) {
        if (collection.some((item) => item.uuid === uuid)) {
          return type;
        }
      }
      console.warn(`Unknown type for uuid: ${uuid}`);
      return null;
    },

    getType: () => get().type,

    getObjects: (type) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let toReturn: any[] = [];
        switch (type) {
          case "SceneType":
            return get().getSceneTypes();
          case "Class":
            return get().getClasses();
          case "RelationClass":
            return get().getRelationClasses();
          case "Port":
            return get().getPorts();
          case "All":
            toReturn = toReturn.concat(get().getSceneTypes());
            toReturn = toReturn.concat(get().getClasses());
            toReturn = toReturn.concat(get().getRelationClasses());
            toReturn = toReturn.concat(get().getPorts());
            return toReturn;
          default:
            console.warn(`Unknown type: ${type}`);
        }
      } catch (error) {
        console.error("There was an error getting the objects:", error);
      }
    },

    setObjects: (objects, type) => {
      switch (type) {
        case "SceneType":
          get().setSceneTypes(objects as SceneType[]);
          break;
        case "Class":
          get().setClasses(objects as Class[]);
          break;
        case "RelationClass":
          get().setRelationClasses(objects as Relationclass[]);
          break;
        case "Port":
          get().setPorts(objects as Port[]);
          break;
        default:
          console.warn(`Unknown type: ${type}`);
      }
    },

    setSceneTypes: (sceneTypes) => set({ sceneTypes }),
    getSceneTypes: () => get().sceneTypes,
    setClasses: (classes) => set({ classes }),
    getClasses: () => get().classes,
    setRelationClasses: (relationClasses) => set({ relationClasses }),
    getRelationClasses: () => get().relationClasses,
    setPorts: (ports) => set({ ports }),
    getPorts: () => get().ports,

    getIcon: (wholeVizRep) => {
      let vizRep: string = wholeVizRep;
      let map = "";
      let next = false;
      const defaultImageBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAAdElEQVRYw+2SwQ2AIBAEpwC6oSdqoii6oQD8+DHBAOdpNO7sCx7MbgII8SSBRKGQCP6PRzKVtqeSib69WycOW469ezFvOe/tsGXc27xlrffiFlvvhS3NORJIIMFbBLNIIMGfBKN7Ce4XfPcXzZ4luCYQwsoGpwTEXjWPD4EAAAAASUVORK5CYII=";

      if (!vizRep) {
        // return a default image in base64
        return defaultImageBase64;
      }

      // if icon defined
      vizRep = wholeVizRep.split("let icon")[1];
      if (vizRep) {
        const arrStr: string[] = vizRep.split("'");
        for (const substring of arrStr) {
          const string: string = substring;
          if (string.startsWith("data")) {
            map = string;
            return map;
          } else if (string.endsWith("getImageByUUID(")) {
            next = true;
          } else if (next) {
            map = defaultImageBase64;
            break;
          }
        }
      }

      // if icon not defined try to take map
      if (map == "") {
        vizRep = wholeVizRep.split("let map")[1];
        if (vizRep) {
          const arrStr: string[] = vizRep.split("'");
          for (const substring of arrStr) {
            const string: string = substring;
            if (string.startsWith("data")) {
              map = string;
            }
          }
        }
      }

      return map;
    },

    setSelectedTab: (tab) => set({ selectedTab: tab }),

    commitSelected: () => {
      commit();
    },
  };
});
