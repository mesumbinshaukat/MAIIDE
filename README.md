# MAIIDE — Mesum AI IDE

MAIIDE is a rebranded VS Code with an OpenRouter-powered coding copilot. It aims to feel like Windsurf/Cursor while using OpenRouter models (fetched dynamically) and a concise agent workflow: review → research → code.

## Included
- `scripts/setup.ps1` — clones microsoft/vscode and applies minimal branding (`nameLong`, `nameShort`, `applicationName`).
- `extensions/maiide-openrouter/` — MAIIDE OpenRouter extension with streaming chat, model list, context injection, and file ops.

## Install the extension (VSIX)
- Build from CI or local, then in VS Code: Extensions → … → Install from VSIX…
- Pick `extensions/maiide-openrouter/maiide-openrouter-<version>.vsix`
- No need to uninstall previous version; installing updates it.

## Usage
- Run `MAIIDE: Set OpenRouter API Key` (or set `OPENROUTER_API_KEY`).
- Run `MAIIDE: Open Chat`.
- If models are empty: run `MAIIDE: Refresh OpenRouter Models`.
- Optional context:
  - `maiide.context.includeSelection` (default: true)
  - `maiide.context.includeActiveFile` (default: false)

## Features
- Dynamic models (OpenRouter `/models`).
- Streaming chat responses.
- Context injection (selection/file).
- File operations:
  - Insert last response at cursor
  - New file from last response (with path prompt)
  - Replace current file with last response (with confirmation)
- Terminal integration: Run commands in VSCode terminal.
- Agent actions: Parse [ACTION: run_command: cmd] or [ACTION: create_file: path:content] from responses (with confirmation).

## CI
- Workflow `/.github/workflows/build.yml` builds and uploads a VSIX artifact on every push to `main`.

## Troubleshooting
- Models missing:
  - Ensure API key is set, then run `MAIIDE: Refresh OpenRouter Models`.
  - Network/proxy/VPN can block `https://openrouter.ai/api/v1/models`.
  - The client sends recommended headers (`Authorization`, `Accept`, `Content-Type`, `HTTP-Referer`, `X-Title`). Update in `extensions/maiide-openrouter/src/api/openrouter.ts` if you fork.
- Non‑streaming/No replies:
  - Try a simpler model (e.g., `openrouter/auto`).
  - Check Output/DevTools for errors.
- `extensions/maiide-openrouter` — VS Code extension for dynamic model listing and chat via OpenRouter.

## Requirements
- Windows with PowerShell and Git
- Node.js 18+
- NPM (or Yarn)
- OpenRouter API key

## Quick start
1) Clone and rebrand VS Code to MAIIDE
```powershell
# From repo root
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```
Optional flags:
- `-InstallDeps` — run `npm ci` in the VS Code repo.
- `-AttemptBuild` — attempt a local VS Code build.

2) Configure OpenRouter key
- In Settings: `MAIIDE: Api Key`, or
- Environment variable: `OPENROUTER_API_KEY=sk-...`

3) Build the MAIIDE OpenRouter extension
```powershell
# From repo root
cd .\extensions\maiide-openrouter
npm install
npm run compile
```

4) Run the extension
- Open this repo in MAIIDE (or VS Code).
- Press F5 to start Extension Development Host.
- Run: `MAIIDE: Open Chat`.

## Extension features
- Dynamic models via OpenRouter `/models`.
- Chat side panel webview.
- Configurable system prompt guiding review → research → code.

## Configuration
- `maiide.apiKey` — OpenRouter API key. If empty, reads `OPENROUTER_API_KEY`.
- `maiide.model` — default model id.
- `maiide.systemPrompt` — agent prompt text.

## Notes
- Branding is minimal; you can expand icons/installer later.
- Chat is non-streaming; streaming can be added via webview messaging.
- If TypeScript errors appear, run `npm install` in `extensions/maiide-openrouter`.

## Roadmap
- Workspace awareness (context windows, file summaries).
- Tooling hooks to automate review/research/code.
- Model capability presets.
