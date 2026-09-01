# Releasing MarkFlow

## Automated releases (preferred)

Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds,
packages, publishes to the VS Code Marketplace, and attaches the `.vsix` to a
GitHub Release:

```
# bump "version" in package.json and add a CHANGELOG entry, commit, then:
git tag -a v0.3.0 -m "MarkFlow 0.3.0"
git push origin main v0.3.0
```

One-time setup for the workflow — a Marketplace PAT stored as a repo secret:

1. You need an Azure DevOps organization (dev.azure.com). Creating one may
   demand a linked Azure subscription; a free Azure account satisfies it.
2. In Azure DevOps: User settings → Personal Access Tokens → New Token, with
   Organization **All accessible organizations** and scope
   **Marketplace → Manage**. Max lifetime is one year — recreate it when it
   expires (publishes start failing with 401).
3. In the GitHub repo: Settings → Secrets and variables → Actions → New
   repository secret, name `VSCE_PAT`, value = the token.

## Manual fallback (no PAT needed)

```
npx @vscode/vsce package --no-dependencies
code --install-extension markflow-markdown-editor-<version>.vsix   # smoke test
```

Then upload the `.vsix` at https://marketplace.visualstudio.com/manage →
publisher `srivathsanvenkateswaran` → ⋮ next to the extension → Update.

## Notes

- The `publisher` field in `package.json` must stay `srivathsanvenkateswaran`
  (the Marketplace publisher id); uploads with a mismatched id are rejected.
- The extension `name` (`markflow-markdown-editor`) is globally unique on the
  Marketplace and part of the install id — do not change it.
- With a PAT logged in locally (`npx @vscode/vsce login srivathsanvenkateswaran`),
  `npx @vscode/vsce publish` from the repo root also works without CI.
