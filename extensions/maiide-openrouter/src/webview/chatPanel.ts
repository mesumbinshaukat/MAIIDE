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
  }

  private getHtml() {
    const nonce = String(Math.random()).slice(2);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MAIIDE Chat</title>
  <style>
    body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}
    .row{display:flex;gap:8px;padding:8px;border-bottom:1px solid var(--vscode-panel-border)}
    #messages{height:calc(100vh - 120px);overflow:auto;padding:8px}
    .msg{margin:6px 0;padding:8px;border-radius:6px}
    .user{background:rgba(11,92,255,.12)}
    .assistant{background:rgba(255,255,255,.06)}
  </style>
  </head>
  <body>
    <div class="row">
      <input id="modelFilter" placeholder="Filter models..."/>
      <select id="model"></select>
    </div>
    <div id="messages"></div>
    <div class="row" style="border-top:1px solid var(--vscode-panel-border)">
      <input id="prompt" placeholder="Ask MAIIDE..." style="flex:1"/>
      <button id="send">Send</button>
    </div>
    <div id="status" style="padding:6px 8px;opacity:.7;font-size:12px"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const messagesEl = document.getElementById('messages');
      const modelEl = document.getElementById('model');
      const modelFilterEl = document.getElementById('modelFilter');
      const promptEl = document.getElementById('prompt');
      const sendBtn = document.getElementById('send');
      const statusEl = document.getElementById('status');
      let streamingEl = null; let streamingText='';

      function addMsg(role, text){
        const div=document.createElement('div');
        div.className='msg ' + (role==='user'?'user':'assistant');
        const pre=document.createElement('pre');
        pre.textContent=String(text||'');
        div.appendChild(pre);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      window.addEventListener('message', (event)=>{
        const msg = event.data;
        if (msg && msg.type==='models'){
          modelEl.innerHTML='';
          const arr = msg.models||[];
          for (const m of arr){
            const opt=document.createElement('option');
            opt.value = m.id; opt.textContent = m.name || m.id;
            modelEl.appendChild(opt);
          }
          if (msg.defaultModel) modelEl.value = msg.defaultModel;
        }
        if (msg && msg.type==='assistant') addMsg('assistant', msg.text);
        if (msg && msg.type==='assistantStart'){
          streamingText='';
          streamingEl=document.createElement('div');
          streamingEl.className='msg assistant';
          const pre=document.createElement('pre'); pre.textContent='';
          streamingEl.appendChild(pre);
          messagesEl.appendChild(streamingEl);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        if (msg && msg.type==='assistantDelta' && streamingEl){
          streamingText += String(msg.text||'');
          const pre = streamingEl.querySelector('pre'); if (pre) pre.textContent = streamingText;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        if (msg && msg.type==='assistantEnd'){ streamingEl=null; streamingText=''; }
        if (msg && msg.type==='error') addMsg('assistant', 'Error: ' + msg.text);
        if (msg && msg.type==='prefill'){ promptEl.value = msg.text || ''; promptEl.focus(); }
      });

      modelFilterEl.addEventListener('input', ()=>{
        const q=(modelFilterEl.value||'').toLowerCase();
        for (const opt of modelEl.options){
          const t=(opt.textContent||'').toLowerCase();
          opt.hidden = q && !t.includes(q);
        }
      });

      sendBtn.addEventListener('click', ()=>{
        const text=(promptEl.value||'').trim();
        if (!text) return;
        addMsg('user', text);
        statusEl.textContent='Thinking...';
        vscode.postMessage({ type:'chat', model: modelEl.value, text });
        promptEl.value='';
      });

      window.addEventListener('message', (event)=>{
        const t = event.data && event.data.type;
        if (t==='assistant' || t==='assistantEnd' || t==='error') statusEl.textContent='';
      });
    </script>
  </body>
</html>`;
  }
}
