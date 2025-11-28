import express from 'express';
import { llmService } from '../services/llmService';
import { storageService } from '../services/storageService';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const docs = storageService.getAllDocuments();
        if (docs.length === 0) {
            return res.status(400).json({ error: 'No documents uploaded to summarize' });
        }

        const summary = await llmService.generateMultiDocSummary(docs);
        res.json({ summary });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

export default router;
