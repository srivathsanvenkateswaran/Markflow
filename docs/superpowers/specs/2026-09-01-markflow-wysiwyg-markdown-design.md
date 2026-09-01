# MarkFlow: Notion-like WYSIWYG Markdown Editor for VS Code — Design

Date: 2026-09-01
Status: Approved for implementation (user pre-approved pipeline; autonomous session)

## Problem

VS Code's built-in Markdown preview is effectively a singleton: opening a preview
for another file replaces the current one, previews are read-only, and `.md`
files always open in the raw text editor first. The user wants Markdown files in
VS Code to behave like Notion/Obsidian documents:

1. Any number of Markdown files open in rendered view at once, one tab each.
2. `.md` files open in the rendered view by default (not the text editor).
3. The rendered view is directly editable (WYSIWYG), with changes saved back to
   the underlying `.md` file as plain Markdown.

## Approach

A single VS Code mechanism satisfies all three requirements: a
`CustomTextEditorProvider` registered for `*.md` with `priority: "default"`.

- Custom editors are per-tab, so every file gets its own live rendered view —
  the singleton limitation of the built-in preview does not exist here.
- `priority: "default"` makes it the default editor for Markdown. VS Code's
  built-in "Reopen With…" plus our own commands provide the raw-source escape
  hatch, and users can override the default entirely via
  `workbench.editorAssociations`.
- Because it is a Custom **Text** Editor (backed by `TextDocument`), VS Code
  natively handles save, dirty state, hot exit, undo/redo stack, SCM diffing,
  and file watching. We only implement the document ⇄ webview sync.

### Editor engine in the webview

**Milkdown Crepe** (`@milkdown/crepe`, MIT license): a batteries-included
Notion-style editor built on Milkdown/ProseMirror. Ships slash-command menu,
block drag handles, inline toolbar, tables, task lists, code blocks with syntax
highlight, link editing, and image blocks. Markdown-first: its document model
round-trips to CommonMark + GFM.

Alternatives considered:

- **Toast UI Editor** — mature but heavier, split-pane oriented, less
  Notion-like, project less active.
- **Raw ProseMirror/Tiptap + custom serializer** — maximum control, weeks of
  work; YAGNI for v1.
- **CodeMirror live-preview (Obsidian-style hybrid)** — closer to Obsidian's
  source-with-decorations mode, but far more custom work; Crepe delivers the
  Notion experience out of the box.

### Sync protocol (extension host ⇄ webview)

Messages over `webview.postMessage`:

- `init` (host → webview): initial markdown text + resource base URI.
- `update` (host → webview): full markdown text, sent from
  `onDidChangeTextDocument` when the change did NOT originate from this
  webview (external edit, undo/redo, SCM checkout). Webview replaces editor
  content.
- `edit` (webview → host): full markdown text after a local change
  (debounced ~250 ms). Host applies a `WorkspaceEdit` replacing the entire
  document range.
- Echo suppression: host tags edits it applies; the resulting
  `onDidChangeTextDocument` event is skipped. Webview likewise ignores
  `update` payloads identical to its current serialized state.

Full-document replacement is deliberate (simple, correct); per-change diffing
is a future optimization if large files feel slow. `retainContextWhenHidden:
true` keeps tab switches instant.

### Assets, theme, security

- Relative image paths resolve via a `<base>` tag set to the document's
  directory converted with `asWebviewUri`; `localResourceRoots` covers the
  workspace folders and the extension's dist directory.
- CSP: scripts only from the extension bundle (nonce), styles inline + bundle,
  images from `webview.cspSource`, `https:`, and `data:`.
- Crepe's Frame theme, with CSS variable overrides mapping onto VS Code theme
  tokens so the editor follows light/dark themes.
- All JS/CSS bundled locally with esbuild — no CDN, works offline.

## Components

- `src/extension.ts` — activation: registers the provider and commands.
- `src/markdownEditorProvider.ts` — `CustomTextEditorProvider`: webview HTML,
  sync protocol, echo suppression, per-document listener lifecycle.
- `src/webview/main.ts` — Crepe bootstrap, message handling, debounced edits.
- `esbuild.mjs` — two bundles: extension host (CJS, node) and webview (IIFE,
  browser, CSS bundled).

### Commands & configuration

- `markflow.openSource` — reopen current file in the plain text editor.
- `markflow.openWysiwyg` — reopen current file in MarkFlow.
- Editor-title icons for both directions.
- Users who want text-editor-by-default set
  `workbench.editorAssociations: { "*.md": "default" }` (documented in README).

## Error handling

- Webview bundle failure → visible error message in the webview body.
- `WorkspaceEdit` failure → `window.showErrorMessage`, webview re-synced from
  document to avoid divergence.
- Files that Crepe cannot parse cleanly still load (ProseMirror is lenient);
  README documents that exotic raw-HTML markdown is better edited in source
  view.

## Testing & release

- `npm run build` (type-check + bundle) and `vsce package` must pass; smoke
  test via the packaged `.vsix`.
- Deliverable: `.vsix` installable immediately with
  `code --install-extension`. Marketplace publish requires a publisher +
  Personal Access Token from the user; README/RELEASING document the two
  commands (`vsce login`, `vsce publish`).

## Out of scope for v1

Frontmatter-aware rendering beyond passthrough, wiki-links, per-block
collaborative cursors, mermaid/katex (Crepe has math/diagram plugins — v1.x
candidates), diff-based sync.
