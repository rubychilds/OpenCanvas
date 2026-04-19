import type { Component } from "grapesjs";

/**
 * Applicability predicates used by the inspector to decide whether a given
 * style control should render as enabled or greyed-out-disabled. The rule
 * of thumb: hide a section entirely only when it carries nothing meaningful
 * for the selection (e.g. Typography on a <div>); grey out an individual
 * control when the surrounding section is still relevant but the specific
 * property produces no visible effect for this kind of element.
 *
 * Keep these predicates pure and tag-based — no DOM/style reads — so the
 * inspector stays cheap to re-render on every selection change.
 */

/**
 * Inline text tags where the box model collapses onto the glyph run: a
 * `border-radius` on an <em> without a background or border produces no
 * visible change, so the control would mislead. We treat these as "text
 * objects" in the Figma/Penpot sense.
 *
 * Block-level text containers (<h1>–<h6>, <p>, <blockquote>, <button>, <li>)
 * stay eligible because pill-shaped buttons and rounded callouts are a
 * routine pattern.
 */
const INLINE_TEXT_TAGS = new Set([
  "span",
  "a",
  "strong",
  "em",
  "small",
  "code",
  "label",
]);

function tagOf(component: Component): string {
  return String(component.get?.("tagName") ?? "").toLowerCase();
}

/** Is this an inline text run where box-model visuals typically do nothing? */
export function isInlineTextObject(component: Component): boolean {
  return INLINE_TEXT_TAGS.has(tagOf(component));
}

/**
 * Border radius is N/A on bare inline text — no background or border for
 * the radius to round. Consumers should grey out the radius control in
 * this case rather than hide it, so the row stays visible and the user
 * understands why it's unresponsive.
 */
export function isRadiusApplicable(component: Component): boolean {
  return !isInlineTextObject(component);
}
