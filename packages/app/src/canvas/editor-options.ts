import type { EditorConfig } from "grapesjs";
import { DEFAULT_BLOCKS } from "./blocks.js";
import { STYLE_MANAGER_CONFIG } from "./style-sectors.js";

const TAILWIND_V4_CDN = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";

export const editorOptions: EditorConfig = {
  height: "100%",
  width: "auto",
  storageManager: false,
  canvas: {
    scripts: [TAILWIND_V4_CDN],
    styles: [],
    // Spatial, pannable/zoomable canvas that hosts multiple artboard frames
    // at their own world-coordinates (x/y/width/height per addFrame call).
    // Flagged experimental in GrapesJS 0.22 but is load-bearing for Epic 5.
    infiniteCanvas: true,
  },
  blockManager: {
    blocks: DEFAULT_BLOCKS,
    custom: true,
  },
  styleManager: {
    ...STYLE_MANAGER_CONFIG,
    custom: true,
  },
  layerManager: {
    custom: true,
  },
  traitManager: {
    custom: true,
  },
  panels: { defaults: [] },
};
