import type { Post } from '@/services/posts';
import { DEFAULT_FEATURED_POST_COUNT } from '@/features/super-admin/components/post/homeFeaturedPostsManagementUtils';
import Sharingan from '@/shared/loading/Sharingan';
import { Check, GripVertical, ImageIcon, RotateCcw, Save, Search, X } from 'lucide-react';
import type { DragEvent } from 'react';

interface FeaturedPostsActionsProps {
  hasChanges: boolean;
  isLoading: boolean;
  isSaving: boolean;
  postsCount: number;
  onSave: () => void;
  onUseDefaultSelection: () => void;
}

export function FeaturedPostsActions({
  hasChanges,
  isLoading,
  isSaving,
  postsCount,
  onSave,
  onUseDefaultSelection,
}: FeaturedPostsActionsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onUseDefaultSelection}
        disabled={isLoading || isSaving || postsCount === 0}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RotateCcw className="h-4 w-4" />
        Dùng mặc định
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isLoading || isSaving || !hasChanges}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSaving ? <Sharingan size={16} /> : <Save className="h-4 w-4" />}
        {isSaving ? 'Đang lưu' : 'Lưu cấu hình'}
      </button>
    </>
  );
}

interface FeaturedPostsPickerProps {
  error: string;
  filteredPosts: Post[];
  isLoading: boolean;
  isUsingDefaultSelection: boolean;
  search: string;
  selectedPostIdSet: Set<string>;
  onSearchChange: (search: string) => void;
  onTogglePost: (postId: string) => void;
}

export function FeaturedPostsPicker({
  error,
  filteredPosts,
  isLoading,
  isUsingDefaultSelection,
  search,
  selectedPostIdSet,
  onSearchChange,
  onTogglePost,
}: FeaturedPostsPickerProps) {
  return (
    <div className="min-w-0 border-b border-slate-200 p-5 xl:border-b-0 xl:border-r">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-950">Chọn bài viết</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isUsingDefaultSelection
              ? `Đang dùng mặc định ${DEFAULT_FEATURED_POST_COUNT} bài publish mới nhất.`
              : 'Đang dùng cấu hình đã lưu.'}
          </p>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm bài viết"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 sm:w-72"
          />
        </label>
      </div>

      <FeaturedPostsPickerBody
        error={error}
        filteredPosts={filteredPosts}
        isLoading={isLoading}
        selectedPostIdSet={selectedPostIdSet}
        onTogglePost={onTogglePost}
      />
    </div>
  );
}

interface FeaturedPostsPickerBodyProps {
  error: string;
  filteredPosts: Post[];
  isLoading: boolean;
  selectedPostIdSet: Set<string>;
  onTogglePost: (postId: string) => void;
}

function FeaturedPostsPickerBody({
  error,
  filteredPosts,
  isLoading,
  selectedPostIdSet,
  onTogglePost,
}: FeaturedPostsPickerBodyProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-5 text-sm font-semibold text-slate-500">
        <Sharingan size={18} label="Đang tải bài viết nổi bật" />
        Đang tải bài viết
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
        {error}
      </div>
    );
  }

  if (filteredPosts.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 p-5 text-sm font-semibold text-slate-500">
        Không có bài viết published phù hợp.
      </p>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {filteredPosts.map((post) => (
        <FeaturedPostOption
          key={post.id}
          post={post}
          isSelected={selectedPostIdSet.has(post.id)}
          onToggle={onTogglePost}
        />
      ))}
    </div>
  );
}

interface FeaturedPostOptionProps {
  isSelected: boolean;
  post: Post;
  onToggle: (postId: string) => void;
}

function FeaturedPostOption({ isSelected, post, onToggle }: FeaturedPostOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(post.id)}
      className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        isSelected
          ? 'border-violet-300 bg-violet-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          isSelected ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white'
        }`}
      >
        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <PostThumb post={post} />
      <PostSummary post={post} />
    </button>
  );
}

interface SelectedFeaturedPostsListProps {
  dragTargetPostId: string;
  draggedPostId: string;
  posts: Post[];
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, postId: string) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, postId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, postId: string) => void;
  onRemovePost: (postId: string) => void;
}

export function SelectedFeaturedPostsList({
  dragTargetPostId,
  draggedPostId,
  posts,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onRemovePost,
}: SelectedFeaturedPostsListProps) {
  return (
    <aside className="min-w-0 p-5">
      <h3 className="text-base font-bold text-slate-950">Thứ tự hiển thị</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        Kéo các bài đã chọn để đổi thứ tự trên trang chủ.
      </p>

      {posts.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
          Chưa chọn bài viết nào.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((post, index) => (
            <SelectedFeaturedPostItem
              key={post.id}
              dragTargetPostId={dragTargetPostId}
              draggedPostId={draggedPostId}
              index={index}
              post={post}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onRemove={onRemovePost}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

interface SelectedFeaturedPostItemProps {
  dragTargetPostId: string;
  draggedPostId: string;
  index: number;
  post: Post;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, postId: string) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, postId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, postId: string) => void;
  onRemove: (postId: string) => void;
}

function SelectedFeaturedPostItem({
  dragTargetPostId,
  draggedPostId,
  index,
  post,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onRemove,
}: SelectedFeaturedPostItemProps) {
  return (
    <div
      onDragOver={(event) => onDragOver(event, post.id)}
      onDrop={(event) => onDrop(event, post.id)}
      className={`relative flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors ${
        draggedPostId === post.id
          ? 'border-violet-300 bg-violet-50/60 opacity-70'
          : 'border-slate-200 bg-white'
      }`}
    >
      {dragTargetPostId === post.id ? (
        <span className="absolute inset-x-3 -top-2 h-1 rounded-full bg-violet-500" />
      ) : null}
      <button
        type="button"
        draggable
        onDragEnd={onDragEnd}
        onDragStart={(event) => onDragStart(event, post.id)}
        aria-label="Kéo để sắp xếp bài viết"
        title="Kéo để sắp xếp"
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <PostSummary post={post} />
      </span>
      <button
        type="button"
        onClick={() => onRemove(post.id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
        aria-label="Bỏ chọn bài viết"
        title="Bỏ chọn"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function PostThumb({ post }: { post: Post }) {
  return (
    <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-slate-400">
      {post.thumbnailUrl ? (
        <img src={post.thumbnailUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="h-5 w-5" />
      )}
    </span>
  );
}

function PostSummary({ post }: { post: Post }) {
  return (
    <span className="min-w-0">
      <span className="line-clamp-2 text-sm font-bold text-slate-950">{post.title}</span>
      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
        /posts/{post.slug}
      </span>
    </span>
  );
}
