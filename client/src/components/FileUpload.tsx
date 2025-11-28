import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';

interface FileUploadProps {
    onUploadComplete: (text?: string, file?: File) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const response = await axios.post('http://localhost:3000/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadComplete(response.data.text, file);
        } catch (err) {
            console.error(err);
            setError('Failed to upload file');
            onUploadComplete();
        } finally {
            setUploading(false);
        }
    }, [onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
        },
        maxFiles: 1,
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                uploading && "pointer-events-none opacity-50"
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
                {uploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">
                    {uploading
                        ? "Processing PDF..."
                        : isDragActive
                            ? "Drop the PDF here"
                            : "Drag & drop a PDF here, or click to select"}
                </p>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
}
