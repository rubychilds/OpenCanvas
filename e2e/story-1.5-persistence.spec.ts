import { test, expect } from "./fixtures";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { projectFilePath } from "./fixtures";

test.describe("Story 1.5: save and load", () => {
  test("Cmd+S writes .opencanvas.json at the project root", async ({ freshApp: page }) => {
    await page.evaluate(() => {
      const api = (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown } })
        .__opencanvas;
      api.addHtml(`<div class="p-4" data-marker="save-test">hello</div>`);
    });

    await page.keyboard.press("Meta+s");
    await expect(page.locator(".oc-topbar__save")).toHaveText("Saved", { timeout: 5_000 });

    expect(existsSync(projectFilePath())).toBe(true);
    const contents = await readFile(projectFilePath(), "utf8");
    const data = JSON.parse(contents);
    expect(data).toHaveProperty("pages");
    expect(JSON.stringify(data)).toContain("save-test");
  });

  test("reloading the page restores components from .opencanvas.json", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() => {
      const api = (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown } })
        .__opencanvas;
      api.addHtml(`<div class="p-4" data-marker="reload-test">restore me</div>`);
    });

    await page.keyboard.press("Meta+s");
    await expect(page.locator(".oc-topbar__save")).toHaveText("Saved", { timeout: 5_000 });

    await page.reload();
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 20_000 },
    );

    const html = await page.evaluate(() =>
      (window as unknown as { __opencanvas: { getHtml: () => string } }).__opencanvas.getHtml(),
    );
    expect(html).toContain('data-marker="reload-test"');
  });

  test("an unsaved canvas GET returns exists=false", async ({ freshApp: page }) => {
    const response = await page.request.get("/__opencanvas/project");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toEqual({ exists: false });
  });
});
