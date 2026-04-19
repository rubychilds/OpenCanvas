import { useEffect, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import type { Component } from "grapesjs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion.js";
import { StylesPanel } from "../StylesPanel.js";
import { AppearanceSection } from "./AppearanceSection.js";
import { EffectsSection } from "./EffectsSection.js";
import { ExportsSection } from "./ExportsSection.js";
import { FillSection } from "./FillSection.js";
import { LayoutSection } from "./LayoutSection.js";
import { PositionSection } from "./PositionSection.js";
import { StrokeSection } from "./StrokeSection.js";
import { TypographySection, isTypographyTarget } from "./TypographySection.js";

/**
 * Semantic-inspector render order (per user direction):
 *   Position → Layout → Appearance → Typography → Fill → Stroke → Effects
 * Followed by Exports and the Raw CSS escape hatch at the bottom.
 *
 * Retired sections: Layer (visibility/lock live on the layer tree rows now;
 * opacity + blend moved to Appearance), Measures (split across Position and
 * Appearance), AutoLayout inline block / LayoutItem / Frame (all merged into
 * Layout), Shadow (merged into Effects alongside blur filters).
 */

function useSelectedComponent(): Component | null {
  const editor = useEditorMaybe();
  const [selected, setSelected] = useState<Component | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const update = () => setSelected(editor.getSelected() ?? null);
    update();
    editor.on("component:selected component:deselected", update);
    editor.on("component:styleUpdate component:update:style", () => force((n) => n + 1));
    return () => {
      editor.off("component:selected component:deselected", update);
    };
  }, [editor]);

  return selected;
}

export function SemanticInspector() {
  const selected = useSelectedComponent();

  if (!selected) {
    return (
      <div className="p-(--panel-padding) text-xs text-muted-foreground">
        Select a component to edit.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PositionSection component={selected} />
      <LayoutSection component={selected} />
      <AppearanceSection component={selected} />
      {isTypographyTarget(selected) ? <TypographySection component={selected} /> : null}
      <FillSection component={selected} />
      <StrokeSection component={selected} />
      <EffectsSection component={selected} />
      <ExportsSection component={selected} />
      <Accordion type="single" collapsible className="border-t border-border">
        <AccordionItem value="raw-css" className="border-b-0">
          <AccordionTrigger data-testid="oc-ins-raw-css-trigger">Raw CSS</AccordionTrigger>
          <AccordionContent>
            <StylesPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
