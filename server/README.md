# Server LLM Provider Configuration

This file documents environment variables used to configure the LLM provider used by the server.

Environment variables

- `LLM_PROVIDER` (optional): Which provider to use. Defaults to `anthropic`.
- `LLM_MODEL_NAME` (optional): Which model to use. Defaults to `claude-haiku-4.5` when `LLM_PROVIDER=anthropic`, otherwise `gpt-4`.
- `ANTHROPIC_API_KEY` (required for Anthropic): Your Anthropic API key if using Claude.
- `OPENAI_API_KEY` (required for OpenAI fallback): Your OpenAI API key if falling back to OpenAI.

Quick start

1. Install dependencies in the `server` folder:

```powershell
cd d:\project\llm-doc-chat\server
npm install
```

2. Add a `.env` file in the `server` folder with:

```
LLM_PROVIDER=anthropic
LLM_MODEL_NAME=claude-haiku-4.5
ANTHROPIC_API_KEY=sk-...your-anthropic-key...
```

3. Start the server (nodemon will auto-reload on changes):

```powershell
npm run dev
```

Verification

The server exposes a convenience endpoint to verify the active configuration:

GET `/api/llm-info`

Example response:

```json
{
  "provider": "anthropic",
  "model": "claude-haiku-4.5",
  "anthropicInstalled": true
}
```

If `anthropicInstalled` is `false` and `provider` shows `openai (fallback - @langchain/anthropic not installed)`, install `@langchain/anthropic` and set `ANTHROPIC_API_KEY`.
