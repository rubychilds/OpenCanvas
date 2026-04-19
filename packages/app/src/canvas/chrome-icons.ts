/**
 * Chrome icon re-exports — Lucide-shaped names.
 *
 * Primary source: `@phosphor-icons/react` with `weight="fill"` applied via the
 * IconContext.Provider at the App root (D.4d.2: filled iconography). Phosphor
 * stays the default for chrome glyphs (eye / lock / chevron / device / etc.).
 *
 * Lucide source for: (a) flex-layout spacing icons Phosphor has no analog for
 * (AlignHorizontalSpaceBetween / SpaceAround / StretchHorizontal), (b) shape
 * primitives + text alignment + text case / decoration glyphs that read more
 * cleanly as outlines at our small inspector sizes. Per user direction
 * 2026-04-19: Frame, Type, Square, Circle, AlignLeft/Center/Right/Justify,
 * CaseUpper / CaseLower / CaseSensitive, Bold / Italic / Underline /
 * Strikethrough all live here.
 *
 * Keep this the only place that imports either icon library.
 */

export {
  AlignCenter as TextAlignCenter,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignJustify as TextAlignJustify,
  AlignLeft as TextAlignLeft,
  AlignRight as TextAlignRight,
  Bold,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Circle,
  Frame as FrameCorners,
  Italic,
  Square,
  StretchHorizontal,
  Strikethrough as TextStrikethrough,
  Type,
  Underline as TextUnderline,
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
  SquaresFour,
  SquaresFour as PanelTop,
  Sun,
  Tag as Tags,
  TextAa as TextIcon,
  TextHFive as Heading5,
  TextHFour as Heading4,
  TextHOne as Heading1,
  TextHSix as Heading6,
  TextHThree as Heading3,
  TextHTwo as Heading2,
  TextTSlash,
  Textbox as TextCursor,
  Trash as Trash2,
  VideoCamera as Video,
  IconContext,
} from "@phosphor-icons/react";

export type { Icon as LucideIcon } from "@phosphor-icons/react";

export {
  PlusOutline,
  SearchOutline,
  StrokeDashed,
  StrokeDotted,
  StrokeDouble,
  StrokeSolid,
} from "./custom-icons.js";
