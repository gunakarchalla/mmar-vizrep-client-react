import { Card, CardActionArea, Box, Tooltip } from "@mui/material";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useEditorStore } from "@/resources/store/editorStore";
import { eventBus } from "@/resources/services/event-bus";

interface Props {
  object: MetaObject;
  type: string;
}

// Ports object-card.{ts,html}. A clickable MUI Card showing the object's icon
// (extracted from its geometry/VizRep via the store's getIcon) and its name.
// Clicking selects this object and loads its VizRep code into the editor; the
// engine-heavy preview pipeline (instance creation + drawVizRep) is wired in P8
// off the same selection. The card is highlighted while selected.
export default function ObjectCard({ object }: Props) {
  // Subscribe to the selected object's uuid so the highlight re-renders on change.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);
  const isSelected = selectedUuid === object.uuid;

  function onButtonClicked() {
    const store = useSelectedObjectStore.getState();
    store.setSelectedObject(object.uuid);

    // Push the selected object's geometry into the editor, then signal the
    // editor (beautify + setValue) and the attribute window to refresh.
    const selected = store.getSelectedObject();
    const geometry = selected?.geometry?.toString() ?? "";
    useEditorStore.getState().setCode(geometry);
    eventBus.publish("changeCodeEditorCode");
    eventBus.publish("updateAttributeGui");
  }

  const iconSrc = useSelectedObjectStore
    .getState()
    .getIcon(object.geometry?.toString() ?? "");

  return (
    <Tooltip title={object.description ? object.description : object.name} arrow>
      <Card
        className="object-card"
        id={object.uuid}
        sx={{
          width: 96,
          m: 0.5,
          outline: isSelected ? "2px solid" : "none",
          outlineColor: "primary.main",
          bgcolor: isSelected ? "action.selected" : "background.paper",
        }}
      >
        <CardActionArea
          onClick={onButtonClicked}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 1,
          }}
        >
          <Box
            component="img"
            src={iconSrc}
            alt={object.name}
            sx={{ width: 48, height: 48, objectFit: "contain" }}
          />
          <Box
            sx={{
              mt: 0.5,
              fontSize: 12,
              textAlign: "center",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {object.name}
          </Box>
        </CardActionArea>
      </Card>
    </Tooltip>
  );
}
