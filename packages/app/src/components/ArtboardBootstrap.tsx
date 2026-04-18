import { useEffect } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import { ensureDefaultArtboard } from "../canvas/artboards.js";

/**
 * Seeds a default Desktop artboard on a fresh canvas. Renders null and only
 * listens to the editor's `load` event — if a project restores frames from
 * disk the helper no-ops, so this is safe to always mount.
 */
export function ArtboardBootstrap() {
  const editor = useEditorMaybe();

  useEffect(() => {
    if (!editor) return;
    const seed = () => ensureDefaultArtboard(editor);
    // `load` fires after GrapesJS finishes initializing (post loadProjectData).
    // If frames already exist (project restored), ensureDefault short-circuits.
    (editor as unknown as { once: (e: string, fn: () => void) => void }).once("load", seed);
    if (editor.Canvas.getFrames().length > 0) seed();
    return () => {
      (editor as unknown as { off: (e: string, fn: () => void) => void }).off("load", seed);
    };
  }, [editor]);

  return null;
}
