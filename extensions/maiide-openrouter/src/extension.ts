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

export async function activate(context: vscode.ExtensionContext) {
  // Check for updates (GitHub latest release)
  try {
    const ext = vscode.extensions.getExtension('maiide.maiide-openrouter');
    const version = (ext?.packageJSON?.version as string) || '0.0.0';
    checkForUpdate(version);
  } catch {}
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

    panel.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'chat') {
        const model = msg.model || config.get<string>('model') || 'openrouter/auto';
        const userText = String(msg.text || '');
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

  context.subscriptions.push(openChat, refreshModels, setApiKey, chatWithSelection);
}

export function deactivate() {}
