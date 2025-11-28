import type { Document } from '@langchain/core/documents';

export class VectorService {
    private texts: string[] = [];

    constructor() {
        // No embeddings for simple implementation
    }

    async createStoreFromTexts(texts: string[]): Promise<void> {
        this.texts = texts;
    }

    async search(query: string, k: number = 4): Promise<Document[]> {
        // Simple implementation: return first k texts
        const selectedTexts = this.texts.slice(0, k);
        return selectedTexts.map((text, index) => ({
            pageContent: text,
            metadata: { index }
        })) as Document[];
    }
}

export const vectorService = new VectorService();
