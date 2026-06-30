import { Class } from "@gds/models/meta/Metamodel_classes.structure";
import { Relationclass } from "@gds/models/meta/Metamodel_relationclasses.structure";
import { Port } from "@gds/models/meta/Metamodel_ports.structure";
import { Metamodel } from "@gds/models/meta/Metamodel_metamodels.structure";
import { SceneInstance } from "@gds/models/instance/Instance_scenes.structure";
import { UUID } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { apiFetch } from "./api";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useLogStore } from "@/resources/store/logStore";
import { useAuthStore } from "@/resources/store/authStore";

const log = (value: string, status: string) => useLogStore.getState().log(value, status);
const store = () => useSelectedObjectStore.getState();
const token = () => useAuthStore.getState().getToken();

/**
 * The small REST client the vizrep tool actually needs (~12 endpoints from the
 * old `fetchHelper`). Method NAMES intentionally mirror the original fetchHelper
 * (`getSceneTypes`, `classesAllGET`, `getFileByUUID`, ...) so the ported utility
 * services swap `this.fetchHelper.X(...)` -> `backendService.X(...)` verbatim.
 *
 * The Bearer token comes from the auth store (localStorage["jwtToken"]),
 * replacing the old `globalObjectInstance.accessToken`.
 */
export class BackendService {
  private authHeader(): Record<string, string> {
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token() ?? ""}`,
    };
  }

  /** GET /metamodel/sceneTypes -> Metamodel (with .sceneTypes). */
  async getSceneTypes(): Promise<Metamodel> {
    const url = "metamodel/sceneTypes";
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, { method: "GET", headers: this.authHeader() });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const text = await response.text();
    return Metamodel.fromJS(text === "" ? null : JSON.parse(text));
  }

  /** GET /metamodel/classes -> Class[] (also pushed into selectedObjectStore). */
  async classesAllGET(): Promise<Class[]> {
    const url = "metamodel/classes";
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, { method: "GET", headers: this.authHeader() });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const data = await response.json();
    const classes = Array.isArray(data) ? data.map((item) => Class.fromJS(item) as Class) : [];
    store().setObjects(classes, "Class");
    return store().getClasses();
  }

  /** GET /metamodel/relationClasses -> Relationclass[] (also pushed into store). */
  async relationclassesAllGET(): Promise<Relationclass[]> {
    const url = "metamodel/relationClasses";
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, { method: "GET", headers: this.authHeader() });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const data = await response.json();
    const relationClasses = Array.isArray(data)
      ? data.map((item) => Relationclass.fromJS(item) as Relationclass)
      : [];
    store().setObjects(relationClasses, "RelationClass");
    return store().getRelationClasses();
  }

  /** GET /metamodel/ports -> Port[] (also pushed into store). */
  async portsAllGET(): Promise<Port[]> {
    const url = "metamodel/ports";
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, { method: "GET", headers: this.authHeader() });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const data = await response.json();
    const ports = Array.isArray(data) ? data.map((item) => Port.fromJS(item) as Port) : [];
    store().setObjects(ports, "Port");
    return store().getPorts();
  }

  /** PATCH /metamodel/classes/{uuid} -> updated Class. */
  async classesPATCH(classeUuid: string, body: Class): Promise<Class> {
    if (classeUuid === undefined || classeUuid === null) {
      throw new Error("The parameter 'classeUuid' must be defined.");
    }
    const url = `metamodel/classes/${encodeURIComponent(classeUuid)}`;
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, {
      method: "PATCH",
      headers: this.authHeader(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const text = await response.text();
    return Class.fromJS(text === "" ? null : JSON.parse(text)) as Class;
  }

  /** PATCH /metamodel/relationClasses/{uuid} -> updated Relationclass. */
  async relationClassesPATCH(relClasseUuid: string, body: Relationclass): Promise<Relationclass> {
    if (relClasseUuid === undefined || relClasseUuid === null) {
      throw new Error("The parameter 'relClasseUuid' must be defined.");
    }
    const url = `metamodel/relationClasses/${encodeURIComponent(relClasseUuid)}`;
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, {
      method: "PATCH",
      headers: this.authHeader(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const text = await response.text();
    return Relationclass.fromJS(text === "" ? null : JSON.parse(text)) as Relationclass;
  }

  /** PATCH /metamodel/ports/{uuid} -> updated Port. */
  async portsPATCH(portsUuid: string, body: Port): Promise<Port> {
    if (portsUuid === undefined || portsUuid === null) {
      throw new Error("The parameter 'portsUuid' must be defined.");
    }
    const url = `metamodel/ports/${encodeURIComponent(portsUuid)}`;
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, {
      method: "PATCH",
      headers: this.authHeader(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const text = await response.text();
    return Port.fromJS(text === "" ? null : JSON.parse(text)) as Port;
  }

  /** GET /instances/sceneTypes/{uuid}/sceneInstances -> SceneInstance[]. */
  async sceneInstancesAllGET(sceneTypeUUID: string): Promise<SceneInstance[]> {
    if (sceneTypeUUID === undefined || sceneTypeUUID === null) {
      throw new Error("The parameter 'sceneTypeUUID' must be defined.");
    }
    const url = `instances/sceneTypes/${encodeURIComponent(sceneTypeUUID)}/sceneInstances`;
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, { method: "GET", headers: this.authHeader() });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map((item) => SceneInstance.fromJS(item) as SceneInstance) : [];
  }

  /** GET /files/alluuids -> UUID[] (server wraps them under `uuids`). */
  async getAllFileUUIDs(): Promise<UUID[]> {
    const url = "files/alluuids";
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, { method: "GET", headers: this.authHeader() });
    if (!response.ok) throw new Error(`${response.statusText} - ${await response.text()}`);
    const result = JSON.parse(await response.text());
    return result["uuids"];
  }

  /** GET /files/{uuid} -> a browser File (consumers read .type / .text() / dataURL). */
  async getFileByUUID(uuid: UUID): Promise<globalThis.File> {
    if (uuid === undefined || uuid === null) {
      throw new Error("The parameter 'uuid' must be defined.");
    }
    const url = `files/${encodeURIComponent(uuid)}`;
    log(`API call on ${url}`, "api");
    const response = await apiFetch(url, { method: "GET", headers: this.authHeader() });
    const blob = await response.blob();
    return new globalThis.File([blob], "filename", { type: blob.type });
  }
}

// Singleton instance (replaces the Aurelia @singleton DI registration).
export const backendService = new BackendService();
