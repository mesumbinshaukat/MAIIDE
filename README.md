# MAIIDE — Mesum AI IDE

MAIIDE is a rebranded VS Code with an OpenRouter-powered coding copilot. It aims to feel like Windsurf/Cursor while using OpenRouter models (fetched dynamically) and a concise agent workflow: review → research → code.

## Included
- `scripts/setup.ps1` — clones microsoft/vscode and applies minimal branding (`nameLong`, `nameShort`, `applicationName`).
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
