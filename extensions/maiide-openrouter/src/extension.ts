import * as vscode from 'vscode';
import { ChatPanel } from './webview/chatPanel';
import { checkForUpdate } from './updater';
import { OpenRouterClient, ChatMessage } from './api/openrouter';

function getApiKey(config: vscode.WorkspaceConfiguration): string | undefined {
  const key = config.get<string>('apiKey') || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY?.trim();
  return key || undefined;
}

async function ensureClient(): Promise<{ client: OpenRouterClient; config: vscode.WorkspaceConfiguration } | undefined> {
  const config = vscode.workspace.getConfiguration('maiide');
  const apiKey = getApiKey(config);
  if (!apiKey) {
    const set = await vscode.window.showWarningMessage('OpenRouter API key not set. Add in Settings (MAIIDE: Api Key) or set OPENROUTER_API_KEY env.', 'Open Settings');
    if (set === 'Open Settings') vscode.commands.executeCommand('workbench.action.openSettings', 'maiide.apiKey');
    return undefined;
  }
  return { client: new OpenRouterClient(apiKey), config };
}

async function processAgentActions(text: string) {
  const actions = [];
  const regex = /\[ACTION:\s*(\w+):\s*(.+?)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const type = match[1];
    const args = match[2];
    actions.push({ type, args });
  }
  for (const action of actions) {
    if (action.type === 'run_command') {
      const confirm = await vscode.window.showInformationMessage(`Run command: ${action.args}?`, 'Run', 'Skip');
      if (confirm === 'Run') {
        runCommandInTerminal(action.args);
      }
    } else if (action.type === 'create_file') {
      const parts = action.args.split(':', 2);
      if (parts.length === 2) {
        const path = parts[0].trim();
        const content = parts[1].trim();
        const confirm = await vscode.window.showInformationMessage(`Create file ${path} with content?`, 'Create', 'Skip');
        if (confirm === 'Create') {
          await createFile(path, content);
        }
      }
    }
  }
}

function runCommandInTerminal(cmd: string) {
  const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('MAIIDE');
  terminal.show();
  terminal.sendText(cmd);
}

async function createFile(path: string, content: string) {
  const uri = vscode.Uri.file(path);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
}

export async function activate(context: vscode.ExtensionContext) {
  // Check for updates (GitHub latest release)
  try {
    const ext = vscode.extensions.getExtension('maiide.maiide-openrouter');
    const version = (ext?.packageJSON?.version as string) || '0.0.0';
    checkForUpdate(version);
  } catch {}
  let lastAssistantText: string = '';

  const openChat = vscode.commands.registerCommand('maiide.openChat', async () => {
    const env = await ensureClient();
    if (!env) return;
    const { client, config } = env;

    const panel = ChatPanel.createOrShow(context);

    // Load models
    try {
      const models = await client.listModels();
      panel.postMessage({ type: 'models', models, defaultModel: config.get<string>('model') || models[0]?.id });
    } catch (e: any) {
      panel.postMessage({ type: 'error', text: e?.message || String(e) });
    }

    const systemPrompt = config.get<string>('systemPrompt') || '';
    const history: ChatMessage[] = systemPrompt ? [{ role: 'system', content: systemPrompt }] : [];

    function buildContextAugment(): string {
      const includeSel = config.get<boolean>('context.includeSelection', true);
      const includeFile = config.get<boolean>('context.includeActiveFile', false);
      const editor = vscode.window.activeTextEditor;
      let ctx = '';
      if (editor) {
        if (includeSel) {
          const sel = editor.document.getText(editor.selection);
          if (sel) ctx += `\n\n[Selection]\n${sel}`;
        }
        if (includeFile) {
          const all = editor.document.getText();
          const filePath = editor.document.uri.fsPath;
          ctx += `\n\n[File: ${filePath}]\n${all}`;
        }
      }
      return ctx.trim();
    }

    panel.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'chat') {
        const model = msg.model || config.get<string>('model') || 'openrouter/auto';
        let userText = String(msg.text || '');
        const ctx = buildContextAugment();
        if (ctx) {
          userText += `\n\n[Context]\n${ctx}`;
        }
        history.push({ role: 'user', content: userText });
        try {
          panel.postMessage({ type: 'assistantStart' });
          let acc = '';
          for await (const delta of client.chatStream(model, history)) {
            acc += delta;
            panel.postMessage({ type: 'assistantDelta', text: delta });
          }
          panel.postMessage({ type: 'assistantEnd' });
          const finalText = acc || '(no content)';
          history.push({ role: 'assistant', content: finalText });
          lastAssistantText = finalText;

          // Agent actions
          const agentEnabled = config.get<boolean>('agentActions.enabled', false);
          if (agentEnabled) {
            await processAgentActions(finalText);
          }
        } catch (e: any) {
          panel.postMessage({ type: 'error', text: e?.message || String(e) });
        }
      }
    });
  });

  const refreshModels = vscode.commands.registerCommand('maiide.refreshModels', async () => {
    const env = await ensureClient();
    if (!env) return;
    const { client, config } = env;
    const panel = ChatPanel.createOrShow(context);
    try {
      const models = await client.listModels();
      panel.postMessage({ type: 'models', models, defaultModel: config.get<string>('model') || models[0]?.id });
    } catch (e: any) {
      panel.postMessage({ type: 'error', text: e?.message || String(e) });
    }
  });

  const setApiKey = vscode.commands.registerCommand('maiide.setApiKey', async () => {
    const value = await vscode.window.showInputBox({ prompt: 'Enter OpenRouter API Key', password: true, ignoreFocusOut: true });
    if (value) {
      await vscode.workspace.getConfiguration('maiide').update('apiKey', value, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('OpenRouter API key saved to settings.');
    }
  });

  const chatWithSelection = vscode.commands.registerCommand('maiide.chatWithSelection', async () => {
    const env = await ensureClient();
    if (!env) return;
    const editor = vscode.window.activeTextEditor;
    const selText = editor ? editor.document.getText(editor.selection) : '';
    const panel = ChatPanel.createOrShow(context);
    // prefill prompt box in webview
    panel.postMessage({ type: 'prefill', text: selText });
  });

  // Insert last response at cursor
  const insertAtCursor = vscode.commands.registerCommand('maiide.insertLastResponseAtCursor', async () => {
    if (!lastAssistantText) return vscode.window.showInformationMessage('No assistant response to insert.');
    const editor = vscode.window.activeTextEditor;
    if (!editor) return vscode.window.showInformationMessage('No active editor.');
    await editor.edit(edit => {
      edit.insert(editor.selection.active, lastAssistantText);
    });
  });

  // New file from last response
  const newFileFromLast = vscode.commands.registerCommand('maiide.newFileFromLastResponse', async () => {
    if (!lastAssistantText) return vscode.window.showInformationMessage('No assistant response to create file from.');
    const path = await vscode.window.showInputBox({ prompt: 'Enter file path' });
    if (!path) return;
    await createFile(path, lastAssistantText);
  });

  // Replace current file with last response
  const replaceCurrent = vscode.commands.registerCommand('maiide.replaceCurrentFileWithLastResponse', async () => {
    if (!lastAssistantText) return vscode.window.showInformationMessage('No assistant response to apply.');
    const editor = vscode.window.activeTextEditor;
    if (!editor) return vscode.window.showInformationMessage('No active editor.');
    const confirm = await vscode.window.showWarningMessage('Replace entire file with the last assistant response?', 'Replace', 'Cancel');
    if (confirm !== 'Replace') return;
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(editor.document.getText().length)
    );
    await editor.edit(edit => edit.replace(fullRange, lastAssistantText));
  });

  // Run terminal command
  const runTerminalCmd = vscode.commands.registerCommand('maiide.runTerminalCommand', async () => {
    const cmd = await vscode.window.showInputBox({ prompt: 'Enter command to run' });
    if (!cmd) return;
    runCommandInTerminal(cmd);
  });

  context.subscriptions.push(
    openChat,
    refreshModels,
    setApiKey,
    chatWithSelection,
    insertAtCursor,
    newFileFromLast,
    replaceCurrent,
    runTerminalCmd
  );
}

export function deactivate() {}
