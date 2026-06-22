import { uploadPostImage, validatePostImageFile } from '@/services/postImageUpload';
import { createDraftPostSlug, createPostSlug } from '@/features/posts/lib/content';
import type { PostFormState } from '@/features/super-admin/lib/postFormUtils';
import Sharingan from '@/shared/loading/Sharingan';
import { ImagePlus, Pencil, Trash2, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

interface PostMetadataFieldsProps {
  form: PostFormState;
  isEditing: boolean;
  isSlugEditing: boolean;
  slugIsTaken: boolean;
  onCancelSlugEditing: () => void;
  onChange: (form: PostFormState) => void;
  onStartSlugEditing: () => void;
}

export default function PostMetadataFields({
  form,
  isEditing,
  isSlugEditing,
  slugIsTaken,
  onCancelSlugEditing,
  onChange,
  onStartSlugEditing,
}: PostMetadataFieldsProps) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isThumbnailPreviewLoading, setIsThumbnailPreviewLoading] = useState(false);
  const shouldShowThumbnailLoading = isUploadingThumbnail || isThumbnailPreviewLoading;

  async function handleThumbnailUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const validationError = validatePostImageFile(file);

    if (validationError) {
      toast.error(validationError, { id: 'post-thumbnail-upload-error' });
      setIsThumbnailPreviewLoading(false);
      return;
    }

    setIsUploadingThumbnail(true);
    setIsThumbnailPreviewLoading(true);

    try {
      const uploadedImage = await uploadPostImage(file);
      onChange({
        ...form,
        thumbnailUrl: uploadedImage.postImageUrl,
        thumbnailImageKey: uploadedImage.postImageKey,
      });
      toast.success('Đã upload thumbnail bài viết.', { id: 'post-thumbnail-upload-success' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể upload thumbnail bài viết.', {
        id: 'post-thumbnail-upload-error',
      });
      setIsThumbnailPreviewLoading(false);
    } finally {
      setIsUploadingThumbnail(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div>
          <span className="text-sm font-bold text-slate-700">Thumbnail</span>
          <div className="relative mt-1">
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleThumbnailUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={isUploadingThumbnail}
              className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400 outline-none transition-colors hover:border-violet-300 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              aria-label={form.thumbnailUrl ? 'Thay thumbnail' : 'Upload thumbnail'}
            >
              {form.thumbnailUrl ? (
                <img
                  src={form.thumbnailUrl}
                  alt=""
                  onLoad={() => setIsThumbnailPreviewLoading(false)}
                  onError={() => setIsThumbnailPreviewLoading(false)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>Chưa có thumbnail</span>
              )}
              <span
                className={`absolute inset-0 flex items-center justify-center bg-slate-950/55 text-sm font-bold text-white transition-opacity ${
                  shouldShowThumbnailLoading
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                }`}
              >
                {shouldShowThumbnailLoading ? (
                  <Sharingan size={18} label="Đang tải thumbnail" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </span>
            </button>
            {form.thumbnailUrl ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange({
                    ...form,
                    thumbnailUrl: '',
                    thumbnailImageKey: undefined,
                  });
                }}
                className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700"
                aria-label="Gỡ thumbnail"
                title="Gỡ thumbnail"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Tiêu đề <span className="text-red-600">*</span>
            </span>
            <input
              value={form.title}
              onChange={(event) => {
                const title = event.target.value;
                onChange({
                  ...form,
                  title,
                  slug: form.slug || createPostSlug(title),
                });
              }}
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-950 outline-none transition-colors focus:border-violet-500"
            />
          </label>

          <div>
            <span className="text-sm font-bold text-slate-700">
              URL <span className="text-red-600">*</span>
            </span>
            {!isEditing || isSlugEditing ? (
              <div className="mt-1 flex rounded-lg border border-slate-300 focus-within:border-violet-500">
                <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-500">
                  /posts/
                </span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      slug: createDraftPostSlug(event.target.value),
                    })
                  }
                  className={`h-11 min-w-0 flex-1 px-3 text-sm font-semibold text-slate-950 outline-none ${
                    isEditing ? '' : 'rounded-r-lg'
                  }`}
                />
                {isEditing ? (
                  <button
                    type="button"
                    onClick={onCancelSlugEditing}
                    aria-label="Hủy sửa URL"
                    title="Hủy"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-r-lg border-l border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-1 flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 pl-3">
                <a
                  href={`/posts/${form.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-violet-700 transition-colors hover:text-violet-900 hover:underline"
                >
                  posts/{form.slug}
                </a>
                <button
                  type="button"
                  onClick={onStartSlugEditing}
                  aria-label="Sửa URL"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-violet-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            {slugIsTaken ? (
              <span className="mt-1 block text-xs font-semibold text-red-600">
                URL này đã tồn tại.
              </span>
            ) : null}
          </div>

          <div>
            <span className="text-sm font-bold text-slate-700">
              Trạng thái <span className="text-red-600">*</span>
            </span>
            <div className="mt-1 grid h-11 grid-cols-2 rounded-lg border border-slate-300 bg-slate-100 p-1">
              <StatusToggleButton
                isActive={form.status === 'draft'}
                label="Nháp"
                onClick={() => onChange({ ...form, status: 'draft' })}
              />
              <StatusToggleButton
                isActive={form.status === 'published'}
                label="Đăng bài"
                onClick={() => onChange({ ...form, status: 'published' })}
              />
            </div>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              {form.status === 'published'
                ? 'Bài viết sẽ hiển thị công khai sau khi lưu.'
                : 'Bài viết chỉ lưu nội bộ và chưa hiển thị công khai.'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
interface StatusToggleButtonProps {
  isActive: boolean;
  label: string;
  onClick: () => void;
}

function StatusToggleButton({ isActive, label, onClick }: StatusToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex h-full items-center justify-center rounded-md px-2 text-sm font-bold transition-colors ${
        isActive ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </button>
  );
}
