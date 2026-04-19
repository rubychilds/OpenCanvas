import * as React from "react";
import { cn } from "../../../lib/utils.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu.js";

export type SizeMode = "fixed" | "hug" | "fill";

export interface SizeFieldProps {
  axis: "W" | "H";
  value: string;
  /** CSS value is a computed numeric px when mode === "fixed"; empty / "auto" / "100%" otherwise. */
  mode: SizeMode;
  onModeChange: (next: SizeMode) => void;
  onFixedChange: (next: number) => void;
  /** Available modes based on context (parent layout). Default: all three. */
  availableModes?: SizeMode[];
  "data-testid"?: string;
  className?: string;
}

const MODE_LABEL: Record<SizeMode, string> = {
  fixed: "Fixed",
  hug: "Hug",
  fill: "Fill",
};

/**
 * Penpot/Figma-style sizing chip: axis label + mode pill (Fixed / Hug / Fill)
 * + numeric input (active only in Fixed) + unit. The mode dropdown is gated
 * on `availableModes`, which is derived from parent context — e.g. Hug only
 * if *this* element is an auto-layout container, Fill only if the *parent*
 * is one. See LayoutSection for the derivation.
 *
 * CSS emission strategy:
 *   - Fixed → write `<axis>: <N>px`
 *   - Hug   → clear `<axis>` (intrinsic content width / `auto`)
 *   - Fill  → write `<axis>: 100%`
 *
 * Further nuance (flex main-axis Fill via `flex: 1 1 auto`) stays on the
 * consuming LayoutItem section — SizeField writes only the `width`/`height`
 * longhand itself.
 */
export function SizeField({
  axis,
  value,
  mode,
  onModeChange,
  onFixedChange,
  availableModes = ["fixed", "hug", "fill"],
  "data-testid": testId,
  className,
}: SizeFieldProps) {
  const numericMatch = /^(-?\d*\.?\d+)/.exec(value.trim());
  const numeric = numericMatch ? parseFloat(numericMatch[1]!) : 0;
  const [draft, setDraft] = React.useState(String(Number.isFinite(numeric) ? numeric : ""));

  React.useEffect(() => {
    setDraft(String(Number.isFinite(numeric) ? numeric : ""));
  }, [numeric]);

  const commitDraft = () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(numeric));
      return;
    }
    onFixedChange(parsed);
  };

  const label =
    mode === "fixed" ? null : mode === "hug" ? "auto" : "fill";

  // Outside auto-layout the only available mode is Fixed — rendering a
  // "Fixed ▾" dropdown that only offers the value it already shows is
  // noise. Collapse to just the axis letter + number when there is
  // nothing to choose between.
  const hasModeChoice = availableModes.length > 1;

  return (
    <div
      className={cn(
        "flex items-center h-7 min-w-0 rounded-md bg-chip",
        "focus-within:ring-1 focus-within:ring-oc-accent",
        className,
      )}
    >
      <span className="flex items-center pl-1.5 pr-0.5 text-[11px] text-muted-foreground select-none">
        {axis}
      </span>
      {hasModeChoice ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center h-5 px-1 rounded-sm",
                "text-[11px] text-muted-foreground hover:text-foreground hover:bg-background",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
              )}
              aria-label={`${axis} mode`}
              data-testid={testId ? `${testId}-mode` : undefined}
            >
              {MODE_LABEL[mode]}
              <span aria-hidden className="ml-0.5 text-[9px]">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className="min-w-28">
            {(["fixed", "hug", "fill"] as const).map((m) => {
              const enabled = availableModes.includes(m);
              return (
                <DropdownMenuItem
                  key={m}
                  disabled={!enabled}
                  onSelect={() => enabled && onModeChange(m)}
                  data-testid={testId ? `${testId}-mode-${m}` : undefined}
                >
                  {MODE_LABEL[m]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {mode === "fixed" ? (
        <>
          <input
            type="text"
            inputMode="decimal"
            size={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            className={cn(
              "flex-1 min-w-0 bg-transparent px-0.5 h-full text-xs tabular-nums text-foreground",
              "focus:outline-none",
            )}
            data-testid={testId}
          />
          <span className="pr-2 text-[11px] text-muted-foreground select-none">px</span>
        </>
      ) : (
        <span
          className="flex-1 min-w-0 px-1 text-[11px] text-muted-foreground select-none"
          data-testid={testId ? `${testId}-placeholder` : undefined}
        >
          {label}
        </span>
      )}
    </div>
  );
}
