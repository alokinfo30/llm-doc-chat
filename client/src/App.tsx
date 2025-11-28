import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ChatInterface } from './components/ChatInterface';
import { EntityDisplay } from './components/EntityDisplay';
import { DocumentViewer } from './components/DocumentViewer';
import { Settings } from './components/Settings';
import { FileText, Sparkles } from 'lucide-react';
import axios from 'axios';

interface Entities {
  people: string[];
  places: string[];
  organizations: string[];
}

function App() {
  const [hasFile, setHasFile] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [entities, setEntities] = useState<Entities>({ people: [], places: [], organizations: [] });
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [responseStyle, setResponseStyle] = useState<string>('balanced');

  const handleSummarize = async () => {
    setLoadingSummary(true);
    try {
      const response = await axios.post('http://localhost:3000/api/summary');
      setSummary(response.data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleUploadComplete = async (text?: string, uploadedFile?: File) => {
    setHasFile(true);
    if (uploadedFile) setFile(uploadedFile);
    if (!text) return;

    setLoadingEntities(true);
    try {
      const response = await axios.post('http://localhost:3000/api/ner', { text });
      setEntities(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEntities(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b p-4 flex items-center gap-2">
        <div className="bg-primary p-2 rounded-lg">
          <FileText className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold">DocChat AI</h1>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 grid md:grid-cols-[300px_1fr] gap-6">
        <aside className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Upload Document</h2>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>

          {hasFile && (
            <div className="space-y-6">
              <div className="p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20 text-sm">
                Document uploaded successfully.
              </div>

              <div className="bg-card rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <h2 className="font-semibold">Detected Entities</h2>
                </div>
                <EntityDisplay entities={entities} loading={loadingEntities} />
              </div>

              <div className="bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <h2 className="font-semibold">Multi-Doc Summary</h2>
                  </div>
                  <button
                    onClick={handleSummarize}
                    disabled={loadingSummary}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loadingSummary ? 'Generating...' : 'Summarize All'}
                  </button>
                </div>
                {summary && (
                  <div className="text-sm text-muted-foreground leading-relaxed max-h-60 overflow-y-auto">
                    {summary}
                  </div>
                )}
              </div>

              <Settings
                responseStyle={responseStyle}
                onResponseStyleChange={setResponseStyle}
              />
            </div>
          )}
        </aside>

        <section className="h-[600px] md:h-[calc(100vh-12rem)] grid md:grid-cols-2 gap-4">
          <div className="h-full overflow-hidden border rounded-lg">
            <DocumentViewer file={file} onTextSelect={setHighlightedText} />
          </div>
          <ChatInterface highlightedText={highlightedText} responseStyle={responseStyle} />
        </section>
      </main>
    </div>
  );
}

export default App;
