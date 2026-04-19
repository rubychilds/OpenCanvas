/**
 * Chrome icon re-exports — sourced entirely from `lucide-react`.
 *
 * Icons are stroke-based hairline outlines (lucide's default strokeWidth=2).
 * Callers that need a lighter weight can pass `strokeWidth={1.25}` on the
 * rendered icon or wrap a subtree with `className="[&_svg]:stroke-[1.25]"`.
 *
 * Re-export names (e.g. `TextAlignLeft`, `ChevronDown`) are historical
 * aliases kept so call-sites across the inspector, layers panel, and
 * canvas chrome don't churn when we migrate upstream icons. Keep this the
 * only file in the app that imports directly from `lucide-react`.
 */

export {
  // Text alignment
  AlignCenter as TextAlignCenter,
  AlignJustify as TextAlignJustify,
  AlignLeft as TextAlignLeft,
  AlignRight as TextAlignRight,
  // Flex-layout spacing
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartVertical,
  AlignLeft,
  StretchHorizontal,
  // Arrows + directional
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Move,
  // Type-styling
  Bold,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Italic,
  Pilcrow,
  RemoveFormatting as TextTSlash,
  Strikethrough as TextStrikethrough,
  Type,
  Type as TextIcon,
  Underline as TextUnderline,
  // Headings
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  // Status / action
  Check,
  Minus,
  Plus,
  Link,
  Save,
  TextCursor,
  Trash2,
  Unplug,
  // Shapes & canvas primitives
  Box,
  Circle,
  Droplet,
  Frame as FrameCorners,
  Image,
  Square,
  Crop as Maximize,
  Maximize2,
  // Viewports / devices
  Monitor,
  Smartphone,
  Tablet,
  Video,
  // Layout primitives & panels
  Columns3,
  LayoutDashboard,
  LayoutGrid as SquaresFour,
  LayoutPanelLeft,
  PanelBottom,
  PanelTop,
  Rows3,
  // Pointer / cursor
  MousePointer,
  MousePointerClick,
  // Text document
  FileText,
  Menu,
  // Locks (lucide has no "simple" variant — Lock/Unlock read the same at small
  // sizes, and lucide's are stroke-consistent with the rest of the set)
  Eye,
  EyeOff as EyeClosed,
  Lock,
  Lock as LockSimple,
  LockOpen,
  Unlock as LockSimpleOpen,
  // Theming + misc
  Moon,
  Sun,
  Tags,
  type LucideIcon,
} from "lucide-react";

export {
  PlusOutline,
  SearchOutline,
  StrokeDashed,
  StrokeDotted,
  StrokeDouble,
  StrokeSolid,
} from "./custom-icons.js";
