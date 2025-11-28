import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Load the pdfjs worker from the local `pdfjs-dist` package via Vite's asset handling.
// The `?url` forces Vite to copy the file to the build assets and return its public URL.
// This avoids CORS issues that happen when loading the worker from unpkg.com.
// Note: Vite understands the `?url` suffix and will provide a string URL at runtime.
// If TypeScript complains about the import, you can add a module declaration for `*.js?url`.
// The worker is served from the public folder. Run `npm run copy-pdf-worker`
// in the `client` folder to copy the correct worker from `node_modules/pdfjs-dist` to `public/pdf.worker.min.js`.
// Prefer the module worker if present. The copy script places the worker file into `public/`.
// It may be `pdf.worker.min.mjs` or `pdf.worker.min.js` depending on the installed pdfjs-dist version.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface DocumentViewerProps {
    file: File | null;
    onTextSelect: (text: string) => void;
}

export function DocumentViewer({ file, onTextSelect }: DocumentViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            onTextSelect(selection.toString());
        }
    };

    return (
        <div className="h-full overflow-y-auto border rounded-lg bg-gray-100 p-4" onMouseUp={handleMouseUp}>
            {file ? (
                <Document file={file} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col items-center">
                    {Array.from(new Array(numPages), (_el, index) => (
                        <Page
                            key={`page_${index + 1}`}
                            pageNumber={index + 1}
                            width={400}
                            className="mb-4 shadow-md"
                        />
                    ))}
                </Document>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    No document loaded
                </div>
            )}
        </div>
    );
}
