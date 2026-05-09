'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { UploadSimple, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

interface AudioUploaderProps {
  meetingId: string;
  onUpload: (file: File) => void | Promise<void>;
  maxSizeMB?: number;
  disabled?: boolean;
}

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
          setUploadError('Tento formát zvuku zatím nepodporujeme — použijte M4A, MP3 nebo WAV.');
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

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between rounded-[8px] border border-border-subtle bg-surface px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-body font-medium text-primary">{selectedFile.name}</p>
          <p className="text-body-sm text-tertiary">{formatBytes(selectedFile.size)}</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-tertiary transition-colors hover:bg-subtle hover:text-primary"
            aria-label="Odebrat soubor"
          >
            <X size={14} weight="regular" />
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
          'flex cursor-pointer items-center gap-3 rounded-[8px] border border-dashed border-border-subtle bg-surface px-4 py-4 transition-colors',
          isDragActive && 'border-accent bg-subtle',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input {...getInputProps()} />
        <UploadSimple size={18} weight="regular" className="text-tertiary shrink-0" />
        <div className="flex flex-col gap-0.5">
          <p className="text-body text-primary">
            {isDragActive ? 'Pusťte soubor sem' : 'Přetáhněte zvuk nebo klikněte'}
          </p>
          <p className="text-body-sm text-tertiary">M4A, MP3, WAV — max {maxSizeMB} MB</p>
        </div>
      </div>

      {uploadError && <p className="text-body-sm text-error">{uploadError}</p>}
    </div>
  );
}
