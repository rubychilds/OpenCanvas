import { test, expect } from "./fixtures";

test.describe("Story 1.6: flex controls", () => {
  test("setting display:flex makes the element a flex container in the iframe", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() => {
      const api = (window as unknown as {
        __opencanvas: {
          editor: unknown;
          addHtml: (h: string) => unknown;
        };
      }).__opencanvas;
      const added = api.addHtml(
        `<div data-testid="oc-container"><span>a</span><span>b</span></div>`,
      ) as Array<{ addStyle: (s: Record<string, string>) => void }>;
      const container = Array.isArray(added) ? added[0] : (added as unknown as {
        addStyle: (s: Record<string, string>) => void;
      });
      container.addStyle({
        display: "flex",
        "flex-direction": "row",
        "justify-content": "center",
        gap: "8px",
      });
      const ed = api.editor as { select: (c: unknown) => void };
      ed.select(container);
    });

    const frame = page.frameLocator('iframe[class*="gjs-frame"]');
    const container = frame.locator('[data-testid="oc-container"]');
    await expect(container).toBeVisible();

    const styles = await container.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        display: s.display,
        flexDirection: s.flexDirection,
        justifyContent: s.justifyContent,
        gap: s.gap,
      };
    });

    expect(styles.display).toBe("flex");
    expect(styles.flexDirection).toBe("row");
    expect(styles.justifyContent).toBe("center");
    expect(styles.gap).toBe("8px");
  });

  test("Layout sector exposes flex-related properties in the style panel UI", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() => {
      const api = (window as unknown as {
        __opencanvas: {
          editor: unknown;
          addHtml: (h: string) => unknown;
        };
      }).__opencanvas;
      const added = api.addHtml(`<div>layout target</div>`) as Array<{
        addStyle: (s: Record<string, string>) => void;
      }>;
      const component = Array.isArray(added) ? added[0] : (added as unknown as {
        addStyle: (s: Record<string, string>) => void;
      });
      component.addStyle({ display: "flex" });
      const ed = api.editor as { select: (c: unknown) => void };
      ed.select(component);
    });

    // Style panel is visible by default (Styles tab is the default)
    const rightPanel = page.locator("#oc-right");
    await expect(rightPanel).toBeVisible();

    // GrapesJS renders sector/property labels as text inside the style manager.
    // We assert via the configured sector names rather than GrapesJS's internal
    // class names (which vary across versions).
    const text = (await rightPanel.innerText()).toLowerCase();
    expect(text).toContain("layout");
  });
});
