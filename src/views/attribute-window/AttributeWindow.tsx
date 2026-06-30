import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Divider,
} from "@mui/material";
import { validate as uuidValidate } from "uuid";
import type { AttributeInstance } from "@gds/models/instance/Instance_attributes.structure";
import type { Attribute } from "@gds/models/meta/Metamodel_attributes.structure";
import type { AttributeType } from "@gds/models/meta/Metamodel_attributetypes.structure";
import { globalObject, globalSelectedObject, vizrepUpdateChecker } from "@/engine";
import { instanceUtility } from "@/resources/services/instance-utility";
import { metaUtility } from "@/resources/services/meta-utility";
import { eventBus } from "@/resources/services/event-bus";
import { useLogStore } from "@/resources/store/logStore";

// Hardcoded special meta UUIDs, faithful to the old attribute-window:
//  - the File AttributeType (upload-file special-case, plan §9 / gotcha)
//  - the "Object 3D" and "Image to detect" meta-attributes (upload buttons)
const FILE_ATTRIBUTE_TYPE_UUID = "2df15b5e-6b43-4911-b38b-0fc5747a8ee6";
const OBJECT_3D_ATTRIBUTE_UUID = "b058b3b4-b523-4ffe-b08e-4f8dda2831c8";
const IMAGE_ATTRIBUTE_UUID = "d334dd62-5651-4d0f-a7a0-13718f20da36";

// One attribute row, enriched with the meta info the old `updater()` computed.
interface EnhancedAttribute {
  attributeInstance: AttributeInstance;
  sequence: number;
  uiType: string;
  facets: string[];
  attributeType?: AttributeType;
  isFileType: boolean;
  isReference: boolean;
}

// The categorized model the panel renders (mirrors the old arrays:
// attributeInstancesNoTable / attributeInstanceTable / attributeInstancesReferenceAttribute).
interface AttributeModel {
  classUuid?: string;
  portUuid?: string;
  noTable: EnhancedAttribute[];
  table: EnhancedAttribute[];
  reference: EnhancedAttribute[];
}

const EMPTY_MODEL: AttributeModel = { noTable: [], table: [], reference: [] };

// A boolean attribute is rendered as a Switch (plan §9 "boolean(switch)"). The old
// data model encodes it either via ui_component or via true|false enum facets.
function isBooleanField(uiType: string, facets: string[]): boolean {
  if (uiType.toLowerCase() === "boolean") return true;
  return (
    facets.length > 0 &&
    facets.every((f) => f.toLowerCase() === "true" || f.toLowerCase() === "false")
  );
}

// Map a ui_component string onto a valid HTML <input type>; unknown components
// (e.g. "boolean", "enum") fall back to plain text.
function htmlInputType(uiType: string): string {
  const allowed = ["text", "number", "color", "date", "email", "password", "tel", "url", "time"];
  return allowed.includes(uiType.toLowerCase()) ? uiType.toLowerCase() : "text";
}

// Faithful port of AttributeWindow.updater(): reads the current class/port instance
// off the imperative engine state, pulls their attribute instances, sorts by the
// meta `sequence`, and categorizes them (reference / table / plain). Strict-TS:
// the old code assumed non-null meta lookups; here the `| undefined` results are
// guarded with sensible defaults (sequence 1000, ui_component "text") instead of
// throwing.
async function buildAttributeModel(): Promise<AttributeModel> {
  // The old window only renders when an object is selected in the 3D scene.
  const selectedObject = globalSelectedObject.getObject();
  if (!selectedObject) return EMPTY_MODEL;

  const currentClassInstance = globalObject.current_class_instance;
  const currentPortInstance = globalObject.current_port_instance;

  let attributeInstances: AttributeInstance[] = [];
  if (currentClassInstance) {
    attributeInstances = currentClassInstance.attribute_instance;
  } else if (currentPortInstance) {
    attributeInstances = currentPortInstance.attribute_instances;
  }

  const classUuid = currentClassInstance?.uuid;
  const portUuid = currentClassInstance ? undefined : currentPortInstance?.uuid;

  if (!attributeInstances || attributeInstances.length === 0) {
    return { classUuid, portUuid, noTable: [], table: [], reference: [] };
  }

  const enhanced: EnhancedAttribute[] = [];
  for (const ai of attributeInstances) {
    // Resolve the parent concept so we can read sequence/ui_component/facets from
    // the right meta attribute (old code: getMetaAttributeWithSequence).
    const uuidParent =
      ai.assigned_uuid_class_instance ||
      ai.assigned_uuid_port_instance ||
      ai.assigned_uuid_scene_instance;

    let metaWithSeq: Attribute | undefined;
    if (uuidParent) {
      const classInstance = await instanceUtility.getClassInstance(uuidParent);
      const portInstance = await instanceUtility.getPortInstance(uuidParent);
      const sceneInstance = await instanceUtility.getSceneInstance(uuidParent);
      if (classInstance) {
        metaWithSeq = await metaUtility.getMetaAttributeWithSequence(ai.uuid_attribute, classInstance.uuid_class);
      } else if (portInstance) {
        metaWithSeq = await metaUtility.getMetaAttributeWithSequence(ai.uuid_attribute, portInstance.uuid_port);
      } else if (sceneInstance) {
        metaWithSeq = await metaUtility.getMetaAttributeWithSequence(ai.uuid_attribute, sceneInstance.uuid_scene_type);
      }
    }

    const sequence = metaWithSeq?.sequence ?? 1000;
    const uiType = metaWithSeq?.ui_component ?? "text";

    // enum/boolean facets only apply when the attribute type carries a regex
    let facets: string[] = [];
    if (metaWithSeq?.attribute_type?.regex_value && metaWithSeq.facets) {
      facets = metaWithSeq.facets.split("|");
    }

    // attribute type / role / file detection (old code: getMetaAttribute)
    const metaAttribute = await metaUtility.getMetaAttribute(ai.uuid_attribute);
    const attributeType = metaAttribute?.attribute_type;
    const isReference = attributeType?.role != null;
    const isFileType = attributeType?.uuid === FILE_ATTRIBUTE_TYPE_UUID;

    enhanced.push({ attributeInstance: ai, sequence, uiType, facets, attributeType, isFileType, isReference });
  }

  enhanced.sort((a, b) => a.sequence - b.sequence);

  const noTable: EnhancedAttribute[] = [];
  const table: EnhancedAttribute[] = [];
  const reference: EnhancedAttribute[] = [];
  for (const entry of enhanced) {
    if (entry.isReference) {
      reference.push(entry);
    } else if (entry.attributeInstance.table_attributes.length === 0) {
      noTable.push(entry);
    } else {
      table.push(entry);
    }
  }

  return { classUuid, portUuid, noTable, table, reference };
}

// Mirrors the old attribute-window (embedded in right-nav): it subscribes to the
// `updateAttributeGui` / `removeAttributeGui` bus events, renders the sorted
// dynamic attributes, and on every field edit mutates the gds AttributeInstance in
// place then asks the vizrep-update-checker to re-run the VizRep (live preview).
export default function AttributeWindow() {
  const [model, setModel] = useState<AttributeModel>(EMPTY_MODEL);
  // Controlled field values keyed by attribute-instance uuid. The gds instances are
  // mutated in place (engine reads them), so React needs its own copy to re-render.
  const [values, setValues] = useState<Record<string, string>>({});
  const log = useLogStore((s) => s.log);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const rebuild = () => {
      void (async () => {
        const next = await buildAttributeModel();
        setModel(next);
        const seeded: Record<string, string> = {};
        for (const entry of [...next.noTable, ...next.table, ...next.reference]) {
          seeded[entry.attributeInstance.uuid] = entry.attributeInstance.value ?? "";
        }
        setValues(seeded);
      })();
    };

    const subUpdate = eventBus.subscribe("updateAttributeGui", rebuild);
    // delayedReset: the old window clears ~10ms after removeAttributeGui (the
    // preview pipeline fires removeAttributeGui then updateAttributeGui ~100ms later).
    const subRemove = eventBus.subscribe("removeAttributeGui", () => {
      resetTimer = setTimeout(() => {
        setModel(EMPTY_MODEL);
        setValues({});
      }, 10);
    });

    return () => {
      subUpdate.dispose();
      subRemove.dispose();
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  // Old fieldChange: set the value (as a string) then run the live vizrep update.
  const applyChange = (ai: AttributeInstance, newValue: string) => {
    setValues((v) => ({ ...v, [ai.uuid]: newValue }));
    ai.value = String(newValue);
    void vizrepUpdateChecker
      .checkForVizRepUpdate(ai)
      .catch((e) => log(`VizRep update failed: ${e}`, "error"));
  };

  // The upload-file / 3D-object / image / table / reference editors opened dialogs
  // that were never present in the old source tree (the custom elements are
  // referenced in the template but unimplemented), so those affordances are inert
  // here — we keep the buttons for parity and log a note instead of crashing.
  const notSupported = (feature: string) =>
    log(`${feature} is not available in this client`, "info");

  const renderNoTableField = (entry: EnhancedAttribute) => {
    const ai = entry.attributeInstance;
    const value = values[ai.uuid] ?? ai.value ?? "";
    const boolean = isBooleanField(entry.uiType, entry.facets);
    const is3D = ai.uuid_attribute === OBJECT_3D_ATTRIBUTE_UUID;
    const isImage = ai.uuid_attribute === IMAGE_ATTRIBUTE_UUID;
    const selectOptions = entry.facets.includes(value) || !value ? entry.facets : [value, ...entry.facets];

    return (
      <Box key={ai.uuid} className="attribute" sx={{ mb: 1.5 }}>
        {boolean ? (
          <FormControlLabel
            control={
              <Switch
                checked={value === "true"}
                onChange={(ev) => applyChange(ai, ev.target.checked ? "true" : "false")}
              />
            }
            label={ai.name}
          />
        ) : entry.facets.length > 0 ? (
          <FormControl fullWidth size="small">
            <InputLabel>{ai.name}</InputLabel>
            <Select
              label={ai.name}
              value={value}
              onChange={(ev) => applyChange(ai, ev.target.value)}
            >
              {selectOptions.map((facet) => (
                <MenuItem key={facet} value={facet}>
                  {facet}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : !is3D && !isImage ? (
          <TextField
            fullWidth
            size="small"
            label={ai.name}
            type={htmlInputType(entry.uiType)}
            value={value}
            helperText={entry.uiType}
            onChange={(ev) => applyChange(ai, ev.target.value)}
          />
        ) : null}

        {/* file / 3D / image upload special-cases (inert — see notSupported) */}
        {entry.isFileType && (
          <Button variant="outlined" fullWidth sx={{ mt: 0.5 }} onClick={() => notSupported("File upload")}>
            {uuidValidate(value) ? "Replace File" : "Upload File"}
          </Button>
        )}
        {is3D && (
          <Button variant="outlined" fullWidth onClick={() => notSupported("3D object upload")}>
            {value !== "3D Object String" ? "Replace 3D Object" : "Upload 3D Object"}
          </Button>
        )}
        {isImage && (
          <Button variant="outlined" fullWidth onClick={() => notSupported("Image upload")}>
            {value !== "Image" ? "Replace Image" : "Upload Image"}
          </Button>
        )}
        <Divider sx={{ mt: 1 }} />
      </Box>
    );
  };

  const hasDynamic =
    model.noTable.length > 0 || model.table.length > 0 || model.reference.length > 0;
  const hasStatic = Boolean(model.classUuid || model.portUuid);

  return (
    <Box sx={{ height: "100%", overflowY: "auto", p: 1 }} className="hidescroll">
      {/* Static Attributes — the instance UUID (read-only) */}
      {hasStatic && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Static Attributes</Typography>
          <TextField
            fullWidth
            size="small"
            label="UUID"
            value={model.classUuid ?? model.portUuid ?? ""}
            InputProps={{ readOnly: true }}
            sx={{ mt: 0.5 }}
          />
          <Divider sx={{ mt: 1 }} />
        </Box>
      )}

      {hasDynamic && (
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Dynamic Attributes
        </Typography>
      )}

      {/* Plain / enum / boolean / file / 3D / image attributes */}
      {model.noTable.map(renderNoTableField)}

      {/* Table Attributes */}
      {model.table.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Table Attributes</Typography>
          {model.table.map((entry) => (
            <Button
              key={entry.attributeInstance.uuid}
              variant="outlined"
              fullWidth
              sx={{ mt: 0.5 }}
              onClick={() => notSupported("Table attribute editing")}
            >
              {entry.attributeInstance.name} ({entry.attributeInstance.table_attributes.length} rows)
            </Button>
          ))}
          <Divider sx={{ mt: 1 }} />
        </Box>
      )}

      {/* Reference Attributes — show the referenced role name (read-only) */}
      {model.reference.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Reference Attributes</Typography>
          {model.reference.map((entry) => (
            <Box key={entry.attributeInstance.uuid} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                label={entry.attributeInstance.name}
                value={entry.attributeInstance.role_instance_from?.name ?? ""}
                InputProps={{ readOnly: true }}
              />
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 0.5, wordBreak: "break-word", fontSize: ".7em" }}
                onClick={() => notSupported("Reference attribute editing")}
              >
                {entry.attributeInstance.name}
              </Button>
            </Box>
          ))}
          <Divider sx={{ mt: 1 }} />
        </Box>
      )}

      {!hasStatic && !hasDynamic && (
        <Typography variant="body2" color="text.secondary">
          Select an object and click Preview to load its attributes.
        </Typography>
      )}
    </Box>
  );
}
