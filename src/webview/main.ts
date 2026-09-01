import { Crepe } from '@milkdown/crepe';
import { replaceAll } from '@milkdown/kit/utils';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './style.css';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

type HostMessage =
  | { type: 'init'; text: string }
  | { type: 'update'; text: string };

const vscode = acquireVsCodeApi();
const DEBOUNCE_MS = 250;

let crepe: Crepe | undefined;
let creating = false;
// YAML frontmatter is invisible to Milkdown's parser (it would mangle the
// fences into thematic breaks), so it is split off here, held verbatim, and
// re-attached to every outgoing edit.
let frontmatter = '';
// Suppresses posting markdownUpdated events triggered by programmatic
// replaceAll (i.e. content pushed from the extension host).
let suppressEdits = false;
let lastSentText: string | undefined;
let lastReceivedText: string | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n+$/, '');
}

function splitFrontmatter(text: string): { fm: string; body: string } {
  const match = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/.exec(text);
  if (match) {
    return { fm: match[0], body: text.slice(match[0].length) };
  }
  return { fm: '', body: text };
}

function showFatalError(error: unknown): void {
  const app = document.getElementById('app');
  if (app) {
    const message = error instanceof Error ? error.message : String(error);
    app.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'markflow-error';
    box.textContent = `MarkFlow failed to load the editor: ${message}`;
    app.appendChild(box);
  }
}

function postEdit(markdown: string): void {
  const full = frontmatter + markdown;
  if (full === lastSentText) {
    return;
  }
  lastSentText = full;
  vscode.postMessage({ type: 'edit', text: full });
}

async function createEditor(initialText: string): Promise<void> {
  creating = true;
  const initial = splitFrontmatter(initialText);
  frontmatter = initial.fm;
  try {
    const instance = new Crepe({
      root: '#app',
      defaultValue: initial.body,
    });

    instance.on((lm) => {
      lm.markdownUpdated((_ctx, markdown) => {
        if (suppressEdits) {
          return;
        }
        if (debounceTimer !== undefined) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          debounceTimer = undefined;
          postEdit(markdown);
        }, DEBOUNCE_MS);
      });
    });

    await instance.create();
    crepe = instance;

    // The host may have pushed a newer text while the editor was being built.
    if (lastReceivedText !== undefined && normalize(lastReceivedText) !== normalize(initialText)) {
      applyIncoming(lastReceivedText);
    }
  } catch (error) {
    showFatalError(error);
  } finally {
    creating = false;
  }
}

function applyIncoming(text: string): void {
  if (!crepe) {
    return;
  }
  const incoming = splitFrontmatter(text);
  frontmatter = incoming.fm;
  if (normalize(incoming.body) === normalize(crepe.getMarkdown())) {
    return;
  }
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  }
  suppressEdits = true;
  try {
    crepe.editor.action(replaceAll(incoming.body, true));
  } finally {
    // markdownUpdated fires synchronously within the action; release on the
    // next tick to be safe against microtask-deferred listeners.
    setTimeout(() => {
      suppressEdits = false;
    }, 0);
  }
}

window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  if (!message || typeof message !== 'object') {
    return;
  }
  switch (message.type) {
    case 'init': {
      lastReceivedText = message.text;
      if (!crepe && !creating) {
        void createEditor(message.text);
      } else {
        applyIncoming(message.text);
      }
      break;
    }
    case 'update': {
      lastReceivedText = message.text;
      applyIncoming(message.text);
      break;
    }
  }
});

vscode.postMessage({ type: 'ready' });
