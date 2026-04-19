import * as React from "react";
import { cn } from "../../lib/utils.js";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | string;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Text rendered in the drag scrubber region; defaults to the first letter of `unit`. */
  label?: string;
  "data-testid"?: string;
}

/**
 * Figma/Pencil-style numeric input:
 *   - Type a value, press Enter or blur to commit.
 *   - Arrow Up/Down steps the value (Shift ×10, Alt ÷10).
 *   - Drag horizontally on the scrubber region to scrub (Shift ×10, Alt ÷10).
 *
 * Works with plain numbers or simple unit strings like "12px" / "1rem". The
 * numeric portion is parsed; the unit is preserved and re-appended on emit.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min = -Infinity,
      max = Infinity,
      step = 1,
      unit,
      label,
      className,
      "data-testid": testId,
      ...rest
    },
    ref,
  ) => {
    const parsed = parseValue(value, unit);
    const [draft, setDraft] = React.useState<string>(parsed.text);

    React.useEffect(() => {
      setDraft(parseValue(value, unit).text);
    }, [value, unit]);

    const clamp = (n: number) => Math.min(max, Math.max(min, n));

    const commitFromText = React.useCallback(
      (text: string) => {
        const n = parseFloat(text);
        if (!Number.isFinite(n)) {
          setDraft(parseValue(value, unit).text);
          return;
        }
        const next = clamp(n);
        onChange(next);
        setDraft(String(next));
      },
      [value, unit, min, max, onChange],
    );

    const applyDelta = React.useCallback(
      (delta: number) => {
        const n = parseFloat(draft);
        const base = Number.isFinite(n) ? n : parsed.num ?? 0;
        const next = clamp(roundToStep(base + delta, step));
        onChange(next);
        setDraft(String(next));
      },
      [draft, parsed.num, step, min, max, onChange],
    );

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitFromText(draft);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDraft(parseValue(value, unit).text);
        (e.target as HTMLInputElement).blur();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const direction = e.key === "ArrowUp" ? 1 : -1;
        const multiplier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
        applyDelta(direction * step * multiplier);
      }
    };

    const onScrubberPointerDown: React.PointerEventHandler<HTMLSpanElement> = (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startValue = parseFloat(draft);
      const base = Number.isFinite(startValue) ? startValue : parsed.num ?? 0;
      const scrubber = e.currentTarget;
      scrubber.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const multiplier = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
        const next = clamp(roundToStep(base + dx * step * multiplier, step));
        onChange(next);
        setDraft(String(next));
      };
      const up = () => {
        scrubber.removeEventListener("pointermove", move);
        scrubber.removeEventListener("pointerup", up);
      };
      scrubber.addEventListener("pointermove", move);
      scrubber.addEventListener("pointerup", up);
    };

    const scrubberLabel = label ?? (unit ? unit[0]?.toUpperCase() : "·");

    return (
      <div
        className={cn(
          // Penpot-shape chip: grey fill, no border, ring-on-focus.
          // `min-w-0` lets the chip shrink inside grid/flex cells whose
          // track is `1fr`; otherwise the native <input> intrinsic width
          // pushes the row past the panel edge when the value is long
          // (e.g. width="1440").
          "flex items-center h-7 min-w-0 rounded-md bg-chip",
          "focus-within:ring-1 focus-within:ring-oc-accent",
          className,
        )}
      >
        <span
          role="button"
          tabIndex={-1}
          aria-label="Drag to scrub value"
          onPointerDown={onScrubberPointerDown}
          className={cn(
            "flex items-center justify-center min-w-5 h-full px-1.5",
            "text-[11px] text-muted-foreground select-none cursor-ew-resize",
            "hover:text-foreground rounded-l-md",
          )}
          data-testid={testId ? `${testId}-scrub` : undefined}
        >
          {scrubberLabel}
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          size={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitFromText(draft)}
          onKeyDown={onKeyDown}
          className={cn(
            "flex-1 min-w-0 bg-transparent px-0.5 h-full text-sm tabular-nums text-foreground",
            "focus:outline-none",
          )}
          data-testid={testId}
          {...rest}
        />
        {unit ? (
          <span className="pr-2 text-[11px] text-muted-foreground select-none">{unit}</span>
        ) : null}
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";

function parseValue(value: number | string, fallbackUnit?: string): { num: number | null; text: string; unit: string } {
  if (typeof value === "number") {
    return { num: value, text: String(value), unit: fallbackUnit ?? "" };
  }
  const match = /^(-?\d*\.?\d+)\s*([a-z%]*)$/i.exec(value.trim());
  if (!match) return { num: null, text: value, unit: fallbackUnit ?? "" };
  const numText = match[1]!;
  return { num: parseFloat(numText), text: numText, unit: match[2] || fallbackUnit || "" };
}

function roundToStep(n: number, step: number): number {
  if (step <= 0) return n;
  // Preserve one decimal for sub-unit steps; snap to integer otherwise.
  const precision = step < 1 ? 2 : 0;
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
}
