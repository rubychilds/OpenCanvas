import { Group, Panel, Separator } from "react-resizable-panels";
import { LeftPanel } from "./LeftPanel.js";
import { RightPanel } from "./RightPanel.js";
import { CanvasArea } from "./CanvasArea.js";

const GUTTER_CLASS =
  "group shrink-0 w-1.5 bg-surface-sunken border-x border-border " +
  "transition-colors cursor-col-resize " +
  "hover:bg-oc-accent/60 data-[active]:bg-oc-accent";

export function Shell() {
  return (
    <div className="flex-1 min-h-0 flex">
      <Group orientation="horizontal" style={{ height: "100%", width: "100%" }}>
        <Panel
          defaultSize="18%"
          minSize="10%"
          maxSize="40%"
          collapsible
          collapsedSize="0%"
          id="oc-left"
        >
          <LeftPanel />
        </Panel>
        <Separator className={GUTTER_CLASS} />
        <Panel defaultSize="62%" minSize="30%" id="oc-center">
          <CanvasArea />
        </Panel>
        <Separator className={GUTTER_CLASS} />
        <Panel
          defaultSize="20%"
          minSize="12%"
          maxSize="40%"
          collapsible
          collapsedSize="0%"
          id="oc-right"
        >
          <RightPanel />
        </Panel>
      </Group>
    </div>
  );
}
