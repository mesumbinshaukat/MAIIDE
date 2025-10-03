# MAIIDE OpenRouter Extension

- **Name**: MAIIDE (Mesum AI IDE)
- **Extension**: OpenRouter integration with dynamic model fetch, chat UI, and agentic system prompt.

## Features
- **Dynamic models**: Fetches available models from OpenRouter API.
- **Chat panel**: Webview chat UI that stays open beside your editor.
- **Configurable agent**: System prompt guides a review → research → code workflow.
- **Key management**: Store key in Settings or via `OPENROUTER_API_KEY` env.

## Setup
1. **Install deps**
   ```bash
   npm install
   npm run compile
   ```
2. **Configure API key**
   - VS Code Settings: `MAIIDE: Api Key`, or
   - Environment: set `OPENROUTER_API_KEY`.
3. **Run**
   - Press F5 to launch Extension Development Host.
   - Run command: `MAIIDE: Open Chat`.

## Commands
- **MAIIDE: Open Chat** — open the chat panel.
- **MAIIDE: Refresh OpenRouter Models** — refresh model list.
- **MAIIDE: Set OpenRouter API Key** — store key in settings.

## Configuration
- `maiide.apiKey`: OpenRouter API key.
- `maiide.model`: Default model id.
- `maiide.systemPrompt`: Agent system prompt.
