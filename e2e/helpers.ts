import { expect, type Page } from "@playwright/test";
import type { McpTestClient } from "./mcp-client";

interface TreeNode {
  children: TreeNode[];
}

/**
 * The mcp test client can connect to the bridge while a stale canvas peer
 * from a prior browser context is still in the bridge's peer map, so an early
 * tool call may route to that stale peer. Wait both for the new canvas's
 * topbar bridge dot to flip green AND for a round-trip get_tree to return
 * an empty wrapper, which confirms the bridge is now talking to *our* fresh
 * canvas peer.
 *
 * Use after `freshApp` setup, before any other mcp.call.
 */
export async function waitForBridge(page: Page, mcp: McpTestClient): Promise<void> {
  await page
    .locator('[data-testid="oc-bridge-dot"][data-connected="true"]')
    .waitFor({ timeout: 10_000 });
  await expect
    .poll(
      async () => {
        try {
          const t = await mcp.call<{ root: TreeNode | null }>("get_tree", {}, 2_000);
          return t.root?.children.length ?? -1;
        } catch {
          return -1;
        }
      },
      { timeout: 10_000, intervals: [100, 250, 500] },
    )
    .toBe(0);
}
