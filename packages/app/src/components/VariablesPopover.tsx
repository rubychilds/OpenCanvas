import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import type { Editor } from "grapesjs";
import { Tags as TagIcon, Trash2 as TrashIcon } from "../canvas/chrome-icons.js";
import { deleteVariable, getVariables, setVariables } from "../canvas/variables.js";
import { Button } from "./ui/button.js";
import { cn } from "../lib/utils.js";

export interface VariablesPopoverProps {
  /** The GrapesJS editor instance, or null before onReady has fired. */
  editor: Editor | null;
}

/**
 * Variables (design tokens) UI — the visual half of PRD Story 6.2. The MCP
 * `get_variables` / `set_variables` tools and `.designjs.json` persistence
 * sidecar were shipped in commit `0adad7a`; this popover gives humans the same
 * surface the agents have.
 *
 * Shape: Topbar trigger → Radix Popover → scrollable list of current variables
 * + an "add variable" row at the bottom. Keys are normalised to start with
 * `--`; values are plain CSS strings (any colour / length / expression the
 * iframe :root can handle).
 */
export function VariablesPopover({ editor }: VariablesPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const refresh = React.useCallback(() => setTick((n) => n + 1), []);

  const vars = React.useMemo<Array<[string, string]>>(() => {
    if (!editor) return [];
    return Object.entries(getVariables()).sort(([a], [b]) => a.localeCompare(b));
    // tick is a dependency so we re-read after mutations; editor needed so we
    // don't return stale entries from HMR-surviving module-scoped state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, tick]);

  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");

  const addVariable = () => {
    if (!editor) return;
    const key = normaliseKey(newKey);
    if (!key || !newValue.trim()) return;
    setVariables(editor, { [key]: newValue.trim() });
    setNewKey("");
    setNewValue("");
    refresh();
  };

  const updateValue = (key: string, next: string) => {
    if (!editor) return;
    setVariables(editor, { [key]: next });
    refresh();
  };

  const removeVariable = (key: string) => {
    if (!editor) return;
    deleteVariable(editor, key);
    refresh();
  };

  // Refresh count badge whenever the popover opens so it reflects any changes
  // made via MCP tools while closed.
  React.useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const count = vars.length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="oc-variables-trigger"
          className="gap-1.5"
        >
          <TagIcon />
          <span>Variables</span>
          {count > 0 ? (
            <span
              className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-surface-sunken text-[10px] tabular-nums"
              data-testid="oc-variables-count"
            >
              {count}
            </span>
          ) : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-80 rounded-md border border-border bg-popover text-popover-foreground",
            "p-2 shadow-md",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          )}
          data-testid="oc-variables-popover"
        >
          <header className="flex items-center justify-between px-1 pb-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Design tokens
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {count} {count === 1 ? "variable" : "variables"}
            </span>
          </header>

          <div
            className="max-h-64 overflow-y-auto flex flex-col gap-1"
            data-testid="oc-variables-list"
          >
            {vars.length === 0 ? (
              <p className="px-2 py-4 text-[11px] text-muted-foreground">
                No design tokens defined. Add one below to inject a CSS custom
                property into the canvas iframe&nbsp;<code>:root</code>.
              </p>
            ) : (
              vars.map(([key, value]) => (
                <VariableRow
                  key={key}
                  varKey={key}
                  value={value}
                  onChange={(v) => updateValue(key, v)}
                  onDelete={() => removeVariable(key)}
                />
              ))
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="--token-name"
                className={cn(
                  "flex-1 min-w-0 h-7 px-2 rounded-md border border-border bg-background",
                  "text-xs focus:border-oc-accent focus:outline-none",
                )}
                data-testid="oc-variables-new-key"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addVariable();
                }}
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="value"
                className={cn(
                  "flex-1 min-w-0 h-7 px-2 rounded-md border border-border bg-background",
                  "text-xs focus:border-oc-accent focus:outline-none",
                )}
                data-testid="oc-variables-new-value"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addVariable();
                }}
              />
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={addVariable}
              disabled={!normaliseKey(newKey) || !newValue.trim()}
              data-testid="oc-variables-add"
            >
              Add variable
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface VariableRowProps {
  varKey: string;
  value: string;
  onChange: (value: string) => void;
  onDelete: () => void;
}

function VariableRow({ varKey, value, onChange, onDelete }: VariableRowProps) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onChange(trimmed);
    else setDraft(value);
  };

  return (
    <div
      className="flex items-center gap-1 px-1 py-0.5 rounded-sm hover:bg-surface-sunken"
      data-testid="oc-variables-row"
      data-var-key={varKey}
    >
      <span
        className="font-mono text-[11px] text-muted-foreground truncate flex-1 min-w-0"
        title={varKey}
      >
        {varKey}
      </span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setDraft(value);
        }}
        className={cn(
          "w-28 min-w-0 h-6 px-1.5 rounded-sm border border-border bg-background",
          "text-[11px] font-mono tabular-nums focus:border-oc-accent focus:outline-none",
        )}
        data-testid="oc-variables-value"
      />
      <button
        type="button"
        onClick={onDelete}
        className={cn(
          "flex items-center justify-center h-5 w-5 rounded-sm text-muted-foreground",
          "hover:text-oc-danger hover:bg-surface-sunken",
        )}
        aria-label={`Delete ${varKey}`}
        data-testid="oc-variables-delete"
      >
        <TrashIcon className="size-3" />
      </button>
    </div>
  );
}

function normaliseKey(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withPrefix = trimmed.startsWith("--") ? trimmed : `--${trimmed}`;
  // CSS custom-property identifier: letters, digits, dash, underscore.
  if (!/^--[A-Za-z_][\w-]*$/.test(withPrefix)) return null;
  return withPrefix;
}
