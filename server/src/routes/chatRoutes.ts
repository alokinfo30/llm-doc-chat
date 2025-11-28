import express from 'express';
import { vectorService } from '../services/vectorService';
import { llmService } from '../services/llmService';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { message, highlightedText, responseStyle } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Analyze sentiment
        const sentiment = await llmService.analyzeSentiment(message);

        let context = '';

        if (highlightedText) {
            context = `USER HIGHLIGHTED SECTION:\n"${highlightedText}"\n\n`;
        }

        const relevantDocs = await vectorService.search(message);
        context += relevantDocs.map((doc: any) => doc.pageContent).join('\n\n');

        const llmResult = await llmService.chat(message, context, responseStyle || 'balanced', sentiment);

        res.json({ response: llmResult.content, provider: llmResult.provider, context: relevantDocs, sentiment });
    } catch (error: any) {
        console.error('Chat error:', error);

        // LangChain/OpenAI/Anthropic errors may include nested response info.
        const errMessage = error?.message || (error?.response && JSON.stringify(error.response)) || String(error);

        // Detect common rate-limit / quota messages and return a 503 with actionable advice.
        if (/(quota|rate limit|429|exceeded)/i.test(errMessage)) {
            return res.status(503).json({ error: 'LLM provider quota or rate limit exceeded. Check billing/quotas or switch providers.' });
        }

        // For other errors, return a 502 with a short message and log the details server-side.
        return res.status(502).json({ error: 'Failed to generate response from LLM provider.', details: errMessage });
    }
});

export default router;
