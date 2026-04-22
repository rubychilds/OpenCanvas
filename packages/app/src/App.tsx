import { useCallback, useEffect, useRef, useState } from "react";
import GjsEditor from "@grapesjs/react";
import grapesjs from "grapesjs";
import type { Component, Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";

import { editorOptions, PRIMITIVE_BASE_CSS } from "./canvas/editor-options.js";
import { ensureDefaultArtboard } from "./canvas/artboards.js";
import { attachPasteImport, importPastedHtml } from "./canvas/paste-import.js";
import { attachPersistence, loadProject, saveProject } from "./canvas/persistence.js";
import {
  getVariables,
  loadVariables,
  resetVariablesStore,
  setVariables,
} from "./canvas/variables.js";
import { BridgeClient } from "./bridge/client.js";
import { buildHandlers } from "./bridge/handlers.js";
import { Topbar, type SaveStatus } from "./components/Topbar.js";
import { Shell } from "./components/Shell.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { TooltipProvider } from "./components/ui/tooltip.js";

export function App() {
  const [connected, setConnected] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const disposersRef = useRef<Array<() => void>>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    return () => {
      disposersRef.current.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
      disposersRef.current = [];
    };
  }, []);

  const handleReady = useCallback(async (editor: Editor) => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    editorRef.current = editor;
    setEditor(editor);

    // Register the iframe-CSS injection listener FIRST — before loadProject
    // or ensureDefaultArtboard. Those can synchronously create frames whose
    // `canvas:frame:load` event might fire before any later-registered
    // listener attaches, causing the injection to miss that frame (no white
    // body background → frame paints transparent → canvas void shows through).
    // Must run before ensureDefaultArtboard's delete→recreate cycle.
    const injectPrimitiveCssIntoDoc = (doc: Document | null | undefined): void => {
      if (!doc || !doc.head) return;
      if (doc.getElementById("oc-primitive-base")) return;
      const style = doc.createElement("style");
      style.id = "oc-primitive-base";
      style.textContent = PRIMITIVE_BASE_CSS;
      doc.head.appendChild(style);
    };
    editor.on("canvas:frame:load", ({ window: frameWindow, el }) => {
      injectPrimitiveCssIntoDoc(frameWindow?.document ?? el?.contentDocument);
    });
    // Cover frames that had already loaded by the time we registered the
    // listener (the auto-frame races us on initial app boot).
    editor.Canvas.getFrames().forEach((frame) => {
      const view = (frame as unknown as {
        view?: { getWindow?: () => Window | undefined };
      }).view;
      const win = view?.getWindow?.();
      injectPrimitiveCssIntoDoc(win?.document);
    });

    // Reset the module-scoped variables store so a Vite HMR reload doesn't
    // carry stale entries forward into the rehydration step below.
    resetVariablesStore();

    try {
      const saved = await loadProject();
      if (saved) {
        const { cssVariables, ...projectData } = saved as {
          cssVariables?: Record<string, string>;
          [k: string]: unknown;
        };
        editor.loadProjectData(projectData);
        if (cssVariables) loadVariables(editor, cssVariables);
      }
    } catch (err) {
      console.warn("[designjs] load failed:", err);
    }

    // GrapesJS's `infiniteCanvas: true` auto-frame boots with degenerate
    // geometry (0×0 / unpositioned), which renders as nothing on the canvas
    // and makes ⌘0 fit no-op. `ensureDefaultArtboard` normalizes the
    // unopinionated auto-frame to a neutral 1280×800 "Frame 1" so a fresh
    // boot shows *something*. Idempotent — no-op when the first frame is
    // already named (saved-project restore path).
    ensureDefaultArtboard(editor);

    // Fit the viewport to all frames after boot so the default 1280×800
    // frame (or whatever the saved project has) is visible from the first
    // paint. The 300ms delay lets the infiniteCanvas plugin register
    // `core:canvas-fit` (not available synchronously at handleReady) and
    // lets the replacement frame's iframe mount so `.gjs-frames` reports
    // a real bounding box. try/catch swallows the case where the command
    // still isn't registered — user can always press ⌘0 manually.
    window.setTimeout(() => {
      try {
        editor.runCommand("core:canvas-fit");
      } catch {
        /* no-op — command not yet registered */
      }
    }, 300);

    (window as unknown as { __designjs?: unknown }).__designjs = {
      editor,
      addHtml: (html: string) => {
        // Multi-frame: editor.addComponents lands the component in a detached
        // tree with no iframe mount. Route into the first frame's wrapper so
        // test/dev helpers that drive addHtml actually produce rendered DOM.
        const firstFrame = editor.Canvas.getFrames()[0];
        const wrapper = (firstFrame as unknown as { get?: (k: string) => unknown })?.get?.(
          "component",
        ) as { append?: (h: string) => unknown } | undefined;
        return wrapper?.append ? wrapper.append(html) : editor.addComponents(html);
      },
      getHtml: () => editor.getHtml(),
      getProjectData: () => editor.getProjectData(),
      save: () =>
        saveProject({
          ...(editor.getProjectData() as Record<string, unknown>),
          cssVariables: getVariables(),
        }),
      load: async () => {
        const data = await loadProject();
        if (data) {
          const { cssVariables, ...projectData } = data as {
            cssVariables?: Record<string, string>;
            [k: string]: unknown;
          };
          editor.loadProjectData(projectData);
          if (cssVariables) loadVariables(editor, cssVariables);
        }
        return data;
      },
      clear: () => editor.Components.clear(),
      paste: (html: string) => importPastedHtml(editor, html),
      getVariables: () => getVariables(),
      setVariables: (vars: Record<string, string>) => setVariables(editor, vars),
    };
    window.dispatchEvent(new CustomEvent("designjs:ready"));

    editor.Keymaps.add("oc:duplicate", "ctrl+d,command+d", () => {
      editor.runCommand("core:copy");
      editor.runCommand("core:paste");
      return undefined;
    });

    // Override the default `core:component-delete` command so that pressing
    // Backspace / Delete while a text component is in RTE (contenteditable)
    // mode doesn't nuke the whole component. The default grapes keymap
    // routes both keys to this command with `preventDefault: true`, which
    // was intercepting character-level deletes and removing the text node
    // wholesale. When RTE is active we no-op and let the native
    // contenteditable handling remove the character instead.
    const editorWithEditing = editor as unknown as {
      getEditing?: () => Component | undefined | null;
    };
    editor.Commands.add("core:component-delete", {
      run(ed) {
        if (editorWithEditing.getEditing?.()) return;
        const sel = ed.getSelected();
        (sel as unknown as { remove?: () => void } | undefined)?.remove?.();
      },
    });

    const disposePersist = attachPersistence(editor, {
      onSaveStart: () => setSaveStatus("saving"),
      onSaved: () => {
        setSaveStatus("saved");
        setSaveError(null);
      },
      onError: (err) => {
        setSaveStatus("error");
        setSaveError(err.message);
      },
      getExtras: () => ({ cssVariables: getVariables() }),
    });

    const handlers = buildHandlers(editor);
    const client = new BridgeClient(handlers, { onStatus: setConnected });
    client.connect();

    const disposePaste = attachPasteImport(editor);

    disposersRef.current.push(disposePersist, () => client.dispose(), disposePaste);

    requestAnimationFrame(() => {
      (editor.Styles as unknown as { __trgCustom?: () => void }).__trgCustom?.();
      (editor.Blocks as unknown as { __trgCustom?: () => void }).__trgCustom?.();
      (editor.Layers as unknown as { __trgCustom?: () => void }).__trgCustom?.();
      (editor.Traits as unknown as { __trgCustom?: () => void }).__trgCustom?.();
    });
  }, []);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    setSaveStatus("saving");
    try {
      await saveProject({
        ...(editor.getProjectData() as Record<string, unknown>),
        cssVariables: getVariables(),
      });
      setSaveStatus("saved");
      setSaveError(null);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <Topbar
          connected={connected}
          saveStatus={saveStatus}
          saveError={saveError}
          onSave={handleSave}
          editor={editor}
        />
        <GjsEditor
          grapesjs={grapesjs}
          options={editorOptions}
          onReady={handleReady}
          className="flex-1 min-h-0 flex"
        >
          <Shell />
          <CommandPalette />
        </GjsEditor>
      </div>
    </TooltipProvider>
  );
}
