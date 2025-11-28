import { LLMService } from '../src/services/llmService';

async function run() {
    console.log('Starting local LLMService fallback test (mocked)...');

    const svc = new LLMService();
    // Ensure fallback is attempted by chat logic (it checks for API key presence)
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'mock-openai-key';
    svc.setProvider('anthropic');

    // Monkeypatch callProvider to simulate primary failure then fallback success
    let callCount = 0;
    // @ts-ignore
    svc['callProvider'] = async (provider: string, systemPrompt: string, query: string) => {
        callCount++;
        if (provider === 'anthropic') {
            const err: any = new Error('MODEL_NOT_FOUND: claude-haiku-4.5 does not exist');
            throw err;
        }

        // Simulate fallback (openai) success
        return { content: 'Fallback response from openai (mocked)', provider: 'openai' };
    };

    try {
        const res = await svc.chat('Hello', 'context', 'balanced');
        console.log('LLMService.chat returned:', res);
        if (res.provider !== 'openai') {
            console.error('Expected fallback provider openai, got', res.provider);
            process.exitCode = 2;
        } else {
            console.log('Fallback behavior verified.');
        }
    } catch (e) {
        console.error('Test failed:', e);
        process.exitCode = 1;
    }
}

run();
