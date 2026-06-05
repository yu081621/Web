import { useState, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, X, Image, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  bucket: string;
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  className?: string;
}

async function compressImage(file: File): Promise<Blob> {
  if (file.size <= 1024 * 1024) return file;
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1080;
      let { width, height } = img;
      if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
      else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob || file), 'image/webp', 0.8);
    };
    img.src = url;
  });
}

export default function ImageUploader({ bucket, value, onChange, maxFiles = 9, className = '' }: ImageUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const remaining = maxFiles - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (!toUpload.length) { toast.error(`最多上传 ${maxFiles} 张图片`); return; }

    setUploading(true);
    const urls: string[] = [];
    for (const file of toUpload) {
      try {
        const compressed = await compressImage(file);
        const ext = file.type === 'image/gif' ? 'gif' : 'webp';
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, compressed, { contentType: compressed.type || 'image/webp' });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
        urls.push(publicUrl);
      } catch (err) {
        toast.error(`上传失败: ${(err as Error).message}`);
      }
    }
    if (urls.length) onChange([...value, ...urls]);
    setUploading(false);
  };

  const removeImage = (idx: number) => {
    const newUrls = value.filter((_, i) => i !== idx);
    onChange(newUrls);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {value.map((url, idx) => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {value.length < maxFiles && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl flex flex-col items-center justify-center upload-zone"
          >
            {uploading ? (
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            ) : (
              <>
                <Image size={24} className="text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">点击上传</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}
