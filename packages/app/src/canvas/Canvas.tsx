import GjsEditor from "@grapesjs/react";
import grapesjs from "grapesjs";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";

const TAILWIND_V4_CDN = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";

export interface CanvasProps {
  onEditor: (editor: Editor) => void;
}

export function Canvas({ onEditor }: CanvasProps) {
  return (
    <GjsEditor
      grapesjs={grapesjs}
      options={{
        height: "100%",
        width: "auto",
        storageManager: false,
        canvas: {
          scripts: [TAILWIND_V4_CDN],
          styles: [],
        },
        components: "",
        style: "",
      }}
      onEditor={onEditor}
    />
  );
}
