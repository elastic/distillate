# After the first public release

Follow-through once `@elastic/distillate` has been published and the repository is public. Each item is enough for a human or an agent to act on without private context.

## Cut a release

Releasing is two manual workflows with a pull request between them. Nothing ever pushes to `main`: the org `Require a PR` ruleset rejects it, and its ref patterns cover `release/*` too, so the release branch is `chore/release-v<version>`.

1. Confirm `main` is green and the changelog-driving commits since the last tag are the ones you intend to ship.
2. On npmjs.com, configure a Trusted Publisher for `@elastic/distillate`: GitHub Actions, repository `elastic/distillate`, workflow `release.yml`. Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) only (`id-token: write`); there is no `NPM_TOKEN` fallback. Do this before any run of either workflow: `@semantic-release/npm` v13 exchanges the OIDC token even during its dry-run authentication check. Provenance is emitted automatically under trusted publishing.
3. Run **Prepare a Release** (`prepare-release.yml`). It computes the next version and notes with semantic-release in dry-run — which tags and publishes nothing — writes `CHANGELOG.md` and the `package.json` version, and opens a `chore(release): <version>` pull request whose body is the release notes. With no prior git tag the first release is **0.1.0**: `scripts/run_semantic_release.js` patches semantic-release's `FIRST_RELEASE`, which is both the first tag and `main`'s allowed version range.
4. Review that pull request. It is the last checkpoint before anything is public. `ci` does not run on it, because pull requests opened with `GITHUB_TOKEN` do not trigger workflows. Merge it.
5. Run **Publish a Release** (`release.yml`). Both workflows are `workflow_dispatch` only — nothing publishes on push. Run it once with **dry_run** enabled to exercise `pnpm verify` and semantic-release without publishing, then again with `dry_run: false` to tag the version, publish to the npm registry, and create the GitHub Release.
6. If a release-driving commit lands on `main` between steps 3 and 5, the publish aborts: `scripts/semantic_release_verify_version.js` fails the run when the computed version does not match `package.json`. Re-run **Prepare a Release** and merge the refreshed pull request.

Later `feat:` commits become `0.2.0`, `0.3.0`, …; a `BREAKING CHANGE` becomes `1.0.0`. The supported consumer install is `npm install @elastic/distillate` from registry.npmjs.org.

## Move CI onto shared infrastructure

Pull-request checks currently run on GitHub Actions and call pnpm scripts (`typecheck`, `lint`, `test`, `build`, `smoke:exports`, `smoke:declarations`, `licenses:report --check`). A shared CI pipeline should call the same scripts.

- [`catalog-info.yaml`](../catalog-info.yaml) is the service-catalog descriptor. Add a pipeline resource there when the pipeline exists.
- [`.buildkite/pull-requests.json`](../.buildkite/pull-requests.json) is a disabled template for pull-request builds. Enable it and point `pipeline_slug` at the registered pipeline.

No check logic needs to be rewritten to change runners.

## Upgrade ESLint

The repo is on ESLint 9 with flat config. Move to ESLint 10 when every plugin in `package.json` (`typescript-eslint`, `eslint-plugin-license-header`, `eslint-plugin-prettier`, `eslint-plugin-simple-import-sort`) declares support, then re-run `pnpm verify`.

## Keep the license report current

`THIRD_PARTY_LICENSES.md` is the source and distribution dependency manifest. `NOTICE.txt` carries the product notice plus each runtime dependency's NOTICE and license text. After any dependency change:

```sh
pnpm licenses:report
```

Commit both files. CI fails `pnpm licenses:report --check` when they drift.

## Reconcile downstream copies

Any project that currently vendors or workspace-links this engine should switch to the published `@elastic/distillate` version and drop its local copy once that version covers the APIs it uses.
