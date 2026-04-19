import * as React from "react";
import type { Component } from "grapesjs";
import { Eye, EyeOff, Plus, Trash2 } from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";
import { ColorField } from "./controls/ColorField.js";
import { formatColor, parseColor, splitTopLevel } from "./controls/color-utils.js";

interface FillLayer {
  id: string;
  hex: string;
  opacity: number;
  hidden: boolean;
}

function newLayer(hex = "#808080", opacity = 1): FillLayer {
  return {
    id: `f_${Math.random().toString(36).slice(2, 9)}`,
    hex,
    opacity,
    hidden: false,
  };
}

/**
 * Parse the component's `background-image` + `background-color` back into an
 * ordered stack. Only recognises our own output shape — comma-separated
 * `linear-gradient(colour, colour)` tokens, or a single solid `background-color`.
 * Returns null when the CSS is something we didn't author (complex gradients,
 * angles, images), signalling "fall back to Raw CSS".
 */
function parseStack(bgImage: string, bgColor: string): FillLayer[] | null {
  const img = (bgImage || "").trim();
  const col = (bgColor || "").trim();

  if (!img || img === "none") {
    if (!col) return [];
    const c = parseColor(col);
    return [newLayer(c.hex, c.opacity)];
  }

  const tokens = splitTopLevel(img);
  const layers: FillLayer[] = [];
  for (const tok of tokens) {
    const m = /^linear-gradient\s*\((.+)\)\s*$/i.exec(tok);
    if (!m) return null;
    const inner = splitTopLevel(m[1]!);
    // Accept either a single colour or two copies of the same colour.
    if (inner.length === 0 || inner.length > 2) return null;
    if (inner.length === 2 && inner[0] !== inner[1]) return null;
    const c = parseColor(inner[0]!);
    layers.push(newLayer(c.hex, c.opacity));
  }
  return layers;
}

function compileStack(layers: FillLayer[]): { bgColor: string; bgImage: string } {
  const visible = layers.filter((l) => !l.hidden);
  if (visible.length === 0) return { bgColor: "", bgImage: "" };
  if (visible.length === 1) {
    const l = visible[0]!;
    return { bgColor: formatColor(l.hex, l.opacity), bgImage: "" };
  }
  const gradients = visible.map((l) => {
    const c = formatColor(l.hex, l.opacity);
    return `linear-gradient(${c}, ${c})`;
  });
  return { bgColor: "", bgImage: gradients.join(", ") };
}

function FillRow({
  layer,
  onChange,
  onRemove,
  testIdBase,
}: {
  layer: FillLayer;
  onChange: (next: FillLayer) => void;
  onRemove: () => void;
  testIdBase: string;
}) {
  return (
    <div className="flex items-center gap-1" data-testid={testIdBase}>
      <ColorField
        value={layer.hex}
        onChange={(hex) => onChange({ ...layer, hex })}
        data-testid={`${testIdBase}-color`}
        className="flex-1"
      />
      <div className="w-[52px] shrink-0">
        <NumberInput
          value={Math.round(layer.opacity * 100)}
          onChange={(n) => onChange({ ...layer, opacity: Math.max(0, Math.min(100, n)) / 100 })}
          min={0}
          max={100}
          step={1}
          unit="%"
          label="%"
          data-testid={`${testIdBase}-opacity`}
        />
      </div>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded-sm shrink-0",
          "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
          layer.hidden && "text-foreground",
        )}
        onClick={() => onChange({ ...layer, hidden: !layer.hidden })}
        aria-label={layer.hidden ? "Show fill" : "Hide fill"}
        data-testid={`${testIdBase}-visibility`}
      >
        {layer.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded-sm shrink-0",
          "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
        )}
        onClick={onRemove}
        aria-label="Remove fill"
        data-testid={`${testIdBase}-remove`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Multi-layer fill stack per ADR-0003. Renders an ordered list of solid-colour
 * fills; first item is the top of the stack (drawn on top in CSS). Opacity is
 * per-layer via `rgba()`. Hidden layers are excluded from the compiled CSS but
 * retained in the local stack so the user can toggle them back on.
 *
 * Limitation: only our own output shape round-trips. Angled or multi-stop
 * gradients set via Raw CSS collapse to the Raw CSS note.
 */
export function FillSection({ component }: { component: Component }) {
  const bgImage = readStyle(component, "background-image");
  const bgColor = readStyle(component, "background-color");
  const parsed = React.useMemo(() => parseStack(bgImage, bgColor), [bgImage, bgColor, component]);

  // Local stack state mirrors the component's style but keeps hidden layers
  // across edits that would otherwise be invisible to a reader that only saw
  // the compiled CSS.
  const [localStack, setLocalStack] = React.useState<FillLayer[]>(() => parsed ?? []);
  const lastComponentRef = React.useRef<Component | null>(component);

  React.useEffect(() => {
    // Re-seed from CSS whenever the selection changes (component identity
    // flip) or when the compiled CSS diverges from what we last emitted.
    if (lastComponentRef.current !== component) {
      lastComponentRef.current = component;
      setLocalStack(parsed ?? []);
      return;
    }
    if (parsed === null) return;
    const compiled = compileStack(localStack);
    if (compiled.bgColor !== (bgColor || "") || compiled.bgImage !== (bgImage || "")) {
      // External CSS change (e.g. via Raw CSS edit) — adopt it.
      const externalMatches = parsedEquals(parsed, localStack);
      if (!externalMatches) setLocalStack(parsed);
    }
  }, [parsed, bgColor, bgImage, component, localStack]);

  const commit = (next: FillLayer[]) => {
    setLocalStack(next);
    const { bgColor: bc, bgImage: bi } = compileStack(next);
    if (bc) writeStyle(component, "background-color", bc);
    else clearStyle(component, "background-color");
    if (bi) writeStyle(component, "background-image", bi);
    else clearStyle(component, "background-image");
  };

  if (parsed === null) {
    return (
      <InspectorSection title="Fill">
        <p className="text-[11px] text-muted-foreground py-1" data-testid="oc-ins-fill-rawcss-note">
          Fill uses a value we can't represent as a stack (complex gradient or
          image). Edit in Raw CSS below.
        </p>
      </InspectorSection>
    );
  }

  const addLayer = () => {
    const top = localStack[0];
    const seed = top ? newLayer(top.hex, top.opacity) : newLayer();
    commit([seed, ...localStack]);
  };

  const action = (
    <button
      type="button"
      onClick={addLayer}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded-sm",
        "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
      )}
      aria-label="Add fill"
      data-testid="oc-ins-fill-add"
    >
      <Plus className="size-3.5" />
    </button>
  );

  return (
    <InspectorSection title="Fill" action={action}>
      {localStack.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-1">No fill. + Add one.</p>
      ) : (
        localStack.map((layer, i) => (
          <FillRow
            key={layer.id}
            layer={layer}
            onChange={(next) => {
              const copy = localStack.slice();
              copy[i] = next;
              commit(copy);
            }}
            onRemove={() => {
              const copy = localStack.slice();
              copy.splice(i, 1);
              commit(copy);
            }}
            testIdBase={`oc-ins-fill-row-${i}`}
          />
        ))
      )}
    </InspectorSection>
  );
}

function parsedEquals(a: FillLayer[], b: FillLayer[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x.hex !== y.hex || x.opacity !== y.opacity || x.hidden !== y.hidden) return false;
  }
  return true;
}
