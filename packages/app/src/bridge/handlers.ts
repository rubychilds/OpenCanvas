import type { Editor, Component } from "grapesjs";
import { toPng, toJpeg } from "html-to-image";
import {
  AddComponentsInput,
  type ComponentNodeT,
  DeleteNodesInput,
  GetCssInput,
  GetHtmlInput,
  GetJsxInput,
  GetScreenshotInput,
  GetTreeInput,
  PingInput,
  UpdateStylesInput,
} from "@opencanvas/bridge";
import { htmlToJsx, mergeStylesIntoHtml } from "../canvas/jsx-export.js";

type ToolHandler = (params: unknown) => Promise<unknown> | unknown;

function serializeComponent(component: Component, maxDepth: number, depth = 0): ComponentNodeT {
  const attrs = component.getAttributes();
  const rawClasses = component.getClasses() as unknown as Array<string | { get: (k: string) => unknown }>;
  const classes: string[] = rawClasses
    .map((c) => (typeof c === "string" ? c : (c.get("name") as string | undefined)))
    .filter((c): c is string => typeof c === "string");
  const childComponents = component.components() as unknown as { toArray: () => Component[] };
  const childArray: Component[] = childComponents.toArray();
  const children = depth >= maxDepth ? [] : childArray.map((child) => serializeComponent(child, maxDepth, depth + 1));
  const tagName = component.get("tagName") as string | undefined;
  const type = component.get("type") as string | undefined;
  return {
    id: component.getId(),
    type: type ?? "default",
    tagName,
    classes,
    attributes: Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [k, String(v)]),
    ) as Record<string, string>,
    textContent: typeof component.get("content") === "string" ? (component.get("content") as string) : undefined,
    children,
  };
}

function findById(editor: Editor, id: string): Component | undefined {
  const wrapper = editor.getWrapper();
  if (!wrapper) return undefined;
  if (wrapper.getId() === id) return wrapper;
  const stack: Component[] = [wrapper];
  while (stack.length > 0) {
    const c = stack.pop()!;
    const childArray = (c.components() as unknown as { toArray: () => Component[] }).toArray();
    for (const child of childArray) {
      if (child.getId() === id) return child;
      stack.push(child);
    }
  }
  return undefined;
}

export function buildHandlers(editor: Editor): Record<string, ToolHandler> {
  return {
    ping: (params) => {
      PingInput.parse(params);
      return { pong: true, at: Date.now() };
    },

    get_tree: (params) => {
      const input = GetTreeInput.parse(params);
      const wrapper = editor.getWrapper();
      if (!wrapper) return { root: null };
      const depth = input.depth ?? Number.POSITIVE_INFINITY;
      return { root: serializeComponent(wrapper, depth) };
    },

    get_html: (params) => {
      const input = GetHtmlInput.parse(params);
      if (input.componentId) {
        const c = findById(editor, input.componentId);
        if (!c) throw new Error(`component not found: ${input.componentId}`);
        return { html: c.toHTML() };
      }
      return { html: editor.getHtml() };
    },

    get_css: (params) => {
      const input = GetCssInput.parse(params);
      if (input.componentId) {
        const c = findById(editor, input.componentId);
        if (!c) throw new Error(`component not found: ${input.componentId}`);
        return { css: editor.getCss({ component: c }) ?? "" };
      }
      return { css: editor.getCss() ?? "" };
    },

    get_screenshot: async (params) => {
      const input = GetScreenshotInput.parse(params);
      const scale = input.scale ?? 1;
      const format = input.format ?? "png";
      const frameEl = editor.Canvas.getFrameEl() as HTMLIFrameElement | null;
      const doc = frameEl?.contentDocument;
      const body = doc?.body;
      if (!body) throw new Error("canvas iframe not ready");
      const options = { pixelRatio: scale, cacheBust: true };
      const dataUrl =
        format === "jpeg" ? await toJpeg(body, options) : await toPng(body, options);
      return {
        dataUrl,
        width: body.scrollWidth * scale,
        height: body.scrollHeight * scale,
      };
    },

    get_selection: () => {
      const selected = editor.getSelectedAll();
      return { componentIds: selected.map((c) => c.getId()) };
    },

    add_components: (params) => {
      const input = AddComponentsInput.parse(params);
      const parent = input.target ? findById(editor, input.target) : undefined;
      const added = parent
        ? parent.append(input.html)
        : editor.addComponents(input.html);
      const list = Array.isArray(added) ? added : [added];
      return { componentIds: list.filter(Boolean).map((c) => (c as Component).getId()) };
    },

    update_styles: (params) => {
      const input = UpdateStylesInput.parse(params);
      const c = findById(editor, input.componentId);
      if (!c) throw new Error(`component not found: ${input.componentId}`);
      c.addStyle(input.styles);
      return { styles: c.getStyle() };
    },

    delete_nodes: (params) => {
      const input = DeleteNodesInput.parse(params);
      let deleted = 0;
      for (const id of input.componentIds) {
        const c = findById(editor, id);
        if (!c) continue;
        deleted += 1 + countDescendants(c);
        c.remove();
      }
      return { deleted };
    },

    get_jsx: (params) => {
      const input = GetJsxInput.parse(params);
      let html: string;
      let css: string;
      if (input.componentId) {
        const c = findById(editor, input.componentId);
        if (!c) throw new Error(`component not found: ${input.componentId}`);
        html = c.toHTML();
        css = editor.getCss({ component: c }) ?? "";
      } else {
        html = editor.getHtml();
        css = editor.getCss() ?? "";
      }
      const merged = mergeStylesIntoHtml(html, css);
      return { jsx: htmlToJsx(merged, input.mode ?? "tailwind") };
    },
  };
}

function countDescendants(c: Component): number {
  let n = 0;
  const childArray = (c.components() as unknown as { toArray: () => Component[] }).toArray();
  for (const child of childArray) {
    n += 1 + countDescendants(child);
  }
  return n;
}
