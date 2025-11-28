import express from 'express';
import { llmService } from '../services/llmService';
import { documentService } from '../services/documentService'; // You might need to fetch text if not passed
// Actually, for NER on the whole document, we might need the full text. 
// For now, let's assume the client might trigger this or we do it on upload.
// Better approach: Do it on upload or have a specific endpoint that takes a doc ID (if we had a DB) or just re-sends text (bad for large files).
// Since we are using memory vector store and no persistent DB for raw text in this simple prototype, 
// we might have to rely on the client sending the text or keeping it in memory in the service.
// Let's add a simple in-memory storage for the full text in DocumentService for this session.

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Limit text length for NER to avoid token limits in this demo
        const truncatedText = text.slice(0, 4000);
        const entities = await llmService.extractEntities(truncatedText);

        res.json(entities);
    } catch (error) {
        console.error('NER error:', error);
        res.status(500).json({ error: 'Failed to extract entities' });
    }
});

export default router;
