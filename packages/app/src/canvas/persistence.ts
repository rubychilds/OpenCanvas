import type { Editor, ProjectData } from "grapesjs";

const ROUTE = "/__opencanvas/project";

export async function loadProject(): Promise<ProjectData | null> {
  const res = await fetch(ROUTE, { method: "GET" });
  if (!res.ok) throw new Error(`load failed: ${res.status}`);
  const data = (await res.json()) as { exists: boolean; project?: ProjectData };
  return data.exists ? (data.project ?? null) : null;
}

export async function saveProject(project: ProjectData): Promise<void> {
  const res = await fetch(ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`save failed: ${res.status} ${body}`);
  }
}

export interface PersistenceHooks {
  onSaveStart?: () => void;
  onSaved?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Installs save-on-Cmd+S plus a 30-second autosave timer on the given editor.
 * Returns a dispose function.
 */
export function attachPersistence(editor: Editor, hooks: PersistenceHooks = {}): () => void {
  let disposed = false;
  let saveInFlight = false;
  let dirty = false;

  const doSave = async () => {
    if (disposed || saveInFlight) return;
    if (!dirty) return;
    saveInFlight = true;
    dirty = false;
    hooks.onSaveStart?.();
    try {
      const data = editor.getProjectData();
      await saveProject(data);
      hooks.onSaved?.();
    } catch (err) {
      dirty = true; // try again next cycle
      hooks.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      saveInFlight = false;
    }
  };

  const onUpdate = () => {
    dirty = true;
  };
  editor.on("update", onUpdate);

  const onKeydown = (ev: KeyboardEvent) => {
    const isSave = (ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "s";
    if (!isSave) return;
    ev.preventDefault();
    dirty = true; // user-intent-forced save
    void doSave();
  };
  window.addEventListener("keydown", onKeydown);
  const iframeEl = editor.Canvas.getFrameEl() as HTMLIFrameElement | null;
  iframeEl?.contentWindow?.addEventListener("keydown", onKeydown);

  const interval = window.setInterval(() => void doSave(), 30_000);

  return () => {
    disposed = true;
    editor.off("update", onUpdate);
    window.removeEventListener("keydown", onKeydown);
    iframeEl?.contentWindow?.removeEventListener("keydown", onKeydown);
    window.clearInterval(interval);
  };
}
