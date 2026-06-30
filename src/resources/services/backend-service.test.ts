import { afterEach, describe, expect, it, vi } from "vitest";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";
import { backendService } from "./backend-service";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

// Minimal stand-ins for a server response. backend-service deserializes these
// with gds `.fromJS` (class-transformer + reflect-metadata) and pushes the
// resulting class instances into selectedObjectStore.
const SAMPLE_CLASSES = [
  { uuid: "11111111-1111-1111-1111-111111111111", name: "Alpha" },
  { uuid: "22222222-2222-2222-2222-222222222222", name: "Beta" },
];

afterEach(() => {
  vi.restoreAllMocks();
  useSelectedObjectStore.getState().resetObjects();
});

describe("BackendService.classesAllGET", () => {
  it("deserializes the response into gds Class instances and pushes them into the store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(SAMPLE_CLASSES), { status: 200 })),
    );

    const result = await backendService.classesAllGET();

    expect(result).toHaveLength(2);
    // .fromJS must produce real Class instances (prototype preserved), not plain objects.
    expect(result[0]).toBeInstanceOf(Class);
    expect(result.map((c) => c.name)).toEqual(["Alpha", "Beta"]);
    // The same instances must now live in the selectedObjectStore.
    expect(useSelectedObjectStore.getState().getClasses()).toHaveLength(2);
    expect(useSelectedObjectStore.getState().getClasses()[0]).toBeInstanceOf(Class);
  });
});
