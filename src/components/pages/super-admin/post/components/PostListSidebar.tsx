import type { Post } from '@/services/posts';
import Sharingan from '@/components/shared/loading/Sharingan';

interface PostListSidebarProps {
  activePostId: string;
  error: string;
  isLoading: boolean;
  posts: Post[];
  onEditPost: (post: Post) => void;
}

export default function PostListSidebar({
  activePostId,
  error,
  isLoading,
  posts,
  onEditPost,
}: PostListSidebarProps) {
  return (
    <div className="border-b border-slate-200 xl:border-b-0 xl:border-r">
      {isLoading ? (
        <div className="flex items-center gap-2 p-5 text-sm font-semibold text-slate-500">
          <Sharingan size={24} />
          Đang tải bài viết
        </div>
      ) : error ? (
        <p className="p-5 text-sm font-semibold text-red-600">{error}</p>
      ) : posts.length === 0 ? (
        <p className="p-5 text-sm font-semibold text-slate-500">Chưa có bài viết.</p>
      ) : (
        <div className="divide-y divide-slate-200">
          {posts.map((post) => (
            <PostListItem
              key={post.id}
              isActive={post.id === activePostId}
              post={post}
              onClick={() => onEditPost(post)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PostListItemProps {
  isActive: boolean;
  post: Post;
  onClick: () => void;
}

function PostListItem({ isActive, post, onClick }: PostListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-5 py-4 text-left transition-colors ${
        isActive ? 'bg-violet-50' : 'hover:bg-slate-50'
      }`}
    >
      <span className="flex gap-3">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt=""
            className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
            loading="lazy"
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-bold text-slate-950">{post.title}</span>
          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
            /posts/{post.slug}
          </span>
        </span>
      </span>
      <span
        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
          post.status === 'published'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {post.status === 'published' ? 'Đã đăng' : 'Nháp'}
      </span>
    </button>
  );
}
