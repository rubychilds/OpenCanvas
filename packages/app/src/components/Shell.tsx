import { Group, Panel, Separator } from "react-resizable-panels";
import { LeftPanel } from "./LeftPanel.js";
import { RightPanel } from "./RightPanel.js";
import { CanvasArea } from "./CanvasArea.js";

export function Shell() {
  return (
    <div className="oc-shell__body">
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
        <Separator className="oc-resize-handle" />
        <Panel defaultSize="62%" minSize="30%" id="oc-center">
          <CanvasArea />
        </Panel>
        <Separator className="oc-resize-handle" />
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
