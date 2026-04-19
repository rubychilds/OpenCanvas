import * as React from "react";
import type { Component } from "grapesjs";
import { Eye, EyeClosed, Minus, PlusOutline } from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";
import { ColorField } from "./controls/ColorField.js";
import { formatColor, parseColor, splitTopLevel } from "./controls/color-utils.js";

/**
 * Effects — per user direction, one section holds both the shadow stack
 * (`box-shadow`) and the blur filters (`filter: blur()` + `backdrop-filter:
 * blur()`). When no effect is applied the body is empty; the + in the header
 * adds a new shadow (the most common case). Blur rows appear below the
 * shadow list once the section is expanded or blur values are set.
 */
export function EffectsSection({ component }: { component: Component }) {
  const filter = readStyle(component, "filter");
  const backdropFilter = readStyle(component, "backdrop-filter");
  const boxShadow = readStyle(component, "box-shadow");

  const parsedShadows = React.useMemo(() => parseStack(boxShadow), [boxShadow]);
  const [localShadows, setLocalShadows] = React.useState<ShadowEntry[]>(() => parsedShadows ?? []);
  const lastComponentRef = React.useRef<Component | null>(component);

  React.useEffect(() => {
    if (lastComponentRef.current !== component) {
      lastComponentRef.current = component;
      setLocalShadows(parsedShadows ?? []);
      return;
    }
    if (parsedShadows === null) return;
    const compiled = compileStack(localShadows);
    if (compiled !== (boxShadow || "")) {
      const matches = shadowStacksEqual(parsedShadows, localShadows);
      if (!matches) setLocalShadows(parsedShadows);
    }
  }, [parsedShadows, boxShadow, component, localShadows]);

  const commitShadows = (next: ShadowEntry[]) => {
    setLocalShadows(next);
    const compiled = compileStack(next);
    if (compiled) writeStyle(component, "box-shadow", compiled);
    else clearStyle(component, "box-shadow");
  };

  const addShadow = () => commitShadows([newShadow(), ...localShadows]);

  const blur = parseFilterFunction(filter, "blur");
  const backdropBlur = parseFilterFunction(backdropFilter, "blur");
  const hasBlur = blur > 0 || backdropBlur > 0 || !!filter || !!backdropFilter;

  // Expanded when anything's present: shadows in the stack OR any blur set.
  // A user click on the + adds a shadow, which naturally expands; if the user
  // wants blur without a shadow, they edit the blur rows that appear when
  // either blur has been set (via Raw CSS or prior sessions).
  const expanded = localShadows.length > 0 || hasBlur;

  const writeBlur = (n: number) => {
    const next = replaceFilterFunction(filter, "blur", n, "px");
    if (!next) clearStyle(component, "filter");
    else writeStyle(component, "filter", next);
  };
  const writeBackdropBlur = (n: number) => {
    const next = replaceFilterFunction(backdropFilter, "blur", n, "px");
    if (!next) clearStyle(component, "backdrop-filter");
    else writeStyle(component, "backdrop-filter", next);
  };

  const action = (
    <button
      type="button"
      onClick={addShadow}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded-sm transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-background",
      )}
      aria-label="Add shadow"
      data-testid="oc-ins-effects-toggle"
    >
      <PlusOutline className="size-3.5" />
    </button>
  );

  if (!expanded) {
    return <InspectorSection title="Effects" action={action}>{null}</InspectorSection>;
  }

  return (
    <InspectorSection title="Effects" action={action}>
      {localShadows.map((entry, i) => (
        <ShadowRow
          key={entry.id}
          entry={entry}
          onChange={(next) => {
            const copy = localShadows.slice();
            copy[i] = next;
            commitShadows(copy);
          }}
          onRemove={() => {
            const copy = localShadows.slice();
            copy.splice(i, 1);
            commitShadows(copy);
          }}
          testIdBase={`oc-ins-shadow-row-${i}`}
        />
      ))}
      {/* Blur rows always render once the section is expanded — that's the
          only way a user can reach them from scratch (there's no separate
          trigger). Expansion is driven by any effect being present OR the
          `+` action adding a first shadow, so pressing `+` on a blank
          selection reveals shadow + blur rows together. */}
      <FieldGroup label="Blur">
        <NumberInput
          value={blur}
          onChange={writeBlur}
          unit="px"
          label="B"
          min={0}
          step={1}
          data-testid="oc-ins-blur"
        />
      </FieldGroup>
      <FieldGroup label="Bg blur">
        <NumberInput
          value={backdropBlur}
          onChange={writeBackdropBlur}
          unit="px"
          label="B"
          min={0}
          step={1}
          data-testid="oc-ins-backdrop-blur"
        />
      </FieldGroup>
    </InspectorSection>
  );
}

/* ───────────────────── Shadow stack helpers ─────────────────────── */

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

function tokenizeShadow(
  input: string,
): { inset: boolean; lengths: number[]; color: string } | null {
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
      {/* Top row: X / Y / B / S inputs + eye + minus. The row extends 20px
          past the section content's right edge (the section-reserved action
          column) via `-mr-5` so the minus button's x-position aligns with
          the section-header + button above it. */}
      <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_auto_auto] items-center gap-1 -mr-5">
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
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded-sm shrink-0",
            "text-muted-foreground hover:text-foreground hover:bg-background",
            entry.hidden && "text-foreground",
          )}
          onClick={() => onChange({ ...entry, hidden: !entry.hidden })}
          aria-label={entry.hidden ? "Show shadow" : "Hide shadow"}
          data-testid={`${testIdBase}-visibility`}
        >
          {entry.hidden ? <EyeClosed className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded-sm shrink-0",
            "text-muted-foreground hover:text-foreground hover:bg-background",
          )}
          onClick={onRemove}
          aria-label="Remove shadow"
          data-testid={`${testIdBase}-remove`}
        >
          <Minus className="size-3.5" />
        </button>
      </div>
      {/* Bottom row: swatch + inset checkbox. */}
      <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}

/* ───────────────────── Blur helpers ─────────────────────── */

function parseFilterFunction(filter: string, fn: string): number {
  if (!filter) return 0;
  const re = new RegExp(`${fn}\\(([\\d.]+)(?:px|rem|em)?\\)`, "i");
  const match = re.exec(filter);
  return match ? parseFloat(match[1]!) : 0;
}

function replaceFilterFunction(
  existing: string,
  fn: string,
  value: number,
  unit: string,
): string {
  const stripRe = new RegExp(`${fn}\\([^)]+\\)`, "gi");
  const base = (existing || "").replace(stripRe, "").replace(/\s+/g, " ").trim();
  if (value === 0) return base;
  return base ? `${base} ${fn}(${value}${unit})` : `${fn}(${value}${unit})`;
}
