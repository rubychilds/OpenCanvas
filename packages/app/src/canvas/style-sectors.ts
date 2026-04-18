import type { EditorConfig } from "grapesjs";

type StyleManagerConfig = NonNullable<EditorConfig["styleManager"]>;

/**
 * Style Manager sectors focused on layout-first workflows. The Layout sector
 * covers display + flexbox (Story 1.6). Other sectors mirror a typical
 * design-tool organization so agents and humans see the same controls.
 */
export const STYLE_MANAGER_CONFIG: StyleManagerConfig = {
  sectors: [
    {
      name: "Layout",
      open: true,
      properties: [
        {
          name: "Display",
          property: "display",
          type: "select",
          default: "block",
          options: [
            { id: "block", label: "block" },
            { id: "inline", label: "inline" },
            { id: "inline-block", label: "inline-block" },
            { id: "flex", label: "flex" },
            { id: "grid", label: "grid" },
            { id: "none", label: "none" },
          ],
        },
        {
          name: "Direction",
          property: "flex-direction",
          type: "radio",
          default: "row",
          requires: { display: ["flex"] },
          options: [
            { id: "row", label: "row" },
            { id: "row-reverse", label: "row-rev" },
            { id: "column", label: "col" },
            { id: "column-reverse", label: "col-rev" },
          ],
        },
        {
          name: "Wrap",
          property: "flex-wrap",
          type: "radio",
          default: "nowrap",
          requires: { display: ["flex"] },
          options: [
            { id: "nowrap", label: "nowrap" },
            { id: "wrap", label: "wrap" },
            { id: "wrap-reverse", label: "wrap-rev" },
          ],
        },
        {
          name: "Justify",
          property: "justify-content",
          type: "select",
          default: "flex-start",
          requires: { display: ["flex"] },
          options: [
            { id: "flex-start", label: "start" },
            { id: "center", label: "center" },
            { id: "flex-end", label: "end" },
            { id: "space-between", label: "space-between" },
            { id: "space-around", label: "space-around" },
            { id: "space-evenly", label: "space-evenly" },
          ],
        },
        {
          name: "Align",
          property: "align-items",
          type: "select",
          default: "stretch",
          requires: { display: ["flex"] },
          options: [
            { id: "stretch", label: "stretch" },
            { id: "flex-start", label: "start" },
            { id: "center", label: "center" },
            { id: "flex-end", label: "end" },
            { id: "baseline", label: "baseline" },
          ],
        },
        {
          name: "Gap",
          property: "gap",
          type: "integer",
          units: ["px", "rem", "em", "%"],
          default: "0",
          requires: { display: ["flex", "grid"] },
        },
        {
          name: "Flex grow",
          property: "flex-grow",
          type: "integer",
          default: "0",
        },
        {
          name: "Flex shrink",
          property: "flex-shrink",
          type: "integer",
          default: "1",
        },
        {
          name: "Flex basis",
          property: "flex-basis",
          type: "integer",
          units: ["px", "rem", "em", "%", "auto"],
          default: "auto",
        },
      ],
    },
    {
      name: "Size & spacing",
      open: false,
      buildProps: ["width", "height", "min-width", "min-height", "max-width", "max-height", "margin", "padding"],
    },
    {
      name: "Typography",
      open: false,
      buildProps: ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color", "text-align"],
    },
    {
      // Renamed from "Background & border" to match Figma's semantic — Fill
      // owns every colour-bearing surface (bg, border, shadow).
      name: "Fill",
      open: false,
      buildProps: [
        "background-color",
        "background-image",
        "border",
        "border-radius",
        "box-shadow",
        "opacity",
      ],
    },
  ],
};
