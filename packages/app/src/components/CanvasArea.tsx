import { Canvas } from "@grapesjs/react";
import { ArtboardBootstrap } from "./ArtboardBootstrap.js";
import { InsertRail } from "./InsertRail.js";
import { Minimap } from "./Minimap.js";
import { PanZoomWire } from "./PanZoomWire.js";
import { ZoomControl } from "./ZoomControl.js";

export function CanvasArea() {
  return (
    <div className="flex flex-col h-full bg-canvas">
      <div className="flex-1 min-h-0 relative">
        <Canvas className="absolute inset-0" />
        <div className="absolute left-3 top-3 z-10">
          <InsertRail />
        </div>
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
