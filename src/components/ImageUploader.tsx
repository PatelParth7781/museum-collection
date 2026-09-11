import { useState, useRef, useCallback } from 'react';
import { Upload, X, Star, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { ArtifactImage } from '@/types';

export function ImageUploader({
  artifactId,
  images,
  onImagesChanged,
}: {
  artifactId: string;
  images: ArtifactImage[];
  onImagesChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFiles = useCallback(
    async (files: FileList) => {
      if (!files.length) return;
      setUploading(true);
      let successCount = 0;
      let failCount = 0;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          failCount++;
          continue;
        }
        const ext = file.name.split('.').pop();
        const fileName = `${artifactId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('artifacts')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          failCount++;
          continue;
        }

        const { data: urlData } = supabase.storage.from('artifacts').getPublicUrl(fileName);
        const imageUrl = urlData.publicUrl;

        const isFirst = images.length === 0 && successCount === 0;
        const { error: dbError } = await supabase.from('artifact_images').insert({
          artifact_id: artifactId,
          image_url: imageUrl,
          caption: '',
          is_primary: isFirst,
        });

        if (dbError) {
          failCount++;
        } else {
          successCount++;
        }
      }

      setUploading(false);
      if (successCount > 0) toast(`${successCount} image(s) uploaded`, 'success');
      if (failCount > 0) toast(`${failCount} image(s) failed to upload`, 'error');
      onImagesChanged();
    },
    [artifactId, images.length, onImagesChanged, toast]
  );

  const setPrimary = async (imageId: string) => {
    await supabase
      .from('artifact_images')
      .update({ is_primary: false })
      .eq('artifact_id', artifactId);
    await supabase
      .from('artifact_images')
      .update({ is_primary: true })
      .eq('id', imageId);
    onImagesChanged();
    toast('Primary image updated', 'success');
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    const filePath = imageUrl.split('/artifacts/')[1];
    if (filePath) {
      await supabase.storage.from('artifacts').remove([filePath]);
    }
    await supabase.from('artifact_images').delete().eq('id', imageId);
    onImagesChanged();
    toast('Image removed', 'info');
  };

  const updateCaption = async (imageId: string, caption: string) => {
    await supabase.from('artifact_images').update({ caption }).eq('id', imageId);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-amber-500 bg-amber-50' : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-stone-400" size={32} />
            <p className="text-sm text-stone-500">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-stone-100 rounded-full">
              <Upload size={28} className="text-stone-500" />
            </div>
            <p className="text-sm font-medium text-stone-700">Drag and drop images here</p>
            <p className="text-xs text-stone-400">or click to browse — multiple files supported</p>
          </div>
        )}
      </div>

      {/* Existing images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-stone-200">
              <div className="aspect-square bg-stone-100">
                <img src={img.image_url} alt={img.caption || 'Artifact image'} className="w-full h-full object-cover" />
              </div>
              {img.is_primary && (
                <span className="absolute top-2 left-2 badge bg-amber-500 text-white">Primary</span>
              )}
              <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {!img.is_primary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimary(img.id);
                    }}
                    className="p-2 bg-white/90 rounded-full text-stone-700 hover:bg-white"
                    aria-label="Set as primary"
                    title="Set as primary"
                  >
                    <Star size={16} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteImage(img.id, img.image_url);
                  }}
                  className="p-2 bg-white/90 rounded-full text-red-600 hover:bg-white"
                  aria-label="Delete image"
                  title="Delete image"
                >
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                defaultValue={img.caption}
                placeholder="Add caption..."
                onBlur={(e) => updateCaption(img.id, e.target.value)}
                className="w-full px-2 py-1.5 text-xs border-t border-stone-200 bg-white text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          ))}
        </div>
      )}
      {images.length === 0 && !uploading && (
        <div className="flex flex-col items-center py-6 text-stone-400">
          <ImageIcon size={32} strokeWidth={1.5} />
          <p className="text-sm mt-2">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}
