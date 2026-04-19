import * as React from "react";
import { cn } from "../../../lib/utils.js";
import { NumberInput } from "../../ui/number-input.js";

export interface RotationDialProps {
  /** Current rotation in degrees. Stored as a normalised value in (-180, 180]. */
  value: number;
  onChange: (degrees: number) => void;
  /** Diameter of the SVG dial in px. Default 28 to match --row-height. */
  size?: number;
  className?: string;
  "data-testid"?: string;
}

/**
 * Circular rotation control. Pointer-drag on the dial sweeps the angle;
 * Shift snaps to 15° increments. The numeric input alongside the dial is
 * the same value — typing or scrubbing it moves the dial handle.
 *
 * Degrees are normalised to (-180, 180] on commit. The handle's position is
 * computed from the value, so the numeric input is the source of truth and
 * the dial is just a richer alternative input.
 */
export function RotationDial({
  value,
  onChange,
  size = 28,
  className,
  "data-testid": testId,
}: RotationDialProps) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const onPointerDown: React.PointerEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    const svg = e.currentTarget;
    svg.setPointerCapture(e.pointerId);
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const angleAt = (clientX: number, clientY: number, snap: boolean): number => {
      const dx = clientX - cx;
      const dy = clientY - cy;
      // 0° points up, increasing clockwise — match how Penpot / Figma display rotation.
      const radians = Math.atan2(dx, -dy);
      const raw = (radians * 180) / Math.PI;
      const snapped = snap ? Math.round(raw / 15) * 15 : Math.round(raw);
      return normaliseDeg(snapped);
    };

    onChange(angleAt(e.clientX, e.clientY, e.shiftKey));

    const move = (ev: PointerEvent) => onChange(angleAt(ev.clientX, ev.clientY, ev.shiftKey));
    const up = () => {
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
    };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
  };

  // Handle position: 0° → top, increases clockwise. Handle dot sits 2px from
  // the dial edge so it stays visible against the border ring.
  const radius = size / 2 - 2;
  const angleRad = (value * Math.PI) / 180;
  const handleX = size / 2 + radius * Math.sin(angleRad);
  const handleY = size / 2 - radius * Math.cos(angleRad);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="slider"
        aria-label="Rotation"
        aria-valuemin={-180}
        aria-valuemax={180}
        aria-valuenow={Math.round(value)}
        onPointerDown={onPointerDown}
        className={cn(
          "shrink-0 cursor-grab active:cursor-grabbing select-none touch-none",
          "text-muted-foreground hover:text-foreground transition-colors",
        )}
        data-testid={testId ? `${testId}-dial` : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 1}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        {/* Pointer line from centre to current angle */}
        <line
          x1={size / 2}
          y1={size / 2}
          x2={handleX}
          y2={handleY}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Handle dot */}
        <circle cx={handleX} cy={handleY} r="2.5" fill="currentColor" />
      </svg>
      <NumberInput
        value={Math.round(value)}
        onChange={(n) => onChange(normaliseDeg(n))}
        unit="°"
        label="°"
        min={-360}
        max={360}
        step={1}
        data-testid={testId}
        className="flex-1"
      />
    </div>
  );
}

/** Normalise to (-180, 180]. Handles e.g. 200 → -160, -200 → 160. */
function normaliseDeg(deg: number): number {
  let n = ((deg + 180) % 360) - 180;
  if (n <= -180) n += 360;
  return Number.isFinite(n) ? n : 0;
}
