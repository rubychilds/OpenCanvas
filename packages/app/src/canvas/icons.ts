import {
  AlignLeft,
  Box,
  ChevronDown,
  Columns3,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  LayoutDashboard,
  Link as LinkIcon,
  Menu,
  MousePointerClick,
  PanelBottom,
  PanelTop,
  Pilcrow,
  Rows3,
  Square,
  Tags,
  TextIcon,
  TextCursor,
  Video,
  type LucideIcon,
} from "./chrome-icons.js";

/** Lucide icon keyed by BlockDefinition.id — used in the block palette tiles. */
export const BLOCK_ICONS: Record<string, LucideIcon> = {
  // layout
  div: Box,
  section: Square,
  header: PanelTop,
  footer: PanelBottom,
  nav: Menu,
  main: LayoutDashboard,
  "flex-row": Rows3,
  "flex-col": Columns3,
  // typography
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
  p: Pilcrow,
  span: TextIcon,
  a: LinkIcon,
  // form
  form: FileText,
  input: TextCursor,
  textarea: AlignLeft,
  select: ChevronDown,
  button: MousePointerClick,
  label: Tags,
  // media
  img: Image,
  video: Video,
};

const TAG_ICONS: Record<string, LucideIcon> = {
  div: Box,
  section: Square,
  header: PanelTop,
  footer: PanelBottom,
  nav: Menu,
  main: LayoutDashboard,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
  p: Pilcrow,
  span: TextIcon,
  a: LinkIcon,
  form: FileText,
  input: TextCursor,
  textarea: AlignLeft,
  select: ChevronDown,
  button: MousePointerClick,
  label: Tags,
  img: Image,
  image: Image,
  video: Video,
};

/** Pick an icon for a layer-tree row given the component's tagName. */
export function iconForTag(tagName: string | undefined | null): LucideIcon {
  if (!tagName) return Box;
  return TAG_ICONS[tagName.toLowerCase()] ?? Box;
}
