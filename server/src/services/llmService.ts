// touch file to force nodemon reload so LLMService picks up updated .env values
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { vectorService } from './vectorService';
import fs from 'fs';
import path from 'path';

export class LLMService {
    private preferredProvider: string;
    // simple in-memory health tracking and telemetry
    private providerHealth: Record<string, { failures: number; lastFailureAt?: number; backoffUntil?: number }> = {};
    private failureThreshold = 2; // mark unhealthy after 2 failures
    private cooldownMs = 60_000; // 60s cooldown
    private telemetryPath: string;

    constructor() {
        this.preferredProvider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
        this.telemetryPath = path.join(__dirname, '..', '..', 'server-logs', 'provider-failures.log');
        try {
            const dir = path.dirname(this.telemetryPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
            // ignore
        }
    }

    // Allow changing provider at runtime
    setProvider(provider: string, modelName?: string) {
        this.preferredProvider = provider.toLowerCase();
        if (modelName) {
            process.env.LLM_MODEL_NAME = modelName;
        }
    }

    private async callProvider(provider: string, systemPrompt: string, query: string): Promise<{ content: string; provider: string }> {
        // Check provider health before calling
        const health = this.providerHealth[provider];
        if (health && health.backoffUntil && Date.now() < health.backoffUntil) {
            throw new Error(`Provider ${provider} temporarily unhealthy (cooldown)`);
        }
        const modelName = process.env.LLM_MODEL_NAME || (provider === 'anthropic' ? 'claude-haiku-4.5' : 'gpt-3.5-turbo');

        if (provider === 'anthropic') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { ChatAnthropic } = require('@langchain/anthropic');
                const optsAny = { apiKey: process.env.ANTHROPIC_API_KEY, modelName, temperature: 0.2 };
                const client = new ChatAnthropic(optsAny);
                const response = await client.invoke([
                    new SystemMessage(systemPrompt),
                    new HumanMessage(query),
                ]);
                const content = (response as any)?.content;
                const final = typeof content === 'string' ? content : JSON.stringify(content);
                return { content: final, provider: 'anthropic' };
            } catch (err) {
                // record failure and telemetry
                this.recordProviderFailure(provider, err);
                throw err;
            }
        }

        // Default to OpenAI
        try {
            const client = new ChatOpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, modelName, temperature: 0.2 });
            const response = await client.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(query),
            ]);
            const content = (response as any)?.content;
            const final = typeof content === 'string' ? content : JSON.stringify(content);
            return { content: final, provider: 'openai' };
        } catch (err) {
            this.recordProviderFailure(provider, err);
            throw err;
        }
    }

    private recordProviderFailure(provider: string, err: any) {
        try {
            const now = Date.now();
            const health = this.providerHealth[provider] ||= { failures: 0 };
            health.failures = (health.failures || 0) + 1;
            health.lastFailureAt = now;
            if (health.failures >= this.failureThreshold) {
                health.backoffUntil = now + this.cooldownMs;
            }
            // append to telemetry log
            const line = `${new Date().toISOString()} | ${provider} | ${err?.message || String(err)}\n`;
            try {
                fs.appendFileSync(this.telemetryPath, line, 'utf8');
            } catch (e) {
                // ignore
            }
        } catch (e) {
            // ignore
        }
    }

    getHealth() {
        return { providerHealth: this.providerHealth };
    }

    async chat(query: string, context: string, responseStyle: string = 'balanced', sentiment?: { sentiment: string; confidence: number }): Promise<{ content: string; provider: string }> {
        let styleInstruction = '';

        if (responseStyle === 'concise') {
            styleInstruction = 'Provide a brief, concise answer. Keep it under 3 sentences.';
        } else if (responseStyle === 'detailed') {
            styleInstruction = 'Provide a comprehensive, detailed explanation with examples where appropriate.';
        } else {
            styleInstruction = 'Provide a balanced response that is informative but not overly verbose.';
        }

        let sentimentInstruction = '';
        if (sentiment) {
            if (sentiment.sentiment === 'confused' || sentiment.sentiment === 'frustrated') {
                sentimentInstruction = 'The user seems confused or frustrated. Be extra clear, patient, and provide step-by-step explanations if needed.';
            } else if (sentiment.sentiment === 'negative') {
                sentimentInstruction = 'The user seems to have a negative tone. Be empathetic and helpful.';
            }
        }

        const systemPrompt = `You are a helpful assistant. Use the following context to answer the user's question.

        If the answer is not in the context, say you don't know.

        CRITICAL INSTRUCTION:
        If you detect a conflict between the provided context and your internal knowledge base, you MUST acknowledge it.
        Start your response with "Discrepancy Note: [Explain the conflict]" if such a conflict exists, then proceed with the answer based on the context.
        Always prioritize the context provided for the answer, but warn the user about the conflict.

        RESPONSE STYLE: ${styleInstruction}
        ${sentimentInstruction ? `TONE ADJUSTMENT: ${sentimentInstruction}` : ''}

    Context:
    ${context}
    `;

        const primary = this.preferredProvider;
        const fallback = primary === 'anthropic' ? 'openai' : 'anthropic';

        try {
            return await this.callProvider(primary, systemPrompt, query);
        } catch (err: any) {
            const msg = err?.message || String(err);
            if (/(does not exist|MODEL_NOT_FOUND|not found|quota|rate limit|429|exceeded)/i.test(msg)) {
                if ((fallback === 'openai' && process.env.OPENAI_API_KEY) || (fallback === 'anthropic' && process.env.ANTHROPIC_API_KEY)) {
                    try {
                        console.warn(`Primary provider ${primary} failed (${msg}). Attempting fallback to ${fallback}.`);
                        return await this.callProvider(fallback, systemPrompt, query);
                    } catch (err2: any) {
                        const msg2 = err2?.message || String(err2);
                        throw new Error(`Primary error: ${msg}; Fallback error: ${msg2}`);
                    }
                }
            }

            throw err;
        }
    }

    async generateSummary(text: string): Promise<string> {
        // Dummy response for demo without OpenAI API key
        return `Summary: ${text.slice(0, 100)}... (OpenAI API not configured - using dummy response).`;
    }

    async generateMultiDocSummary(texts: string[]): Promise<string> {
        // Dummy response for demo without OpenAI API key
        return `Multi-document summary: Dummy summary for ${texts.length} texts. (OpenAI API not configured - using dummy response).`;
    }

    async extractEntities(text: string): Promise<any> {
        // Dummy response for demo without OpenAI API key
        return { people: [], places: [], organizations: [] };
    }

    async analyzeSentiment(text: string): Promise<{ sentiment: string; confidence: number }> {
        // Dummy response for demo without OpenAI API key
        return { sentiment: "neutral", confidence: 0.5 };
    }
}

export const llmService = new LLMService();
