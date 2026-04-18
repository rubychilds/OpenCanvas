import { Canvas, useEditorMaybe } from "@grapesjs/react";

const ZOOM_PRESETS = [50, 100, 200] as const;

export function CanvasArea() {
  const editor = useEditorMaybe();

  const setZoom = (z: number) => editor?.Canvas.setZoom(z);
  const fit = () => editor?.runCommand("core:canvas-fit");

  return (
    <div className="oc-canvas">
      <div className="oc-canvas__toolbar">
        <button type="button" className="oc-canvas__zoom" onClick={fit}>
          Fit
        </button>
        {ZOOM_PRESETS.map((z) => (
          <button
            key={z}
            type="button"
            className="oc-canvas__zoom"
            onClick={() => setZoom(z)}
          >
            {z}%
          </button>
        ))}
      </div>
      <Canvas className="oc-canvas__viewport" />
    </div>
  );
}
