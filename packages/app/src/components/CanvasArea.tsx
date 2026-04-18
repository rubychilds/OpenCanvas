import { Canvas } from "@grapesjs/react";
import { ArtboardToolbar } from "./ArtboardToolbar.js";
import { ArtboardBootstrap } from "./ArtboardBootstrap.js";
import { Minimap } from "./Minimap.js";
import { PanZoomWire } from "./PanZoomWire.js";
import { ZoomControl } from "./ZoomControl.js";

export function CanvasArea() {
  return (
    <div className="flex flex-col h-full bg-canvas">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border bg-surface">
        <ArtboardToolbar />
      </div>
      <div className="flex-1 min-h-0 relative">
        <Canvas className="absolute inset-0" />
        <Minimap />
        <div className="absolute bottom-3 right-3 z-10">
          <ZoomControl />
        </div>
      </div>
      <ArtboardBootstrap />
      <PanZoomWire />
    </div>
  );
}
