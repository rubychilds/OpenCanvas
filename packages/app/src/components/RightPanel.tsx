import { useState } from "react";
import { SemanticInspector } from "./inspector/SemanticInspector.js";
import { TraitsPanel } from "./TraitsPanel.js";
import { cn } from "../lib/utils.js";

type Tab = "inspector" | "traits";

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("inspector");

  return (
    <aside className="flex flex-col h-full bg-surface border-l border-border overflow-hidden">
      <div className="flex border-b border-border">
        {(
          [
            { id: "inspector", label: "Inspector" },
            { id: "traits", label: "Traits" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 h-(--section-title-height) text-xs uppercase tracking-wider transition-colors",
              tab === t.id
                ? "text-foreground shadow-[inset_0_-2px_0_var(--oc-accent)]"
                : "text-muted-foreground hover:text-foreground",
            )}
            data-testid={`oc-right-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === "inspector" ? <SemanticInspector /> : (
          <div className="p-(--panel-padding)">
            <TraitsPanel />
          </div>
        )}
      </div>
    </aside>
  );
}
