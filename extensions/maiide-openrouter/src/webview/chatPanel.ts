import * as vscode from 'vscode';

export class ChatPanel {
  public static current: ChatPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor?.viewColumn;
    if (ChatPanel.current) {
      ChatPanel.current.panel.reveal(column);
      return ChatPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'maiideChat',
      'MAIIDE Chat',
      column ?? vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    ChatPanel.current = new ChatPanel(panel, context);
    return ChatPanel.current;
  }

  private constructor(private panel: vscode.WebviewPanel, private context: vscode.ExtensionContext) {
    this.panel.iconPath = {
      light: vscode.Uri.joinPath(context.extensionUri, 'media', 'maiide.svg'),
      dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'maiide.svg')
    };
    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  postMessage(message: any) {
    this.panel.webview.postMessage(message);
  }

  onDidReceiveMessage(listener: (e: any) => any) {
    this.panel.webview.onDidReceiveMessage(listener, null, this.disposables);
  }

  dispose() {
    ChatPanel.current = undefined;
    while (this.disposables.length) {
      const d = this.disposables.pop();
      try { d?.dispose(); } catch {}
    }
    this.panel.dispose();
  }

  private getHtml() {
    const nonce = String(Math.random()).slice(2);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' ; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MAIIDE Chat</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; }
    .container { display: flex; flex-direction: column; height: 100vh; }
    .toolbar { display: flex; gap: 8px; padding: 8px 10px; align-items: center; border-bottom: 1px solid var(--vscode-panel-border); }
    .toolbar input[type=text] { flex: 1; padding: 6px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
    .messages { flex: 1; overflow: auto; padding: 12px; }
    .msg { margin: 8px 0; padding: 10px 12px; border-radius: 8px; line-height: 1.5; }
    .user { background: rgba(11,92,255,.12); }
    .assistant { background: rgba(255,255,255,.06); }
    .controls { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--vscode-panel-border); }
    input, select, button { font-size: 13px; }
    select { min-width: 280px; }
    input[type=text].prompt { flex: 1; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
    button { padding: 8px 12px; }
    .status { font-size: 12px; opacity: .7; padding: 6px 10px; }
    /* markdown */
    .msg pre { background: #00000033; padding: 10px; overflow: auto; border-radius: 6px; }
    .msg code { font-family: var(--vscode-editor-font-family, monospace); }
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <input id="modelFilter" type="text" placeholder="Filter models..." />
      <select id="model"></select>
    </div>
    <div class="messages" id="messages"></div>
    <div class="controls">
      <input class="prompt" id="prompt" type="text" placeholder="Ask MAIIDE to review, research, or code..." />
      <button id="send">Send</button>
    </div>
    <div class="status" id="status"></div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const modelEl = document.getElementById('model');
    const modelFilterEl = document.getElementById('modelFilter');
    const promptEl = document.getElementById('prompt');
    const sendBtn = document.getElementById('send');
    const statusEl = document.getElementById('status');
    let streamingEl = null;
    let streamingText = '';

    function md(text){
      // simple escaping and line breaks only (avoid backtick-based markdown to keep template safe)
      let html = String(text)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      html = html.replace(/\n/g,'<br/>');
      return html;
    }

    function addMsg(role, text){
      const div = document.createElement('div');
      div.className = 'msg ' + (role === 'user' ? 'user' : 'assistant');
      div.innerHTML = md(text);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'models') {
        modelEl.innerHTML = '';
        const models = (msg.models || []);
        models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id; opt.textContent = m.name || m.id;
          modelEl.appendChild(opt);
        });
        if (msg.defaultModel) modelEl.value = msg.defaultModel;
      }
      if (msg.type === 'assistant') addMsg('assistant', msg.text);
      if (msg.type === 'assistantStart') {
        streamingText = '';
        streamingEl = document.createElement('div');
        streamingEl.className = 'msg assistant';
        streamingEl.innerHTML = '';
        messagesEl.appendChild(streamingEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      if (msg.type === 'assistantDelta' && streamingEl) {
        streamingText += String(msg.text || '');
        streamingEl.innerHTML = md(streamingText);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      if (msg.type === 'assistantEnd') {
        streamingEl = null; streamingText = '';
      }
      if (msg.type === 'error') addMsg('assistant', 'Error: ' + msg.text);
      if (msg.type === 'prefill') {
        promptEl.value = msg.text || '';
        promptEl.focus();
      }
    });

    // (copy feature removed to keep template minimal and safe)

    // filter models
    modelFilterEl.addEventListener('input', () => {
      const q = modelFilterEl.value.toLowerCase();
      for (const opt of modelEl.options){
        opt.hidden = q && !opt.textContent.toLowerCase().includes(q);
      }
    });

    sendBtn.addEventListener('click', () => {
      const text = promptEl.value.trim();
      if (!text) return;
      addMsg('user', text);
      statusEl.textContent = 'Thinking...';
      vscode.postMessage({ type: 'chat', model: modelEl.value, text });
      promptEl.value = '';
    });

    // clear status on response
    window.addEventListener('message', (event) => {
      const t = event.data?.type;
      if (t === 'assistant' || t === 'error') statusEl.textContent = '';
    });
  </script>
</body>
</html>`;
  }
}
