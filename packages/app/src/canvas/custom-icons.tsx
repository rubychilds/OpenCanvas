import type { SVGProps } from "react";

/**
 * Inline SVG icons the chrome needs in an *outlined* rendering, where the
 * global IconContext weight="fill" on Phosphor would read too heavy.
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
