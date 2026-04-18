import type { Component } from "grapesjs";

/**
 * Read/write helpers that normalize GrapesJS's per-component style access so
 * the semantic-inspector sections can read a CSS property with confidence
 * (GrapesJS's Component.getStyle() returns a lowercase-keyed record but
 * values sometimes come back with trailing whitespace or quoted units).
 */

export function readStyle(component: Component, key: string): string {
  const styles = (component as unknown as { getStyle?: () => Record<string, unknown> }).getStyle?.() ?? {};
  const raw = styles[key];
  if (raw == null) return "";
  return String(raw).trim();
}

export function writeStyle(
  component: Component,
  key: string,
  value: string,
): void {
  const method = (component as unknown as {
    addStyle?: (s: Record<string, string>) => void;
  }).addStyle;
  if (typeof method !== "function") return;
  method.call(component, { [key]: value });
}

/**
 * Remove a property entirely (as opposed to setting it to empty-string, which
 * GrapesJS treats as a valid value for some property types).
 */
export function clearStyle(component: Component, key: string): void {
  const remove = (component as unknown as {
    removeStyle?: (k: string) => void;
  }).removeStyle;
  if (typeof remove === "function") {
    remove.call(component, key);
    return;
  }
  writeStyle(component, key, "");
}

/**
 * Parse a rotation out of a CSS `transform` value like `rotate(45deg)` or a
 * compound `translateX(10px) rotate(45deg)`. Returns 0 when no rotate.
 */
export function rotationFromTransform(transform: string): number {
  if (!transform) return 0;
  const match = /rotate\((-?\d+(?:\.\d+)?)deg\)/.exec(transform);
  if (!match) return 0;
  return parseFloat(match[1]!);
}

export function transformWithRotation(existing: string, degrees: number): string {
  if (!existing || existing === "none") {
    return degrees === 0 ? "" : `rotate(${degrees}deg)`;
  }
  const replaced = existing.replace(/rotate\(-?\d+(?:\.\d+)?deg\)/g, "");
  const next = replaced.replace(/\s+/g, " ").trim();
  if (degrees === 0) return next || "";
  return next ? `${next} rotate(${degrees}deg)` : `rotate(${degrees}deg)`;
}
