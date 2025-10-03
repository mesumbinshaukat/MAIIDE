# MAIIDE OpenRouter Extension

- **Name**: MAIIDE (Mesum AI IDE).
- **Extension**: OpenRouter integration with dynamic model fetch, chat UI, and agentic system prompt.

## Features
- **Dynamic models**: Fetches available models from OpenRouter API.
- **Streaming chat**: Live token-by-token responses.
- **Chat panel**: Webview chat UI that stays open beside your editor.
- **Context injection**: Optionally include selection and/or full file.
- **File ops**: Insert last response at cursor, create new file, replace current file.
- **Terminal integration**: Run commands in VSCode terminal.
- **Agent actions**: Enable parsing of [ACTION: run_command: cmd] or [ACTION: create_file: path:content] in responses.

## Requirements
- An OpenRouter API key. Get one at https://openrouter.ai

## Setup
1. Install the VSIX (or press F5 to run the extension in an Extension Development Host).
2. Set your API key:
   - Command: `MAIIDE: Set OpenRouter API Key`, or set `OPENROUTER_API_KEY` in your environment.
3. Open the chat:
   - Command: `MAIIDE: Open Chat`.
   - If the model list is empty, run `MAIIDE: Refresh OpenRouter Models`.
4. Enable agent actions (optional):
   - In settings: `maiide.agentActions.enabled` = true.
   - Assistant can then propose actions like [ACTION: run_command: npm install].

## Commands
- **MAIIDE: Open Chat** — open the chat panel.
- **MAIIDE: Refresh OpenRouter Models** — refresh model list.
- **MAIIDE: Set OpenRouter API Key** — store key in settings.
- **MAIIDE: Chat With Selection** — prefill chat with selected text.
- **MAIIDE: Insert Last Response at Cursor** — insert into active editor.
- **MAIIDE: New File from Last Response** — create file at specified path.
- **MAIIDE: Replace Current File with Last Response** — replace entire file (with confirmation).
- **MAIIDE: Run Terminal Command** — run a command in VSCode terminal.

## Configuration
- `maiide.apiKey`: OpenRouter API key.
- `maiide.model`: Default model ID (default: `openrouter/auto`).
- `maiide.systemPrompt`: Optional system prompt.
- `maiide.context.includeSelection`: Include selection in prompts (default: true).
- `maiide.context.includeActiveFile`: Include full active file (default: false).
- `maiide.agentActions.enabled`: Enable agent actions (default: false).

## Troubleshooting
- **Models not showing**
  - Ensure your API key is valid (run `MAIIDE: Set OpenRouter API Key`).
  - Click `MAIIDE: Refresh OpenRouter Models`.
  - Network/proxy/VPN can block calls to `https://openrouter.ai/api/v1/models`.
  - The client sends recommended headers (`Authorization`, `Accept`, `Content-Type`, `HTTP-Referer`, `X-Title`). If you forked the repo, update these in `src/api/openrouter.ts`.
- **No responses**
  - Check the Output/Developer Tools console for errors.
  - Try a simpler model (e.g., `openrouter/auto`).
- **Agent actions not working**
  - Enable `maiide.agentActions.enabled` in settings.
  - Actions are parsed from responses like [ACTION: run_command: npm install].
  - You will be prompted to confirm execution for safety.

## CI
- This repo includes a GitHub Actions workflow at `/.github/workflows/build.yml` that compiles and packages a VSIX on push to `main` and uploads it as an artifact.
