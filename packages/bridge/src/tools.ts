import { z } from "zod";

export const PingInput = z.object({}).strict();
export const PingOutput = z.object({ pong: z.literal(true), at: z.number() });

export const GetTreeInput = z.object({ depth: z.number().int().positive().optional() }).strict();
export interface ComponentNodeT {
  id: string;
  type: string;
  tagName?: string;
  classes: string[];
  attributes: Record<string, string>;
  textContent?: string;
  children: ComponentNodeT[];
}
export const ComponentNode: z.ZodType<ComponentNodeT> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    tagName: z.string().optional(),
    classes: z.array(z.string()),
    attributes: z.record(z.string()),
    textContent: z.string().optional(),
    children: z.array(ComponentNode),
  }),
);
export const GetTreeOutput = z.object({ root: ComponentNode.nullable() });

export const GetHtmlInput = z.object({ componentId: z.string().optional() }).strict();
export const GetHtmlOutput = z.object({ html: z.string() });

export const GetCssInput = z.object({ componentId: z.string().optional() }).strict();
export const GetCssOutput = z.object({ css: z.string() });

export const GetScreenshotInput = z
  .object({
    scale: z.union([z.literal(1), z.literal(2)]).optional(),
    format: z.enum(["png", "jpeg"]).optional(),
  })
  .strict();
export const GetScreenshotOutput = z.object({
  dataUrl: z.string(),
  width: z.number(),
  height: z.number(),
});

export const GetSelectionInput = z.object({}).strict();
export const GetSelectionOutput = z.object({ componentIds: z.array(z.string()) });

export const AddComponentsInput = z
  .object({ html: z.string(), target: z.string().optional() })
  .strict();
export const AddComponentsOutput = z.object({ componentIds: z.array(z.string()) });

export const UpdateStylesInput = z
  .object({
    componentId: z.string(),
    styles: z.record(z.string()),
  })
  .strict();
export const UpdateStylesOutput = z.object({ styles: z.record(z.string()) });

export const DeleteNodesInput = z.object({ componentIds: z.array(z.string()) }).strict();
export const DeleteNodesOutput = z.object({ deleted: z.number().int().nonnegative() });

export const GetJsxInput = z
  .object({
    componentId: z.string().optional(),
    mode: z.enum(["tailwind", "inline"]).optional(),
  })
  .strict();
export const GetJsxOutput = z.object({ jsx: z.string() });

export const GetVariablesInput = z.object({}).strict();
export const GetVariablesOutput = z.object({ variables: z.record(z.string()) });

export const SetVariablesInput = z
  .object({ variables: z.record(z.string()) })
  .strict();
export const SetVariablesOutput = z.object({ variables: z.record(z.string()) });

export const TOOL_SCHEMAS = {
  ping: { input: PingInput, output: PingOutput },
  get_tree: { input: GetTreeInput, output: GetTreeOutput },
  get_html: { input: GetHtmlInput, output: GetHtmlOutput },
  get_css: { input: GetCssInput, output: GetCssOutput },
  get_screenshot: { input: GetScreenshotInput, output: GetScreenshotOutput },
  get_selection: { input: GetSelectionInput, output: GetSelectionOutput },
  add_components: { input: AddComponentsInput, output: AddComponentsOutput },
  update_styles: { input: UpdateStylesInput, output: UpdateStylesOutput },
  delete_nodes: { input: DeleteNodesInput, output: DeleteNodesOutput },
  get_jsx: { input: GetJsxInput, output: GetJsxOutput },
  get_variables: { input: GetVariablesInput, output: GetVariablesOutput },
  set_variables: { input: SetVariablesInput, output: SetVariablesOutput },
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  ping: "Health check. Returns { pong: true, at: <timestamp> } when the canvas is connected.",
  get_tree:
    "Read the full component tree of the canvas as recursive JSON. Optional depth limits tree depth for large documents.",
  get_html:
    "Get clean HTML for the canvas or a specific componentId subtree. Output is suitable for direct use in a React component.",
  get_css:
    "Get CSS stylesheet for the canvas or a specific componentId subtree.",
  get_screenshot:
    "Capture a PNG/JPEG screenshot of the canvas iframe as a base64 data URL. scale=2 for high fidelity.",
  get_selection:
    "Return the componentIds of currently selected elements in the editor. Empty array if nothing selected.",
  add_components:
    "Insert raw HTML onto the canvas. Tailwind classes resolve correctly. Returns the created componentIds. Optional target inserts into a specific parent.",
  update_styles:
    "Update CSS properties on an existing component. Accepts both CSS properties and Tailwind utility strings (via the 'class' key convention).",
  delete_nodes:
    "Remove components and their children by id. Returns the total count of deleted nodes.",
  get_jsx:
    "Convert canvas HTML to a JSX component string. mode='tailwind' (default) preserves className and drops style props expressible as Tailwind utilities (padding, margin, color, background-color, width, height, display, flex-direction). mode='inline' converts every CSS property to a JSX style object. Optional componentId scopes output to a subtree.",
  get_variables:
    "Read CSS custom properties currently applied to the canvas iframe :root. Returns a flat key→value map (e.g. { '--brand-primary': 'oklch(0.55 0.2 260)' }).",
  set_variables:
    "Write CSS custom properties to the canvas iframe :root. Variables are merged into the existing set (existing keys overwritten, others preserved). Persisted to .opencanvas.json under cssVariables and re-applied on reload. Returns the full updated map.",
};
