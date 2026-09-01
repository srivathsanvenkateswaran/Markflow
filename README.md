# MarkFlow – Notion-like Markdown Editor

MarkFlow makes Markdown files in VS Code behave like documents instead of source code. It exists because the built-in Markdown preview gets in the way of actually writing:

- **The preview is a singleton.** Open a preview for a second file and it replaces the first. You cannot read two rendered documents side by side.
- **The preview is read-only.** To change anything you go back to the raw text tab, edit, and glance across to check the result.
- **`.md` files always open as raw text.** Every double-click lands you in Markdown source, even when you just wanted to read the document.

MarkFlow registers a custom editor for `*.md` and makes it the default. Every Markdown file opens directly in an editable, rendered view — one tab per file, as many as you like — and everything you type is written back to the file as plain Markdown.

MarkFlow is not affiliated with Notion Labs or Obsidian; "Notion-like" describes the editing experience, nothing more.

## Features

- Rendered WYSIWYG view as the default editor for Markdown files, built on the Milkdown Crepe engine
- Unlimited files open in rendered view at the same time, each in its own tab
- Slash-command menu: type `/` to insert headings, lists, tables, code blocks, images, and more
- Block drag handles for reordering content
- Inline formatting toolbar on text selection
- Tables, task lists, and code blocks with syntax highlighting
- Two rendering styles per file: VS Code-preview typography (the default) or a Notion-like document look, switchable with one click
- Full-width layout by default; content width is configurable
- Follows your VS Code color theme, light or dark
- Fully offline — all assets are bundled with the extension, nothing is fetched from a CDN

## How editing and saving work

MarkFlow edits the real `.md` file — not a copy, not a shadow buffer. The rendered view is backed directly by the same text document VS Code always manages, so everything behaves the way you expect:

- **Save** with `Cmd+S` / `Ctrl+S`; the tab shows the usual dirty-state dot
- **Undo/redo** uses VS Code's native undo stack
- **Git** sees ordinary edits to an ordinary text file — diffs, staging, and checkouts all work
- External changes to the file (a git pull, another editor) show up in the rendered view immediately

What lands on disk is plain CommonMark + GFM. There is no proprietary format and nothing to export.

## Slash commands

You rarely need to remember Markdown syntax. Type `/` anywhere in the document and pick from the menu — headings, bulleted and numbered lists, task lists, tables, quotes, dividers, code blocks, images. Typing after the `/` filters the list.

## Preview styles

Each file renders in one of two styles, both fully editable:

- **vscode** (default) — typography matching VS Code's built-in Markdown preview: compact text, bordered `h1`/`h2`, full-width layout.
- **notion** — larger headings and a document feel.

Switch the current file with **MarkFlow: Toggle Preview Style** (Command Palette or the color-mode icon in the editor title bar). The choice is remembered per file in the workspace. Two settings control the defaults:

```json
"markflow.defaultStyle": "vscode",   // or "notion"
"markflow.maxContentWidth": 0        // pixels; 0 = full editor width
```

## Switching to source view

When you want the raw Markdown:

- Run **MarkFlow: Open Markdown Source** from the Command Palette, or click the source icon in the editor title bar
- To come back, run **MarkFlow: Open with MarkFlow** or click its title-bar icon
- One-off alternative: right-click the file in the Explorer and choose **Open With… → Text Editor**

## Configuration

If you would rather have Markdown open in the plain text editor by default and use MarkFlow only on demand, add this to your settings:

```json
"workbench.editorAssociations": {
  "*.md": "default"
}
```

With that in place, `.md` files open as text and you opt into MarkFlow per file via **Open With…** or the **MarkFlow: Open with MarkFlow** command.

## Known limitations

- Markdown that leans heavily on raw HTML may not round-trip exactly through the WYSIWYG view. Such files still load (the parser is lenient), but they are better edited in source view.
- YAML frontmatter is passed through untouched but not rendered as a form or table — v1 treats it as opaque text.
- Mermaid diagrams and math rendering are not in this release.
- The serializer normalizes some Markdown style on the first edit — most visibly, `-` list bullets become `*`. The content is identical; only the syntax flavor changes, so expect a one-time diff on files written with different conventions.
- YAML frontmatter is preserved byte-for-byte but shown/edited only in source view.

## Installing locally

From a packaged `.vsix`:

```
code --install-extension markflow-0.1.0.vsix
```

Then reload VS Code and open any `.md` file.
