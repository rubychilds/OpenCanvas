import type { SVGProps } from "react";

/**
 * Inline SVG icons the chrome needs that lucide doesn't ship a direct
 * analog for — custom stroke primitives (StrokeSolid / Dashed / Dotted /
 * Double), a Penpot-flavoured plus glyph, and a search outline.
 *
 * Sized by the caller via `size-*` Tailwind utilities on the svg element —
 * we render at 100% of the parent box and inherit `currentColor`.
 */

/**
 * Outlined "+" matching Penpot's `add.svg` (two perpendicular strokes, round
 * caps, 16×16 viewBox). Used in sidebar / panel title-bar ghost buttons.
 */
export function PlusOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 3.333v9.334M3.333 8h9.334" />
    </svg>
  );
}

/**
 * Outlined magnifier matching Penpot's `search.svg` shape. Retained alongside
 * PlusOutline so the sidebar title-bar affordances share a common stroke
 * treatment.
 */
export function SearchOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.4 10.4 3 3" />
    </svg>
  );
}

/**
 * Stroke-style glyphs rendered as inline SVG — one per CSS border-style value.
 * Used inside ToggleGroupItems in StrokeSection to give a visual preview of
 * the line style rather than a textual dropdown option.
 */

function StrokeLineBase({
  dash,
  linecap = "butt",
  doubleLine,
  ...props
}: SVGProps<SVGSVGElement> & {
  dash?: string;
  linecap?: "butt" | "round" | "square";
  doubleLine?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 16 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap={linecap}
      aria-hidden="true"
      {...props}
    >
      {doubleLine ? (
        <>
          <line x1="1" y1="2.5" x2="15" y2="2.5" />
          <line x1="1" y1="5.5" x2="15" y2="5.5" />
        </>
      ) : (
        <line x1="1" y1="4" x2="15" y2="4" strokeDasharray={dash} />
      )}
    </svg>
  );
}

export function StrokeSolid(props: SVGProps<SVGSVGElement>) {
  return <StrokeLineBase {...props} />;
}
export function StrokeDashed(props: SVGProps<SVGSVGElement>) {
  return <StrokeLineBase dash="3 2" {...props} />;
}
export function StrokeDotted(props: SVGProps<SVGSVGElement>) {
  return <StrokeLineBase dash="0 2.5" linecap="round" {...props} />;
}
export function StrokeDouble(props: SVGProps<SVGSVGElement>) {
  return <StrokeLineBase doubleLine {...props} />;
}
