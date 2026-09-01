import * as path from 'path';
import * as vscode from 'vscode';

export type PreviewStyle = 'vscode' | 'notion';

type HostMessage =
  | { type: 'init'; text: string; style: PreviewStyle; maxWidth: number }
  | { type: 'update'; text: string }
  | { type: 'setStyle'; style: PreviewStyle; maxWidth: number };

type WebviewMessage =
  | { type: 'ready' }
  | { type: 'edit'; text: string };

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'markflow.editor';

  private readonly panels = new Map<string, Set<vscode.WebviewPanel>>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  private styleKey(uri: vscode.Uri): string {
    return `markflow.style:${uri.toString()}`;
  }

  public getStyle(uri: vscode.Uri): PreviewStyle {
    const override = this.context.workspaceState.get<PreviewStyle>(this.styleKey(uri));
    if (override === 'vscode' || override === 'notion') {
      return override;
    }
    return vscode.workspace
      .getConfiguration('markflow')
      .get<PreviewStyle>('defaultStyle', 'vscode');
  }

  private getMaxWidth(): number {
    return vscode.workspace.getConfiguration('markflow').get<number>('maxContentWidth', 0);
  }

  public async toggleStyle(uri: vscode.Uri): Promise<void> {
    const next: PreviewStyle = this.getStyle(uri) === 'vscode' ? 'notion' : 'vscode';
    await this.context.workspaceState.update(this.styleKey(uri), next);
    this.broadcastStyle(uri);
  }

  private broadcastStyle(uri: vscode.Uri): void {
    const message: HostMessage = {
      type: 'setStyle',
      style: this.getStyle(uri),
      maxWidth: this.getMaxWidth(),
    };
    for (const panel of this.panels.get(uri.toString()) ?? []) {
      void panel.webview.postMessage(message);
    }
  }

  public onConfigurationChanged(): void {
    for (const key of this.panels.keys()) {
      this.broadcastStyle(vscode.Uri.parse(key));
    }
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webviewPanel.webview;
    const documentDir = vscode.Uri.file(path.dirname(document.uri.fsPath));

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? []),
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        documentDir,
      ],
    };

    webview.html = this.getHtml(webview, documentDir);

    const panelKey = document.uri.toString();
    let panelSet = this.panels.get(panelKey);
    if (!panelSet) {
      panelSet = new Set();
      this.panels.set(panelKey, panelSet);
    }
    panelSet.add(webviewPanel);

    // Last text this webview asked us to write into the document. When the
    // resulting onDidChangeTextDocument fires and the document matches it,
    // the change is our own echo and must not be posted back.
    let lastTextFromWebview: string | undefined;

    const postUpdate = (text: string) => {
      void webview.postMessage({ type: 'update', text } satisfies HostMessage);
    };

    const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      if (e.contentChanges.length === 0) {
        return;
      }
      const current = document.getText();
      if (current === lastTextFromWebview) {
        return; // echo of an edit this webview sent
      }
      postUpdate(current);
    });

    const messageSubscription = webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.type) {
        case 'ready': {
          void webview.postMessage({
            type: 'init',
            text: document.getText(),
            style: this.getStyle(document.uri),
            maxWidth: this.getMaxWidth(),
          } satisfies HostMessage);
          break;
        }
        case 'edit': {
          const text = message.text;
          if (text === document.getText()) {
            break;
          }
          lastTextFromWebview = text;
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          edit.replace(document.uri, fullRange, text);
          const applied = await vscode.workspace.applyEdit(edit);
          if (!applied) {
            lastTextFromWebview = undefined;
            void vscode.window.showErrorMessage(
              'MarkFlow: failed to apply your edit to the document. Re-syncing the editor.'
            );
            postUpdate(document.getText());
          }
          break;
        }
      }
    });

    webviewPanel.onDidDispose(() => {
      changeSubscription.dispose();
      messageSubscription.dispose();
      panelSet.delete(webviewPanel);
      if (panelSet.size === 0) {
        this.panels.delete(panelKey);
      }
    });
  }

  private getHtml(webview: vscode.Webview, documentDir: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.css')
    );
    const baseUri = webview.asWebviewUri(documentDir);
    const nonce = getNonce();
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} data:`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${baseUri}/">
  <link rel="stylesheet" href="${styleUri}">
  <title>MarkFlow</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
