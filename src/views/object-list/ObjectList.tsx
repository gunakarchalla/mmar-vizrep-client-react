import { useMemo, useState } from "react";
import { Box, TextField, InputAdornment, Icon, Divider } from "@mui/material";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import {
  useSelectedObjectStore,
  SelectedObjectState,
} from "@/resources/store/selectedObjectStore";
import ObjectCard from "@/views/object-card/ObjectCard";

interface Props {
  type: string;
}

// Maps a type-tag to the store collection field that holds it. The vizrep
// client only browses these three categories.
const TYPE_TO_FIELD: Record<string, keyof SelectedObjectState> = {
  Class: "classes",
  RelationClass: "relationClasses",
  Port: "ports",
};

// Ports object-list.{ts,html}. Reads its slice from the store by `type`, lets
// the user search, and renders an ObjectCard per item. Unlike the metamodeling
// precedent there is no Add/Remove — the vizrep tool only edits an object's
// geometry, it never creates or deletes meta objects.
export default function ObjectList({ type }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const field = TYPE_TO_FIELD[type];
  const objectList = useSelectedObjectStore(
    (s) => s[field] as unknown as MetaObject[],
  );

  // Sort alphabetically (original sorts in attached()) then filter by name.
  const filteredItems = useMemo(() => {
    const sorted = [...(objectList ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (!searchTerm) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter((item) => item.name.toLowerCase().includes(term));
  }, [objectList, searchTerm]);

  return (
    <Box sx={{ px: 1, pb: 1 }}>
      <TextField
        className="search-left-nav"
        size="small"
        fullWidth
        label="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Icon className="material-icons">search</Icon>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1, mt: 1 }}
      />
      <Divider className="solid_hr_list" sx={{ mb: 1 }} />
      <Box
        className="object-card-list"
        sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
      >
        {filteredItems.map((object) => (
          <ObjectCard key={object.uuid} object={object} type={type} />
        ))}
      </Box>
    </Box>
  );
}
