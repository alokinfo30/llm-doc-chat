export class StorageService {
    private documents: string[] = [];

    addDocument(text: string) {
        this.documents.push(text);
    }

    getAllDocuments(): string[] {
        return this.documents;
    }

    clear() {
        this.documents = [];
    }
}

export const storageService = new StorageService();
