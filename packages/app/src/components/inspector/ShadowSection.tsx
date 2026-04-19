import * as React from "react";
import type { Component } from "grapesjs";
import { Eye, EyeOff, Plus, Trash2 } from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";
import { ColorField } from "./controls/ColorField.js";
import { formatColor, parseColor, splitTopLevel } from "./controls/color-utils.js";

interface ShadowEntry {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  hex: string;
  opacity: number;
  inset: boolean;
  hidden: boolean;
}

function newShadow(): ShadowEntry {
  return {
    id: `s_${Math.random().toString(36).slice(2, 9)}`,
    x: 0,
    y: 2,
    blur: 8,
    spread: 0,
    hex: "#000000",
    opacity: 0.2,
    inset: false,
    hidden: false,
  };
}

/**
 * Split a single box-shadow entry like `inset 2px 4px 8px 0 rgba(0,0,0,.2)`
 * into `inset` / numeric tokens (trailing `px`) / colour token. Tokens inside
 * parentheses survive as one unit so `rgba(0, 0, 0, 0.5)` isn't split by its
 * internal commas. Returns null when the value doesn't look like a simple
 * box-shadow.
 */
function tokenizeShadow(input: string): { inset: boolean; lengths: number[]; color: string } | null {
  const tokens: string[] = [];
  let depth = 0;
  let start = 0;
  const s = input.trim();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && /\s/.test(ch)) {
      const t = s.slice(start, i).trim();
      if (t) tokens.push(t);
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail) tokens.push(tail);

  let inset = false;
  if (tokens[0] === "inset") {
    inset = true;
    tokens.shift();
  } else if (tokens[tokens.length - 1] === "inset") {
    inset = true;
    tokens.pop();
  }

  const lengths: number[] = [];
  let color = "";
  for (const t of tokens) {
    const m = /^(-?\d+(?:\.\d+)?)(px|rem|em)?$/.exec(t);
    if (m && color === "") lengths.push(parseFloat(m[1]!));
    else color = color ? `${color} ${t}` : t;
  }

  if (lengths.length < 2) return null;
  return { inset, lengths, color: color || "rgba(0,0,0,1)" };
}

function parseStack(input: string): ShadowEntry[] | null {
  const raw = (input || "").trim();
  if (!raw || raw === "none") return [];
  const entries: ShadowEntry[] = [];
  for (const tok of splitTopLevel(raw)) {
    const parsed = tokenizeShadow(tok);
    if (!parsed) return null;
    const c = parseColor(parsed.color);
    entries.push({
      id: `s_${Math.random().toString(36).slice(2, 9)}`,
      x: parsed.lengths[0] ?? 0,
      y: parsed.lengths[1] ?? 0,
      blur: parsed.lengths[2] ?? 0,
      spread: parsed.lengths[3] ?? 0,
      hex: c.hex,
      opacity: c.opacity,
      inset: parsed.inset,
      hidden: false,
    });
  }
  return entries;
}

function compileStack(stack: ShadowEntry[]): string {
  const visible = stack.filter((s) => !s.hidden);
  if (visible.length === 0) return "";
  return visible
    .map((s) => {
      const prefix = s.inset ? "inset " : "";
      const c = formatColor(s.hex, s.opacity);
      return `${prefix}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${c}`;
    })
    .join(", ");
}

function ShadowRow({
  entry,
  onChange,
  onRemove,
  testIdBase,
}: {
  entry: ShadowEntry;
  onChange: (next: ShadowEntry) => void;
  onRemove: () => void;
  testIdBase: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-1" data-testid={testIdBase}>
      <div className="grid grid-cols-4 gap-1">
        <NumberInput
          value={entry.x}
          onChange={(n) => onChange({ ...entry, x: n })}
          step={1}
          label="X"
          data-testid={`${testIdBase}-x`}
        />
        <NumberInput
          value={entry.y}
          onChange={(n) => onChange({ ...entry, y: n })}
          step={1}
          label="Y"
          data-testid={`${testIdBase}-y`}
        />
        <NumberInput
          value={entry.blur}
          onChange={(n) => onChange({ ...entry, blur: Math.max(0, n) })}
          min={0}
          step={1}
          label="B"
          data-testid={`${testIdBase}-blur`}
        />
        <NumberInput
          value={entry.spread}
          onChange={(n) => onChange({ ...entry, spread: n })}
          step={1}
          label="S"
          data-testid={`${testIdBase}-spread`}
        />
      </div>
      <div className="flex items-center gap-1">
        <ColorField
          value={entry.hex}
          showHex={false}
          onChange={(hex) => onChange({ ...entry, hex })}
          data-testid={`${testIdBase}-color`}
        />
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={entry.inset}
            onChange={(e) => onChange({ ...entry, inset: e.target.checked })}
            className="accent-oc-accent"
            data-testid={`${testIdBase}-inset`}
          />
          inset
        </label>
        <div className="flex-1" />
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded-sm shrink-0",
            "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
            entry.hidden && "text-foreground",
          )}
          onClick={() => onChange({ ...entry, hidden: !entry.hidden })}
          aria-label={entry.hidden ? "Show shadow" : "Hide shadow"}
          data-testid={`${testIdBase}-visibility`}
        >
          {entry.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded-sm shrink-0",
            "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
          )}
          onClick={onRemove}
          aria-label="Remove shadow"
          data-testid={`${testIdBase}-remove`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Shadow section — an ordered stack of box-shadows (outer + inset supported).
 * Parses the existing `box-shadow` CSS via a simple tokenizer; when parsing
 * fails, presents an empty stack so the user can re-author rather than
 * surfacing a broken state.
 */
export function ShadowSection({ component }: { component: Component }) {
  const raw = readStyle(component, "box-shadow");
  const parsed = React.useMemo(() => parseStack(raw), [raw]);

  const [localStack, setLocalStack] = React.useState<ShadowEntry[]>(() => parsed ?? []);
  const lastComponentRef = React.useRef<Component | null>(component);

  React.useEffect(() => {
    if (lastComponentRef.current !== component) {
      lastComponentRef.current = component;
      setLocalStack(parsed ?? []);
      return;
    }
    if (parsed === null) return;
    const compiled = compileStack(localStack);
    if (compiled !== (raw || "")) {
      const matches = shadowStacksEqual(parsed, localStack);
      if (!matches) setLocalStack(parsed);
    }
  }, [parsed, raw, component, localStack]);

  const commit = (next: ShadowEntry[]) => {
    setLocalStack(next);
    const compiled = compileStack(next);
    if (compiled) writeStyle(component, "box-shadow", compiled);
    else clearStyle(component, "box-shadow");
  };

  const addShadow = () => commit([newShadow(), ...localStack]);

  const action = (
    <button
      type="button"
      onClick={addShadow}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded-sm",
        "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
      )}
      aria-label="Add shadow"
      data-testid="oc-ins-shadow-add"
    >
      <Plus className="size-3.5" />
    </button>
  );

  return (
    <InspectorSection title="Shadow" action={action}>
      {localStack.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-1">No shadow. + Add one.</p>
      ) : (
        localStack.map((entry, i) => (
          <ShadowRow
            key={entry.id}
            entry={entry}
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
            testIdBase={`oc-ins-shadow-row-${i}`}
          />
        ))
      )}
    </InspectorSection>
  );
}

function shadowStacksEqual(a: ShadowEntry[], b: ShadowEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.x !== y.x ||
      x.y !== y.y ||
      x.blur !== y.blur ||
      x.spread !== y.spread ||
      x.hex !== y.hex ||
      x.opacity !== y.opacity ||
      x.inset !== y.inset ||
      x.hidden !== y.hidden
    )
      return false;
  }
  return true;
}
