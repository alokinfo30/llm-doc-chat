import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// touch file to trigger nodemon restart when .env changes
// restart trigger
import uploadRoutes from './routes/uploadRoutes';
import chatRoutes from './routes/chatRoutes';
import nerRoutes from './routes/nerRoutes';
import summaryRoutes from './routes/summaryRoutes';
import { llmService } from './services/llmService';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ner', nerRoutes);
app.use('/api/summary', summaryRoutes);

app.get('/health', (req, res) => {
    res.send('Server is healthy');
});

// Returns which LLM provider and model the server is configured to use
app.get('/api/llm-info', (req, res) => {
    const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
    const model = process.env.LLM_MODEL_NAME || (provider === 'anthropic' ? 'claude-haiku-4.5' : 'gpt-4');

    let anthropicInstalled = false;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require.resolve('@langchain/anthropic');
        anthropicInstalled = true;
    } catch (e) {
        anthropicInstalled = false;
    }

    const activeProvider = provider === 'anthropic' && !anthropicInstalled ? 'openai (fallback - @langchain/anthropic not installed)' : provider;

    res.json({ provider: activeProvider, model, anthropicInstalled });
});

// Convenience endpoint to run a quick test chat. Only runs if the appropriate API key is present.
app.post('/api/test-chat', async (req, res) => {
    try {
        const message = req.body?.message || 'Say hello in one short sentence.';

        // Ensure at least one API key exists
        if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
            return res.status(400).json({ error: 'No LLM API keys set. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in server/.env to run this test.' });
        }

        // Use llmService.chat so fallback logic is applied and provider metadata is returned
        try {
            const result = await llmService.chat(message, '', 'balanced');
            const modelName = process.env.LLM_MODEL_NAME || (result.provider === 'anthropic' ? 'claude-haiku-4.5' : 'gpt-4');
            res.json({ ok: true, response: result.content, provider: result.provider, model: modelName });
        } catch (e: any) {
            console.error('Test chat failed via llmService:', e);
            const details = e?.message || String(e);
            return res.status(500).json({ error: 'Test chat failed', details });
        }
    } catch (err) {
        console.error('Test chat error:', err);
        res.status(500).json({ error: 'Test chat failed', details: err instanceof Error ? err.message : String(err) });
    }
});

// Admin endpoint to change LLM provider and model at runtime.
// WARNING: This endpoint is unauthenticated in this demo. Do NOT expose in production.
app.post('/api/admin/provider', (req, res) => {
    try {
        const { provider, modelName } = req.body || {};
        if (!provider) return res.status(400).json({ error: 'provider is required' });

        // Update llmService runtime config
        try {
            llmService.setProvider(provider, modelName);
        } catch (e) {
            console.error('Failed to set provider:', e);
            return res.status(500).json({ error: 'Failed to set provider', details: String(e) });
        }

    // Optionally return persistence instructions instead of writing the file.
        try {
            const persistRequested = !!req.body?.persist;
            const modelToSet = modelName || process.env.LLM_MODEL_NAME || '';
            if (persistRequested) {
                // Return PowerShell and POSIX snippets to persist changes locally (no auto-write).
                const ps = [] as string[];
                ps.push(`# Append or update .env in server folder (PowerShell)`);
                ps.push(`$envFile = Join-Path -Path (Join-Path ${JSON.stringify(path.join(__dirname, '..'))}) -ChildPath '.env'`);
                if (provider) ps.push(`(Get-Content $envFile -ErrorAction SilentlyContinue) -replace '^LLM_PROVIDER=.*', 'LLM_PROVIDER=${provider.toLowerCase()}' | Set-Content $envFile`);
                if (modelToSet) ps.push(`(Get-Content $envFile -ErrorAction SilentlyContinue) -replace '^LLM_MODEL_NAME=.*', 'LLM_MODEL_NAME=${modelToSet}' | Set-Content $envFile`);
                ps.push(`# If the above replace fails (file missing), run:`);
                ps.push(`Add-Content -Path $envFile -Value "LLM_PROVIDER=${provider.toLowerCase()}"`);
                if (modelToSet) ps.push(`Add-Content -Path $envFile -Value "LLM_MODEL_NAME=${modelToSet}"`);

                const sh = [] as string[];
                sh.push(`# Append or update .env in server folder (sh)`);
                sh.push(`ENV_FILE="${path.join(__dirname, '..', '.env')}"`);
                sh.push(`grep -q '^LLM_PROVIDER=' "$ENV_FILE" 2>/dev/null && sed -i "s/^LLM_PROVIDER=.*/LLM_PROVIDER=${provider.toLowerCase()}/" "$ENV_FILE" || echo "LLM_PROVIDER=${provider.toLowerCase()}" >> "$ENV_FILE"`);
                if (modelToSet) {
                    sh.push(`grep -q '^LLM_MODEL_NAME=' "$ENV_FILE" 2>/dev/null && sed -i "s/^LLM_MODEL_NAME=.*/LLM_MODEL_NAME=${modelToSet}/" "$ENV_FILE" || echo "LLM_MODEL_NAME=${modelToSet}" >> "$ENV_FILE"`);
                }

                return res.json({ ok: true, provider: provider.toLowerCase(), modelName: modelToSet || null, persist: true, persistenceCommands: { powershell: ps.join('\n'), sh: sh.join('\n') } });
            }

            // If persist not requested, return success without writing to disk
            return res.json({ ok: true, provider: provider.toLowerCase(), modelName: modelToSet || null, persist: false, message: 'Provider updated in runtime only. To persist, call this endpoint with { persist: true }.' });
        } catch (e) {
            console.error('Failed to prepare persistence instructions:', e);
            return res.json({ ok: true, provider: provider.toLowerCase(), modelName: modelName || process.env.LLM_MODEL_NAME, persist: false });
        }
    } catch (err) {
        console.error('Admin provider error:', err);
        res.status(500).json({ error: 'Failed to set provider' });
    }
});

// Admin route to retrieve provider health/telemetry
app.get('/api/admin/provider-stats', (req, res) => {
    try {
        const health = llmService.getHealth();
        // try to include tail of telemetry file
        const telemetryPath = path.join(__dirname, '..', 'server-logs', 'provider-failures.log');
        let tail = '';
        try {
            if (fs.existsSync(telemetryPath)) {
                const data = fs.readFileSync(telemetryPath, 'utf8');
                const lines = data.split(/\r?\n/).filter(Boolean);
                tail = lines.slice(-50).join('\n');
            }
        } catch (e) {
            // ignore
        }

        res.json({ health, telemetryTail: tail });
    } catch (e) {
        res.status(500).json({ error: 'Failed to read provider stats' });
    }
});

export default app;
