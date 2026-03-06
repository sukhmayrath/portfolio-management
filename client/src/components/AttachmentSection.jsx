import { useState, useRef, useCallback } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { Upload, Paperclip, Trash2, Download, Loader2, FileText } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import ConfirmDialog from './ConfirmDialog';

function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentSection({ entityType, entityId }) {
  const { data: attachments, loading, refetch } = useApi(
    `/attachments?entity_type=${entityType}&entity_id=${entityId}`
  );
  const { mutate, loading: mutating } = useMutation();
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const uploadFile = useCallback(
    async (file) => {
      setUploading(true);
      try {
        const base64String = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            // Extract base64 portion after the data URL prefix
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        await mutate('post', '/attachments', {
          entity_type: entityType,
          entity_id: entityId,
          filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          data: base64String,
        });
        refetch();
      } catch {
        // error is surfaced via useMutation's error state
      } finally {
        setUploading(false);
      }
    },
    [entityType, entityId, mutate, refetch]
  );

  const handleFiles = useCallback(
    (files) => {
      if (!files || files.length === 0) return;
      // Upload files sequentially
      Array.from(files).forEach((file) => uploadFile(file));
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFiles]
  );

  const handleDelete = useCallback(
    async (id) => {
      await mutate('delete', `/attachments/${id}`);
      setDeleteTarget(null);
      refetch();
    },
    [mutate, refetch]
  );

  const items = attachments || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
        <Paperclip size={16} /> Attachments ({items.length})
      </h3>

      {/* Upload drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4 ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        {uploading || mutating ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-sm text-slate-500">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={24} className="text-slate-400" />
            <span className="text-sm text-slate-500">
              Drop files here or click to upload
            </span>
          </div>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-4">
          No files attached
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group"
            >
              <FileText size={18} className="text-slate-400 shrink-0" />

              <div className="flex-1 min-w-0">
                <a
                  href={`/api/attachments/${file.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline truncate block"
                >
                  {file.filename}
                </a>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{formatFileSize(file.size_bytes)}</span>
                  {file.user_name && (
                    <>
                      <span>&middot;</span>
                      <span>{file.user_name}</span>
                    </>
                  )}
                  <span>&middot;</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>
              </div>

              <a
                href={`/api/attachments/${file.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                title="Download"
              >
                <Download size={16} />
              </a>

              <button
                onClick={() => setDeleteTarget(file)}
                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${deleteTarget?.filename}"? This action cannot be undone.`}
      />
    </div>
  );
}
