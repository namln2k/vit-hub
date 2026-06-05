import { uploadPostImage, validatePostImageFile } from '@/services/postImageUpload';
import LexicalRichTextBlockEditor from '@/features/super-admin/components/post/components/rich-text/LexicalRichTextBlockEditor';
import {
  type DraftBlock,
  type DropPosition,
  getBlockTypeLabel,
} from '@/features/super-admin/lib/postFormUtils';
import Sharingan from '@/shared/loading/Sharingan';
import { GripVertical, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { toast } from 'sonner';

interface PostBlockEditorProps {
  block: DraftBlock;
  dragPosition?: DropPosition;
  isDragging: boolean;
  onChange: (block: DraftBlock) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemove: () => void;
}

export default function PostBlockEditor({
  block,
  dragPosition,
  isDragging,
  onChange,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onRemove,
}: PostBlockEditorProps) {
  const blockTypeLabel = getBlockTypeLabel(block);

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative rounded-lg border p-4 transition-colors ${
        isDragging ? 'border-violet-300 bg-violet-50/40 opacity-70' : 'border-slate-200 bg-white'
      }`}
    >
      {dragPosition === 'before' ? (
        <span className="absolute inset-x-3 -top-2 h-1 rounded-full bg-violet-500" />
      ) : null}
      {dragPosition === 'after' ? (
        <span className="absolute inset-x-3 -bottom-2 h-1 rounded-full bg-violet-500" />
      ) : null}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            draggable
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            aria-label="Kéo để di chuyển khối"
            title="Kéo để di chuyển"
            className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="truncate text-sm font-bold text-slate-500">{blockTypeLabel}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
          aria-label="Xóa khối"
          title="Xóa khối"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <PostBlockFields block={block} onChange={onChange} />
    </div>
  );
}

interface PostBlockFieldsProps {
  block: DraftBlock;
  onChange: (block: DraftBlock) => void;
}

function PostBlockFields({ block, onChange }: PostBlockFieldsProps) {
  if (block.type === 'richText') {
    return <LexicalRichTextBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'image') {
    return <ImageBlockFields block={block} onChange={onChange} />;
  }

  return null;
}

interface ImageBlockFieldsProps {
  block: Extract<DraftBlock, { type: 'image' }>;
  onChange: (block: DraftBlock) => void;
}

function ImageBlockFields({ block, onChange }: ImageBlockFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImagePreviewLoading, setIsImagePreviewLoading] = useState(false);
  const shouldShowImageLoading = isUploadingImage || isImagePreviewLoading;

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const validationError = validatePostImageFile(file);

    if (validationError) {
      toast.error(validationError, { id: 'post-image-upload-error' });
      setIsImagePreviewLoading(false);
      return;
    }

    setIsUploadingImage(true);
    setIsImagePreviewLoading(true);

    try {
      const uploadedImage = await uploadPostImage(file);
      onChange({
        ...block,
        url: uploadedImage.postImageUrl,
        postImageKey: uploadedImage.postImageKey,
        alt: block.alt || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      });
      toast.success('Đã upload ảnh bài viết.', { id: 'post-image-upload-success' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể upload ảnh bài viết.', {
        id: 'post-image-upload-error',
      });
      setIsImagePreviewLoading(false);
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">URL ảnh</span>
          <input
            value={block.url}
            onChange={(event) => {
              const nextUrl = event.target.value;
              setIsImagePreviewLoading(Boolean(nextUrl.trim()));
              onChange({ ...block, url: nextUrl });
            }}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-violet-500"
          />
        </label>
        <div className="flex items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 lg:w-auto"
          >
            {isUploadingImage ? (
              <Sharingan size={16} label="Đang upload ảnh" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isUploadingImage ? 'Đang upload' : 'Upload ảnh'}
          </button>
        </div>
      </div>
      {block.url || shouldShowImageLoading ? (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {block.url ? (
            <img
              src={block.url}
              alt={block.alt || ''}
              onLoad={() => setIsImagePreviewLoading(false)}
              onError={() => setIsImagePreviewLoading(false)}
              className="max-h-56 w-full object-cover"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center text-sm font-semibold text-slate-400">
              Đang xử lý ảnh
            </div>
          )}
          {shouldShowImageLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm">
              <Sharingan size={28} label="Đang tải ảnh bài viết" />
            </div>
          ) : null}
        </div>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
          URL khi bấm ảnh (optional)
        </span>
        <input
          value={block.linkUrl ?? ''}
          onChange={(event) => onChange({ ...block, linkUrl: event.target.value })}
          placeholder="https://example.com"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-violet-500"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Alt</span>
          <input
            value={block.alt}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-violet-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Caption</span>
          <input
            value={block.caption}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-violet-500"
          />
        </label>
      </div>
    </div>
  );
}
