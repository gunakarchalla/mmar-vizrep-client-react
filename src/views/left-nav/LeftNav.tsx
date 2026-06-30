import { useCallback, useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  LinearProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useUiStore } from "@/resources/store/uiStore";
import { backendService } from "@/resources/services/backend-service";
import ObjectList from "@/views/object-list/ObjectList";

interface Section {
  type: string;
  label: string;
  load: () => Promise<unknown>;
}

// Mirrors left-nav.html: the vizrep client browses exactly three meta categories
// (Classes, RelationClasses, Ports). Unlike the metamodeling precedent there are
// no SceneType/Attribute/Procedure/User sections and no admin gating.
const SECTIONS: Section[] = [
  { type: "Class", label: "Classes", load: () => backendService.classesAllGET() },
  {
    type: "RelationClass",
    label: "Relationclasses",
    load: () => backendService.relationclassesAllGET(),
  },
  { type: "Port", label: "Ports", load: () => backendService.portsAllGET() },
];

type LoadingMap = Record<string, boolean>;
const ALL_LOADING: LoadingMap = SECTIONS.reduce((acc, s) => {
  acc[s.type] = true;
  return acc;
}, {} as LoadingMap);

// Ports left-nav.{ts,html}: one MUI Accordion per category, each showing a
// LinearProgress while its list loads then an ObjectList. The old jwt-polling
// loop is gone — this component only mounts inside the auth-gated body, so a
// token already exists. The EventAggregator "refresh" channel is replaced by the
// uiStore refreshNonce/refreshType.
export default function LeftNav() {
  const [loading, setLoading] = useState<LoadingMap>(ALL_LOADING);
  const refreshNonce = useUiStore((s) => s.refreshNonce);

  const setLoadingFor = useCallback((type: string, value: boolean) => {
    setLoading((prev) => ({ ...prev, [type]: value }));
  }, []);

  // A defined refreshType ("Refresh button"/login) does a full reload
  // (resetObjects + every list); undefined (post-save) reloads only the
  // currently selected type, preserving the current selection.
  const refresh = useCallback(
    async (refreshType?: string) => {
      const store = useSelectedObjectStore.getState();
      const currentType = refreshType ? undefined : store.type;

      const section = SECTIONS.find((s) => s.type === currentType);
      if (currentType && section) {
        setLoadingFor(section.type, true);
        await section.load();
        setLoadingFor(section.type, false);
        return;
      }
      if (currentType && !section) {
        // A non-list type selected: nothing to reload.
        return;
      }

      // default: full reload
      store.resetObjects();
      setLoading({ ...ALL_LOADING });
      for (const s of SECTIONS) {
        await s.load();
        setLoadingFor(s.type, false);
      }
    },
    [setLoadingFor],
  );

  // Initial load on mount + every refresh trigger. The first run is a full
  // reload (matching left-nav attached() -> fetch all three lists).
  const didMount = useRef(false);
  useEffect(() => {
    const refreshType = didMount.current
      ? useUiStore.getState().refreshType
      : undefined;
    didMount.current = true;
    void refresh(refreshType);
  }, [refreshNonce]);

  return (
    <>
      {SECTIONS.map((section) => (
        <Accordion key={section.type} disableGutters defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{section.label}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {loading[section.type] ? (
              <LinearProgress />
            ) : (
              <ObjectList type={section.type} />
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
