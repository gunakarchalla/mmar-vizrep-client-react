import AttributeWindow from "@/views/attribute-window/AttributeWindow";

// Mirrors the old right-nav (right-nav.html simply embeds <attribute-window>).
// The log window lives separately at the bottom of the right column (AppLayout).
export default function RightNav() {
  return <AttributeWindow />;
}
