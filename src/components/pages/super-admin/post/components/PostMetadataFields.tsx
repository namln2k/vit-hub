import { createPostSlug } from '@/api/posts';
import type { PostFormState } from '@/components/pages/super-admin/post/utils/postFormUtils';
import { Pencil, X } from 'lucide-react';

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
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Tiêu đề</span>
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
          <span className="text-sm font-bold text-slate-700">Trạng thái</span>
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

      <div className="mt-4">
        <span className="text-sm font-bold text-slate-700">URL</span>
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
                  slug: createPostSlug(event.target.value),
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
          <span className="mt-1 block text-xs font-semibold text-red-600">URL này đã tồn tại.</span>
        ) : null}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-bold text-slate-700">Mô tả ngắn</span>
        <textarea
          value={form.excerpt}
          onChange={(event) => onChange({ ...form, excerpt: event.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition-colors focus:border-violet-500"
        />
      </label>
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
