# Releasing OpenCanvas

Maintainer-facing process for cutting a new release. OpenCanvas is a local-first tool, so "release" here means **publishing the npm packages** and **cutting a GitHub release**, not deploying a hosted service.

## What gets published

| Package | npm name | Purpose |
|---------|----------|---------|
| `packages/bridge` | `@designjs/bridge` | Shared protocol / tool schemas. Consumed by the canvas and the MCP server. Currently `private: true` — not published until v0.2. |
| `packages/mcp-server` | `@designjs/mcp-server` | The `opencanvas-mcp` stdio binary that agents spawn. Will be published once the bridge is public. |
| `packages/app` | *(not published)* | Served locally via `pnpm dev`. The `create-opencanvas` scaffolder (planned for v0.2) will pull this as a template. |

> **v0.1 note:** all packages are still `private: true`. The release process below is the target workflow — it will go live when we flip `private` and publish the first version.

## Versioning

We use [Changesets](https://github.com/changesets/changesets) to manage versions and generate the CHANGELOG. All packages share a version at the monorepo level for v0.1 — independent versioning is an option once the surface stabilises.

Workflow summary:

```bash
pnpm changeset              # describe the change, pick bump level
# ...commit the .changeset/ file with your PR

# on main after merge:
pnpm changeset version      # bumps package.json versions + CHANGELOG
pnpm changeset publish      # publishes to npm and tags the release
```

## Release steps

### 1. Pre-flight

- [ ] CI is green on `main`
- [ ] Both smoke tests pass (`pnpm smoke:bridge`, `node scripts/smoke-mcp.mjs`)
- [ ] README, CONTRIBUTING, and tool reference are accurate for the release
- [ ] The GitHub milestone for the release is closed (all issues shipped or moved)

### 2. Version bump

From a clean `main`:

```bash
git checkout main && git pull
pnpm changeset version      # writes updated versions + CHANGELOG entries
git add .
git commit -m "chore: release v0.X.Y"
```

### 3. Publish

```bash
pnpm -r build
pnpm changeset publish      # uses NPM_TOKEN from env; publishes public packages
```

For packages that are still `private: true` (all of them in v0.1), flip the flag and remove from `.changeset/config.json` `ignore` list in the same PR as the first public release.

### 4. GitHub release

`changeset publish` creates git tags (e.g. `@designjs/mcp-server@0.1.0`). Push them:

```bash
git push --follow-tags
```

Then:

```bash
gh release create v0.X.Y \
  --title "v0.X.Y" \
  --notes-file CHANGELOG.md \
  --latest
```

Attach the most recent CHANGELOG entries.

### 5. Post-release

- Post in the `#releases` Discord / Discord-equivalent channel
- Update any demo links / documentation site
- Close the milestone

## Hotfix releases

For a patch release off the latest tag:

```bash
git checkout -b hotfix/v0.X.Y-hotfix <latest-tag>
# ...fix + changeset
pnpm changeset version
git commit -am "chore: hotfix v0.X.(Y+1)"
pnpm -r build && pnpm changeset publish
git push --follow-tags
```

Merge the hotfix branch back into `main` afterwards.

## Environment / secrets

CI requires these repository secrets for publishing:

- `NPM_TOKEN` — automation token with `publish` scope on the `@opencanvas` npm org
- `GITHUB_TOKEN` — default `GITHUB_TOKEN` is sufficient for `gh release create`

The release workflow (`.github/workflows/release.yml` — planned) will run `changeset publish` on tagged commits.

## Rollback

If a bad release ships:

1. `npm deprecate @designjs/<pkg>@<version> "known issue, use <version-1>"` (do **not** `npm unpublish` unless it's within 72 hours and contains a secret)
2. Open a GitHub issue linking the CHANGELOG entry + the breakage
3. Cut a new patch release fixing the issue rather than reverting the bad version
