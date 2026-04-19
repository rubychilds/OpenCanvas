import { useCallback, useEffect, useRef, useState } from "react";
import GjsEditor from "@grapesjs/react";
import grapesjs from "grapesjs";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";

import { editorOptions } from "./canvas/editor-options.js";
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
      // No saved project: GrapesJS auto-creates a single blank frame during
      // init. We no longer opinionate it ("Desktop" rename + 1440×900 preset
      // is gone) — it shows as an untitled placeholder in the Layers panel
      // and the user can delete it. Removing it outright isn't safe:
      // `editor.getWrapper()` calls (made by `get_tree` and other bridge
      // tools) trigger GrapesJS to re-create a frame, so zero-frame state
      // isn't stable. The best we can do is leave the blank auto-frame.
    } catch (err) {
      console.warn("[opencanvas] load failed:", err);
    }

    (window as unknown as { __opencanvas?: unknown }).__opencanvas = {
      editor,
      addHtml: (html: string) => editor.addComponents(html),
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
    window.dispatchEvent(new CustomEvent("opencanvas:ready"));

    editor.Keymaps.add("oc:duplicate", "ctrl+d,command+d", () => {
      editor.runCommand("core:copy");
      editor.runCommand("core:paste");
      return undefined;
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
        </GjsEditor>
      </div>
    </TooltipProvider>
  );
}
