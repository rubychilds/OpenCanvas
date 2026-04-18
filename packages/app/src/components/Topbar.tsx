import { Moon, Save as SaveIcon, Sun } from "lucide-react";
import { Button } from "./ui/button.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.js";
import { cn } from "../lib/utils.js";
import { useTheme } from "../hooks/useTheme.js";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface TopbarProps {
  connected: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  onSave: () => void;
}

function saveLabel(status: SaveStatus, err: string | null): string {
  if (err) return `Save error`;
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved";
  return "Idle";
}

export function Topbar({ connected, saveStatus, saveError, onSave }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const saveClass = {
    idle: "text-muted-foreground",
    saving: "text-oc-warning",
    saved: "text-oc-success",
    error: "text-oc-danger",
  }[saveError ? "error" : saveStatus];

  return (
    <div
      className="flex items-center gap-3 h-[var(--topbar-height)] px-4 border-b border-border bg-surface"
      data-testid="oc-topbar"
    >
      <span className="text-sm font-semibold tracking-tight" data-testid="oc-topbar-title">
        OpenCanvas
      </span>
      <span className="text-xs text-muted-foreground">v0.1-dev</span>

      <div className="mx-2 h-4 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            data-testid="oc-save-button"
          >
            <SaveIcon />
            Save
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save (⌘S)</TooltipContent>
      </Tooltip>

      <span
        className={cn("text-xs tabular-nums", saveClass)}
        data-testid="oc-save-status"
        data-status={saveStatus}
        title={saveError ?? undefined}
      >
        {saveLabel(saveStatus, saveError)}
      </span>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="oc-bridge-status">
          <span
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              connected ? "bg-oc-success" : "bg-muted-foreground/40",
            )}
            data-testid="oc-bridge-dot"
            data-connected={connected ? "true" : "false"}
          />
          <span>{connected ? "Bridge connected" : "Bridge disconnected"}</span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              data-testid="oc-theme-toggle"
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Theme</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
