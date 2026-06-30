import { useState, useRef, useCallback } from "react";
import { Camera, X, GripVertical, ImagePlus } from "lucide-react";

interface ImageUploaderProps {
  images: File[];
  previews: string[];
  maxImages?: number;
  onImagesChange: (images: File[], previews: string[]) => void;
}

const ImageUploader = ({ images, previews, maxImages = 5, onImagesChange }: ImageUploaderProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: File[]) => {
      const remaining = maxImages - images.length;
      const toAdd = files.slice(0, remaining);
      if (toAdd.length === 0) return;

      const newImages = [...images, ...toAdd];
      const newPreviews = [...previews, ...toAdd.map((f) => URL.createObjectURL(f))];
      onImagesChange(newImages, newPreviews);
    },
    [images, previews, maxImages, onImagesChange]
  );

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    onImagesChange(
      images.filter((_, i) => i !== index),
      previews.filter((_, i) => i !== index)
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files?.length) {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      addFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleReorderDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const newImages = [...images];
    const newPreviews = [...previews];
    const [movedImg] = newImages.splice(dragIndex, 1);
    const [movedPrev] = newPreviews.splice(dragIndex, 1);
    newImages.splice(targetIndex, 0, movedImg);
    newPreviews.splice(targetIndex, 0, movedPrev);
    onImagesChange(newImages, newPreviews);
    setDragIndex(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">
        Foto (deri në {maxImages})
      </label>

      {/* Drop zone */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Tërhiqni fotot këtu ose klikoni për të zgjedhur
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {images.length}/{maxImages} foto të ngarkuara
          </p>
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {previews.map((src, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleReorderDrop(i)}
              onDragEnd={() => setDragIndex(null)}
              className={`relative w-24 h-24 rounded-lg overflow-hidden glass-card group transition-transform ${
                dragIndex === i ? "opacity-50 scale-95" : ""
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />

              {/* First image badge */}
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                  Kryesore
                </span>
              )}

              {/* Grip handle */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-foreground/80 drop-shadow" />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Small add button when some images exist */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Shto</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          addFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ImageUploader;
