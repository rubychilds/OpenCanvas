import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.js";
import { BlocksPanel } from "./BlocksPanel.js";
import { LayersPanel } from "./LayersPanel.js";

export function LeftPanel() {
  return (
    <Tabs
      defaultValue="blocks"
      className="flex flex-col h-full bg-surface border-r border-border overflow-hidden"
    >
      <TabsList>
        <TabsTrigger value="blocks">Blocks</TabsTrigger>
        <TabsTrigger value="layers">Layers</TabsTrigger>
      </TabsList>
      <TabsContent value="blocks" className="p-2">
        <BlocksPanel />
      </TabsContent>
      <TabsContent value="layers" className="p-1.5">
        <LayersPanel />
      </TabsContent>
    </Tabs>
  );
}
