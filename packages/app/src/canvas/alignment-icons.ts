import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignStartVertical,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  StretchHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface IconOption {
  value: string;
  label: string;
  Icon: LucideIcon;
}

/** Icons for flex-direction ToggleGroup. */
export const FLEX_DIRECTION_OPTIONS: IconOption[] = [
  { value: "row", label: "Row", Icon: ArrowRight },
  { value: "row-reverse", label: "Row reverse", Icon: ArrowLeft },
  { value: "column", label: "Column", Icon: ArrowDown },
  { value: "column-reverse", label: "Column reverse", Icon: ArrowUp },
];

/** Icons for justify-content ToggleGroup (horizontal main axis). */
export const JUSTIFY_CONTENT_OPTIONS: IconOption[] = [
  { value: "flex-start", label: "Start", Icon: AlignHorizontalJustifyStart },
  { value: "center", label: "Center", Icon: AlignHorizontalJustifyCenter },
  { value: "flex-end", label: "End", Icon: AlignHorizontalJustifyEnd },
  { value: "space-between", label: "Space between", Icon: AlignHorizontalSpaceBetween },
  { value: "space-around", label: "Space around", Icon: AlignHorizontalSpaceAround },
];

/** Icons for align-items ToggleGroup (cross axis on a horizontal container). */
export const ALIGN_ITEMS_OPTIONS: IconOption[] = [
  { value: "flex-start", label: "Top", Icon: AlignStartVertical },
  { value: "center", label: "Middle", Icon: AlignCenterVertical },
  { value: "flex-end", label: "Bottom", Icon: AlignEndVertical },
  { value: "stretch", label: "Stretch", Icon: StretchHorizontal },
];

/**
 * CSS property names that should render as an icon ToggleGroup rather than a
 * select dropdown. Keep this list tight — unknown-shape icons look worse than
 * a plain select.
 */
export const ICON_TOGGLE_PROPS = new Set(["flex-direction", "justify-content", "align-items"]);

export function optionsForProperty(propName: string): IconOption[] | null {
  switch (propName) {
    case "flex-direction":
      return FLEX_DIRECTION_OPTIONS;
    case "justify-content":
      return JUSTIFY_CONTENT_OPTIONS;
    case "align-items":
      return ALIGN_ITEMS_OPTIONS;
    default:
      return null;
  }
}
