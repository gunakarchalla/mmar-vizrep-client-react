import { Box, Tab, Tabs, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEditorStore, type TabMeta } from "@/resources/store/editorStore";

// Mirrors main-body-tab-bar.html's tab strip: one tab per open scene-instance,
// each with a close icon. The original also swaps the active Three.js scene on
// tab change (clickedTab/closeTab); that engine wiring lands in P8. Here we keep
// the UI-only behaviour against editorStore.tabs / selectedTab.
export default function MainBodyTabBar() {
  const tabs = useEditorStore((s) => s.tabs);
  const selectedTab = useEditorStore((s) => s.selectedTab);
  const setSelectedTab = useEditorStore((s) => s.setSelectedTab);
  const setTabs = useEditorStore((s) => s.setTabs);

  if (tabs.length === 0) {
    // No open scene instances yet — render an empty strip.
    return <Box sx={{ height: 48 }} />;
  }

  function closeTab(tab: TabMeta) {
    const index = tabs.indexOf(tab);
    if (index < 0) return;
    const next = tabs.filter((_, i) => i !== index);
    setTabs(next);
    if (next.length === 0) {
      setSelectedTab(-1);
    } else if (index <= selectedTab) {
      // Activate the neighbouring tab, mirroring the original closeTab().
      setSelectedTab(Math.max(0, selectedTab - 1));
    }
  }

  // Guard the Tabs value against being out of range while tabs mutate.
  const value = selectedTab >= 0 && selectedTab < tabs.length ? selectedTab : false;

  return (
    <Tabs
      value={value}
      onChange={(_e, v) => setSelectedTab(v as number)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ minHeight: 48 }}
    >
      {tabs.map((tab, i) => (
        <Tab
          key={tab.uuid}
          value={i}
          sx={{ minHeight: 48, textTransform: "none", pr: 1 }}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {tab.name}
              <IconButton
                component="span"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab);
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Box>
          }
        />
      ))}
    </Tabs>
  );
}
