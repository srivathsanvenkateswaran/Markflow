import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './markdownEditorProvider';

function activeMarkdownUri(): vscode.Uri | undefined {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  const input = tab?.input;
  if (input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText) {
    return input.uri;
  }
  const doc = vscode.window.activeTextEditor?.document;
  if (doc && (doc.languageId === 'markdown' || doc.uri.path.match(/\.(md|markdown)$/i))) {
    return doc.uri;
  }
  return undefined;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      new MarkdownEditorProvider(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: true,
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('markflow.openSource', async (uri?: vscode.Uri) => {
      const target = uri ?? activeMarkdownUri();
      if (!target) {
        return;
      }
      await vscode.commands.executeCommand(
        'vscode.openWith',
        target,
        'default',
        vscode.window.tabGroups.activeTabGroup.viewColumn
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('markflow.openWysiwyg', async (uri?: vscode.Uri) => {
      const target = uri ?? activeMarkdownUri();
      if (!target) {
        return;
      }
      await vscode.commands.executeCommand(
        'vscode.openWith',
        target,
        MarkdownEditorProvider.viewType,
        vscode.window.tabGroups.activeTabGroup.viewColumn
      );
    })
  );
}

export function deactivate(): void {}
