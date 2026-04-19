import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { HexColorPicker } from "react-colorful";
import { cn } from "../../../lib/utils.js";
import { hexToRgb, rgbToHex } from "./color-utils.js";

export interface ColorFieldProps {
  /** Normalised `#rrggbb`. Alpha is handled by the caller. */
  value: string;
  onChange: (hex: string) => void;
  /** Show the inline hex text input next to the swatch. Defaults to true. */
  showHex?: boolean;
  "data-testid"?: string;
  className?: string;
}

const CHECKERBOARD =
  "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px";

function normalizeHex(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const with_hash = s.startsWith("#") ? s : `#${s}`;
  const rgb = hexToRgb(with_hash);
  if (!rgb) return null;
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

/**
 * Swatch-triggered colour picker. The swatch opens a Radix Popover containing
 * a `react-colorful` `HexColorPicker` + hex input. When `showHex` is true
 * (default) an inline hex text input also renders next to the swatch for
 * keyboard-first editing.
 *
 * Kept free of opacity/eye concerns — those live on the row that hosts the
 * field so Fill / Stroke / Shadow can compose them differently.
 */
export function ColorField({
  value,
  onChange,
  showHex = true,
  "data-testid": testId,
  className,
}: ColorFieldProps) {
  const hex = value || "#000000";
  const [draft, setDraft] = React.useState(hex.replace(/^#/, ""));

  React.useEffect(() => {
    setDraft(hex.replace(/^#/, ""));
  }, [hex]);

  const commitDraft = () => {
    const next = normalizeHex(draft);
    if (next) onChange(next);
    else setDraft(hex.replace(/^#/, ""));
  };

  // Penpot-shape chip: swatch + hex sit in a single grey container with no
  // borders. When `showHex` is false (Shadow rows), only the swatch renders.
  return (
    <div
      className={cn(
        showHex
          ? "flex items-center gap-2 min-w-0 h-7 rounded-md bg-chip pl-1 pr-2 focus-within:ring-1 focus-within:ring-oc-accent"
          : "flex items-center min-w-0",
        className,
      )}
    >
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Open colour picker"
            className={cn(
              "h-5 w-5 shrink-0 rounded-sm",
              "focus:outline-none focus:ring-1 focus:ring-oc-accent",
            )}
            style={{ background: `${CHECKERBOARD}` }}
            data-testid={testId ? `${testId}-swatch` : undefined}
          >
            <span
              className="block h-full w-full rounded-[1px]"
              style={{ background: hex }}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="left"
            align="start"
            sideOffset={8}
            className="z-50 rounded-md border border-border bg-surface p-2 shadow-lg"
            data-testid={testId ? `${testId}-popover` : undefined}
          >
            <HexColorPicker color={hex} onChange={onChange} />
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitDraft();
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              className={cn(
                "mt-2 h-7 w-full rounded-md bg-chip px-2",
                "font-mono text-[11px] uppercase text-foreground",
                "focus:outline-none focus:ring-1 focus:ring-oc-accent",
              )}
              aria-label="Hex colour"
              data-testid={testId ? `${testId}-popover-hex` : undefined}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {showHex ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitDraft();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent",
            "font-mono text-[11px] uppercase text-foreground",
            "focus:outline-none",
          )}
          aria-label="Hex colour"
          data-testid={testId ? `${testId}-hex` : undefined}
        />
      ) : null}
    </div>
  );
}
