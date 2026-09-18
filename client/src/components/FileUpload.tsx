import { useState, useCallback, useRef } from 'react';
import { Priority } from '@binaire/shared';

interface FileUploadProps {
  clientId: string;
  clientName: string;
}

export function FileUpload({ clientId, clientName }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState<Priority>(Priority.LOW);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setError(null);
    } else {
      setError('Only .csv files are accepted');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(null); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('clientId', clientId);
    fd.append('clientName', clientName);
    fd.append('priority', priority);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setFile(null);
      setPriority(Priority.LOW);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const fileSizeStr = file ? (file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`) : '';

  return (
    <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">New Task</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setPriority(Priority.LOW)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${priority === Priority.LOW ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Standard
          </button>
          <button
            onClick={() => setPriority(Priority.HIGH)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${priority === Priority.HIGH ? 'bg-amber-dim text-amber' : 'text-text-muted hover:text-text-secondary'}`}
          >
            High
          </button>
        </div>
      </div>

      {!file ? (
        <div
          className={`relative p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'bg-accent-dim' : 'hover:bg-bg-elevated/50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted mb-3">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-text-secondary">Drop CSV here or click to browse</p>
          <p className="text-xs text-text-muted mt-1">Max 50MB</p>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-md bg-accent-dim flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-text-muted">{fileSizeStr}</p>
            </div>
            <button onClick={clearFile} className="text-text-muted hover:text-text-secondary p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-2 text-sm font-medium rounded-md bg-accent text-bg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Submit to Queue'}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red bg-red-dim px-3 py-2 rounded-md">{error}</p>
        </div>
      )}
    </div>
  );
}
