import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.js";
import { LayersPanel } from "./LayersPanel.js";
import { ArtboardsPanel } from "./ArtboardsPanel.js";
import { BlocksPanel } from "./BlocksPanel.js";

/**
 * Per D.3b/c, the InsertRail (left-edge of the canvas) is the primary
 * creation path; Layers is the primary panel. Blocks stays as a tertiary tab
 * so the full catalogue (with drag-to-canvas) remains reachable for power
 * users — it mirrors Figma's Assets panel sitting alongside Layers.
 */
export function LeftPanel() {
  return (
    <Tabs
      defaultValue="layers"
      className="flex flex-col h-full bg-surface border-r border-border overflow-hidden"
    >
      <TabsList>
        <TabsTrigger value="layers">Layers</TabsTrigger>
        <TabsTrigger value="artboards">Artboards</TabsTrigger>
        <TabsTrigger value="blocks">Blocks</TabsTrigger>
      </TabsList>
      <TabsContent value="layers" className="p-1.5">
        <LayersPanel />
      </TabsContent>
      <TabsContent value="artboards" className="p-1.5">
        <ArtboardsPanel />
      </TabsContent>
      <TabsContent value="blocks" className="p-2">
        <BlocksPanel />
      </TabsContent>
    </Tabs>
  );
}
