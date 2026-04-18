export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface TopbarProps {
  connected: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  onSave: () => void;
}

function saveLabel(status: SaveStatus, err: string | null): string {
  if (err) return `Save error: ${err}`;
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved";
  return "Idle";
}

export function Topbar({ connected, saveStatus, saveError, onSave }: TopbarProps) {
  return (
    <div className="oc-topbar">
      <span className="oc-topbar__title">OpenCanvas</span>
      <span className="oc-topbar__version">v0.1-dev</span>
      <button type="button" className="oc-topbar__btn" onClick={onSave} title="Save (⌘S)">
        Save
      </button>
      <span className="oc-topbar__save" data-status={saveStatus} data-error={saveError ? "true" : "false"}>
        {saveLabel(saveStatus, saveError)}
      </span>
      <div className="oc-topbar__status">
        <span className={`oc-topbar__dot${connected ? " oc-topbar__dot--connected" : ""}`} />
        <span>{connected ? "Bridge connected" : "Bridge disconnected"}</span>
      </div>
    </div>
  );
}
