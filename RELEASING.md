# Releasing MarkFlow

## Build and package

```
npm run build
npx @vscode/vsce package
```

This produces `markflow-0.1.0.vsix` in the repo root. Smoke-test it locally:

```
code --install-extension markflow-0.1.0.vsix
```

Reload VS Code and open a `.md` file to confirm it renders in MarkFlow.

## Publishing to the Marketplace

One-time setup:

1. Create a publisher at https://marketplace.visualstudio.com/manage.
2. Create a Personal Access Token in Azure DevOps (https://dev.azure.com):
   - Organization: **All accessible organizations**
   - Scope: **Marketplace → Manage**
3. Make sure the `publisher` field in `package.json` matches the publisher id you created — `vsce publish` fails otherwise.
4. Log in with the PAT:

   ```
   npx @vscode/vsce login <publisher>
   ```

Then publish:

```
npx @vscode/vsce publish
```

This builds, packages, and uploads the current version. Bump `version` in `package.json` before each subsequent release (or use `vsce publish patch|minor|major`), and add a matching entry to `CHANGELOG.md`.
