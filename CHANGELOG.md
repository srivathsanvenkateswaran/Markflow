# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-09-01

### Fixed

- Marketplace listing now shows the extension icon (the `icon` field was missing from the manifest).

## [0.2.0] - 2026-09-01

### Added

- Per-file preview style toggle (`MarkFlow: Toggle Preview Style`, editor-title icon): switch any file between VS Code-preview typography and the Notion-like document look. The choice persists per file in the workspace.
- `markflow.defaultStyle` setting (`vscode` | `notion`, default `vscode`).
- `markflow.maxContentWidth` setting (pixels, default `0` = full editor width).

### Changed

- The default style is now VS Code-preview typography instead of the Notion look.
- Content spans the full editor width by default; the previous centered 820px column (plus a 120px gutter Crepe's theme added on each side) is gone. Set `markflow.maxContentWidth` to restore a column.

## [0.1.0] - 2026-09-01

### Added

- WYSIWYG Markdown editor (Milkdown Crepe) registered as the default editor for `*.md` files via a `CustomTextEditorProvider` with priority `default`.
- Per-tab rendered views: any number of Markdown files open in editable rendered view simultaneously.
- Editing writes back to the underlying `.md` file as plain CommonMark + GFM, with native VS Code save, dirty state, undo/redo, hot exit, and SCM integration.
- Slash-command menu (`/`), block drag handles, inline formatting toolbar, tables, task lists, and syntax-highlighted code blocks.
- Two-way sync between document and webview with echo suppression; external file changes (git checkout, other editors) reflect in the rendered view.
- Commands `MarkFlow: Open Markdown Source` and `MarkFlow: Open with MarkFlow`, each with an editor-title icon.
- Theme integration: editor colors follow the active VS Code light or dark theme.
- Relative image paths resolve against the document's directory; all assets bundled locally, no network access required.
- YAML frontmatter preserved byte-for-byte through WYSIWYG edits.
