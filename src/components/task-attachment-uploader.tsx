'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image, File, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PendingFile = {
  file: File;
  previewUrl?: string;
};

export type ExistingAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedBy: { id: string; name: string };
  uploadedAt: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="size-4 text-muted-foreground" />;
  if (mimeType.startsWith('image/')) return <Image className="size-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="size-4 text-red-500" />;
  return <FileText className="size-4 text-muted-foreground" />;
}

type TaskAttachmentUploaderProps = {
  /** Existing saved attachments (for edit mode). */
  existingAttachments?: ExistingAttachment[];
  /** Called when an existing attachment should be deleted. */
  onDeleteExisting?: (attachmentId: string) => Promise<void>;
  /** Pending files staged for upload (controlled by parent). */
  pendingFiles: PendingFile[];
  /** Called when pending files list changes. */
  onPendingFilesChange: (files: PendingFile[]) => void;
  disabled?: boolean;
  /** Maximum total attachments (existing + pending). Default 10. */
  maxAttachments?: number;
};

export function TaskAttachmentUploader({
  existingAttachments = [],
  onDeleteExisting,
  pendingFiles,
  onPendingFilesChange,
  disabled = false,
  maxAttachments = 10,
}: TaskAttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const totalCount = existingAttachments.length + pendingFiles.length;
  const remaining = maxAttachments - totalCount;

  const ALLOWED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];

  function addFiles(fileList: FileList) {
    const newPending: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (newPending.length + pendingFiles.length + existingAttachments.length >= maxAttachments) break;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > 10 * 1024 * 1024) continue;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      newPending.push({ file, previewUrl });
    }
    onPendingFilesChange([...pendingFiles, ...newPending]);
  }

  function removePending(index: number) {
    const updated = pendingFiles.filter((_, i) => i !== index);
    onPendingFilesChange(updated);
  }

  async function handleDeleteExisting(id: string) {
    if (!onDeleteExisting) return;
    setDeletingId(id);
    try {
      await onDeleteExisting(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing attachments */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          {existingAttachments.map((att) => (
            <div key={att.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm">
              <FileIcon mimeType={att.fileType} />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{att.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(att.fileSize)} · {att.uploadedBy.name}
                </p>
              </div>
              <a
                href={att.filePath}
                download={att.fileName}
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Button type="button" variant="ghost" size="icon" className="size-7">
                  <Download className="size-3.5" />
                </Button>
              </a>
              {onDeleteExisting && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteExisting(att.id)}
                  disabled={disabled || deletingId === att.id}
                >
                  {deletingId === att.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending (staged) files */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((pf, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded-md border border-dashed border-primary/40 bg-primary/5 text-sm">
              {pf.previewUrl ? (
                <img src={pf.previewUrl} alt={pf.file.name} className="size-8 rounded object-cover shrink-0" />
              ) : (
                <FileIcon mimeType={pf.file.type} />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{pf.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(pf.file.size)} · Pending upload</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => removePending(index)}
                disabled={disabled}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload button */}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed transition-colors cursor-pointer text-sm text-muted-foreground',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
            disabled && 'opacity-50 pointer-events-none'
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
        >
          <Paperclip className="size-4" />
          <span>
            {remaining === maxAttachments
              ? 'Click or drag files to attach (images & documents, max 10 MB each)'
              : `Attach more files (${remaining} remaining)`}
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            disabled={disabled}
            onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ''; } }}
          />
        </div>
      )}

      {remaining === 0 && (
        <p className="text-xs text-muted-foreground text-center">Maximum {maxAttachments} attachments reached</p>
      )}
    </div>
  );
}

/**
 * Upload all pending files to the task attachment endpoint.
 * Returns the number of successfully uploaded files.
 */
export async function uploadPendingAttachments(
  taskId: string,
  pendingFiles: PendingFile[]
): Promise<number> {
  let uploaded = 0;
  for (const { file } of pendingFiles) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: 'POST', body: fd });
      if (res.ok) uploaded++;
    } catch {
      // individual upload failures are silently skipped
    }
  }
  return uploaded;
}
