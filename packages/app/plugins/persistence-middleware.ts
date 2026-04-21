import type { Plugin } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROUTE = "/__designjs/project";
const FILENAME = ".designjs.json";

/**
 * Dev-only HTTP endpoints for reading/writing `.designjs.json`:
 *   GET  /__designjs/project  → { exists: boolean, project?: <ProjectData> }
 *   POST /__designjs/project  → { ok: true }  (body is raw ProjectData JSON)
 *
 * Writes land in the directory of the nearest pnpm-workspace.yaml / package.json
 * upwards from the Vite root — i.e. the repo root in monorepo dev, or the
 * project root for a scaffolded app.
 */
export function persistenceMiddlewarePlugin(): Plugin {
  return {
    name: "designjs-persistence-middleware",
    apply: "serve",
    configureServer(server) {
      const projectRoot = findProjectRoot(server.config.root);
      const filePath = join(projectRoot, FILENAME);
      server.config.logger.info(`[designjs:persistence] storing at ${filePath}`);

      server.middlewares.use(ROUTE, async (req, res) => {
        try {
          if (req.method === "GET") {
            if (!existsSync(filePath)) {
              return json(res, 200, { exists: false });
            }
            const contents = await readFile(filePath, "utf8");
            return json(res, 200, { exists: true, project: JSON.parse(contents) });
          }

          if (req.method === "POST") {
            const raw = await readBody(req);
            if (raw.length === 0) return json(res, 400, { error: "empty body" });
            const parsed = JSON.parse(raw);
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, JSON.stringify(parsed, null, 2) + "\n", "utf8");
            return json(res, 200, { ok: true });
          }

          res.statusCode = 405;
          res.setHeader("Allow", "GET, POST");
          res.end();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          json(res, 500, { error: msg });
        }
      });
    },
  };
}

function findProjectRoot(viteRoot: string): string {
  let dir = resolve(viteRoot);
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return viteRoot;
    dir = parent;
  }
}

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    req.on("error", rejectPromise);
  });
}

function json(res: import("http").ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
