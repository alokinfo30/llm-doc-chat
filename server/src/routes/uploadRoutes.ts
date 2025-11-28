import express from 'express';
import multer from 'multer';
import { documentService } from '../services/documentService';
import { vectorService } from '../services/vectorService';
import { storageService } from '../services/storageService';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const text = await documentService.parsePdf(filePath);
        const chunks = await documentService.splitText(text);

        await vectorService.createStoreFromTexts(chunks);
        storageService.addDocument(text);

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({ message: 'File processed and indexed successfully', chunksCount: chunks.length, text: text.slice(0, 5000) });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

export default router;
