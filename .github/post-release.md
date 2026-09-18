# After the first public release

Follow-through once `@elastic/distillate` has been published and the repository is public. Each item is enough for a human or an agent to act on without private context.

## Cut a release

1. Confirm `main` is green and the changelog-driving commits since the last tag are the ones you intend to ship.
2. On npmjs.com, configure a Trusted Publisher for `@elastic/distillate`: GitHub Actions, repository `elastic/distillate`, workflow `release.yml`. Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) only (`id-token: write`); there is no `NPM_TOKEN` fallback. Do this before any `release.yml` run, including dry-run: `@semantic-release/npm` v13 still exchanges the OIDC token during its dry-run authentication check. Provenance is emitted automatically under trusted publishing.
3. Run the **Publish a Release** workflow (`release.yml`) from the Actions tab. It is `workflow_dispatch` only — nothing publishes on push.
4. First run it with **dry_run** enabled. That exercises `pnpm verify` and semantic-release without publishing. With no prior git tag, the first `main` release is **0.1.0** (`scripts/run_semantic_release.js` patches semantic-release's `FIRST_RELEASE` constant, which is both the first tag and `main`'s allowed range). Confirm the log says `the next release version is 0.1.0`, not `1.0.0`, and does not fail with `EINVALIDNEXTVERSION`.
5. A successful non-dry run tags the version, publishes `@elastic/distillate` to the npm registry, and creates a GitHub Release. Later `feat:` commits become `0.2.0`, `0.3.0`, …; a `BREAKING CHANGE` becomes `1.0.0`. The supported consumer install is `npm install @elastic/distillate` from registry.npmjs.org.
6. The run then opens a `chore(release): <version>` pull request carrying `CHANGELOG.md` and the `package.json` version. Nothing pushes to `main` directly: the org `Require a PR` ruleset rejects it, and its ref patterns cover `release/*` as well, so the branch is `chore/release-v<version>`. **Merge that pull request.** Until it lands, `main` has neither the changelog entry nor the released version, and the next release's changelog will not build on this one. It needs a review like any other pull request, and `ci` does not run on it because pull requests opened with `GITHUB_TOKEN` do not trigger workflows.

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
