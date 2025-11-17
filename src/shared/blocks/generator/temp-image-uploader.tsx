'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface TempImageUploaderProps {
  value?: string; // data URL
  onChange?: (url: string | null) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  className?: string;
}

export function TempImageUploader({
  value,
  onChange,
  disabled = false,
  maxSizeMB = 10,
  className,
}: TempImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/storage/upload-image-temp', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0 || !result.data?.urls?.length) {
        throw new Error(result.message || 'Upload failed');
      }

      const dataUrl = result.data.urls[0];
      onChange?.(dataUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      onChange?.(null);
    } finally {
      setIsUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setError(null);
    onChange?.(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {!value ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={disabled || isUploading}
          className="w-full h-32 border-dashed"
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm">Click to upload image</span>
              <span className="text-xs">Max {maxSizeMB}MB</span>
            </div>
          )}
        </Button>
      ) : (
        <div className="relative group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
