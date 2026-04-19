/**
 * Chrome icon re-exports — Lucide-shaped names, Phosphor components with
 * `weight="fill"` applied globally via the IconContext.Provider at the App
 * root. Per user direction (D.4d.2): the editor reads as filled-iconography
 * rather than outline.
 *
 * Keep this the only place that imports `@phosphor-icons/react`. Components
 * elsewhere import from here using Lucide-style names; when a Lucide icon
 * has no direct Phosphor equivalent we pick the closest semantic match.
 */

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
  ArrowsHorizontal as StretchHorizontal,
  ArrowsOutCardinal as Move,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  Check,
  Columns as Columns3,
  CornersOut as Maximize,
  CornersOut as Maximize2,
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
  Square,
  SquaresFour as PanelTop,
  Sun,
  Tag as Tags,
  TextAa as TextIcon,
  TextAlignCenter as AlignHorizontalSpaceAround,
  TextAlignJustify as AlignHorizontalSpaceBetween,
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
