'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AudioUploaderProps {
  meetingId: string;
  onUpload: (file: File) => void | Promise<void>;
  maxSizeMB?: number;
  disabled?: boolean;
}

// Accepted MIME types that Whisper handles natively
const ACCEPTED_MIME: Record<string, string[]> = {
  'audio/m4a': ['.m4a'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/wav': ['.wav'],
  'audio/wave': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/mpeg': ['.mp3'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AudioUploader({
  meetingId: _meetingId,
  onUpload,
  maxSizeMB = 50,
  disabled = false,
}: AudioUploaderProps): React.ReactElement {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setUploadError(null);

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError.code === 'file-too-large') {
          setUploadError(`Soubor je příliš velký (max ${maxSizeMB} MB).`);
        } else {
          setUploadError(
            'Tento formát zvuku zatím nepodporujeme — použijte M4A, MP3 nebo WAV.',
          );
        }
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setSelectedFile(file);
      void onUpload(file);
    },
    [onUpload, maxSizeMB],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    maxSize: maxSizeBytes,
    maxFiles: 1,
    disabled,
    multiple: false,
  });

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedFile(null);
    setUploadError(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-tertiary px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] font-medium text-text-primary">{selectedFile.name}</p>
          <p className="text-xs text-text-tertiary">{formatBytes(selectedFile.size)}</p>
        </div>
        {!disabled && (
          <button
            onClick={handleRemove}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            aria-label="Odebrat soubor"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-subtle bg-bg-tertiary px-8 py-12 text-center transition-colors',
          isDragActive && 'border-accent bg-bg-secondary',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input {...getInputProps()} />

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary">
          <UploadCloud className="h-5 w-5 text-text-tertiary" />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-medium text-text-primary">
            {isDragActive
              ? 'Pusťte soubor sem'
              : 'Přetáhněte zvukový soubor sem nebo klikněte pro výběr'}
          </p>
          <p className="text-[13px] text-text-tertiary">
            M4A, MP3, WAV — max {maxSizeMB} MB
          </p>
        </div>
      </div>

      {uploadError && (
        <p className="text-[13px] text-error">{uploadError}</p>
      )}
    </div>
  );
}
