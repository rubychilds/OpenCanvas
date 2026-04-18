import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.js";
import { StylesPanel } from "./StylesPanel.js";
import { TraitsPanel } from "./TraitsPanel.js";

export function RightPanel() {
  return (
    <Tabs
      defaultValue="styles"
      className="flex flex-col h-full bg-surface border-l border-border overflow-hidden"
    >
      <TabsList>
        <TabsTrigger value="styles">Styles</TabsTrigger>
        <TabsTrigger value="traits">Traits</TabsTrigger>
      </TabsList>
      <TabsContent value="styles" className="p-2">
        <StylesPanel />
      </TabsContent>
      <TabsContent value="traits" className="p-2">
        <TraitsPanel />
      </TabsContent>
    </Tabs>
  );
}
