/**
 * Chrome icon re-exports — Lucide-shaped names.
 *
 * Primary source: `@phosphor-icons/react` with `weight="fill"` applied via the
 * IconContext.Provider at the App root (D.4d.2: filled iconography).
 *
 * Fallback source: `lucide-react` — used only for flex-layout spacing icons
 * that Phosphor has no reasonable analog for (AlignHorizontalSpaceBetween /
 * SpaceAround / StretchHorizontal). These render as outlines; acceptable
 * since they are structural markers, not ornamental glyphs.
 *
 * Keep this the only place that imports either icon library.
 */

export {
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  StretchHorizontal,
} from "lucide-react";

export {
  AlignBottom as AlignEndVertical,
  AlignCenterHorizontal as AlignHorizontalJustifyCenter,
  AlignCenterVertical,
  AlignLeft,
  AlignLeft as AlignHorizontalJustifyStart,
  AlignRight as AlignHorizontalJustifyEnd,
  AlignTop as AlignStartVertical,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowsOutCardinal as Move,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  Check,
  Columns as Columns3,
  CornersOut as Maximize2,
  Crop as Maximize,
  Cube as Box,
  FrameCorners,
  Cursor as MousePointer,
  CursorClick as MousePointerClick,
  DeviceMobile as Smartphone,
  DeviceTablet as Tablet,
  Eye,
  EyeSlash as EyeOff,
  FileText,
  FloppyDisk as Save,
  Image,
  Layout as LayoutDashboard,
  Link,
  List as Menu,
  Lock,
  LockOpen,
  LockSimple,
  LockSimpleOpen,
  Minus,
  Monitor,
  Moon,
  Paragraph as Pilcrow,
  Plugs as Unplug,
  Plus,
  Rows as Rows3,
  ShareNetwork as PanelBottom,
  Square,
  SquaresFour as PanelTop,
  Sun,
  Tag as Tags,
  TextAa as TextIcon,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextHFive as Heading5,
  TextHFour as Heading4,
  TextHOne as Heading1,
  TextHSix as Heading6,
  TextHThree as Heading3,
  TextHTwo as Heading2,
  TextT as Type,
  Textbox as TextCursor,
  Trash as Trash2,
  VideoCamera as Video,
  IconContext,
} from "@phosphor-icons/react";

export type { Icon as LucideIcon } from "@phosphor-icons/react";

export { PlusOutline, SearchOutline } from "./custom-icons.js";
