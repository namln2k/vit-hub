import {
  getHomeFeaturedPostIds,
  listPublishedPostsForFeaturedSelection,
  saveHomeFeaturedPostIds,
  type Post,
} from '@/services/posts';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import Sharingan from '@/shared/loading/Sharingan';
import { Check, GripVertical, ImageIcon, RotateCcw, Save, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { toast } from 'sonner';

const POSTS_SECTION = ADMIN_SECTIONS.find((section) => section.id === 'posts') ?? ADMIN_SECTIONS[0];
const DEFAULT_FEATURED_POST_COUNT = 10;

export default function HomeFeaturedPostsManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [isUsingDefaultSelection, setIsUsingDefaultSelection] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [draggedPostId, setDraggedPostId] = useState('');
  const [dragTargetPostId, setDragTargetPostId] = useState('');

  const postById = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts]);
  const filteredPosts = useMemo(() => {
    const query = normalizeSearchValue(search);

    if (!query) {
      return posts;
    }

    return posts.filter((post) =>
      [post.title, post.slug].some((value) => normalizeSearchValue(value).includes(query)),
    );
  }, [posts, search]);
  const selectedPosts = useMemo(
    () =>
      selectedPostIds
        .map((postId) => postById.get(postId))
        .filter((post): post is Post => Boolean(post)),
    [postById, selectedPostIds],
  );
  const hasChanges = useMemo(
    () => selectedPostIds.join('|') !== savedPostIds.join('|'),
    [savedPostIds, selectedPostIds],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedPostsConfig() {
      setIsLoading(true);
      setError('');

      try {
        const [publishedPosts, configuredPostIds] = await Promise.all([
          listPublishedPostsForFeaturedSelection(),
          getHomeFeaturedPostIds(),
        ]);
        const publishedPostIdSet = new Set(publishedPosts.map((post) => post.id));
        const nextSelectedPostIds =
          configuredPostIds.length > 0
            ? configuredPostIds.filter((postId) => publishedPostIdSet.has(postId))
            : publishedPosts.slice(0, DEFAULT_FEATURED_POST_COUNT).map((post) => post.id);

        if (isMounted) {
          setPosts(publishedPosts);
          setSelectedPostIds(nextSelectedPostIds);
          setSavedPostIds(nextSelectedPostIds);
          setIsUsingDefaultSelection(configuredPostIds.length === 0);
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : '';
          setError(
            message
              ? `Không thể tải cấu hình bài viết nổi bật: ${message}`
              : 'Không thể tải cấu hình bài viết nổi bật.',
          );
          setPosts([]);
          setSelectedPostIds([]);
          setSavedPostIds([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFeaturedPostsConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  function togglePost(postId: string) {
    setSelectedPostIds((currentPostIds) =>
      currentPostIds.includes(postId)
        ? currentPostIds.filter((currentPostId) => currentPostId !== postId)
        : [...currentPostIds, postId],
    );
  }

  function removeSelectedPost(postId: string) {
    setSelectedPostIds((currentPostIds) =>
      currentPostIds.filter((currentPostId) => currentPostId !== postId),
    );
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await saveHomeFeaturedPostIds(selectedPostIds);
      setSavedPostIds(selectedPostIds);
      setIsUsingDefaultSelection(false);
      toast.success('Đã lưu bài viết nổi bật trên trang chủ.', {
        id: 'home-featured-posts-save-success',
      });
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : 'Không thể lưu bài viết nổi bật trên trang chủ.',
        { id: 'home-featured-posts-save-error' },
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUseDefaultSelection() {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await saveHomeFeaturedPostIds([]);

      const latestPostIds = posts.slice(0, DEFAULT_FEATURED_POST_COUNT).map((post) => post.id);
      setSelectedPostIds(latestPostIds);
      setSavedPostIds(latestPostIds);
      setIsUsingDefaultSelection(true);
      toast.success('Đã dùng mặc định 10 bài publish mới nhất.', {
        id: 'home-featured-posts-default-success',
      });
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : 'Không thể chuyển về mặc định bài viết nổi bật.',
        { id: 'home-featured-posts-default-error' },
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, postId: string) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', postId);
    setDraggedPostId(postId);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, postId: string) {
    if (!draggedPostId || draggedPostId === postId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragTargetPostId(postId);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetPostId: string) {
    const sourcePostId = event.dataTransfer.getData('text/plain') || draggedPostId;

    if (!sourcePostId || sourcePostId === targetPostId) {
      handleDragEnd();
      return;
    }

    event.preventDefault();
    setSelectedPostIds((currentPostIds) =>
      reorderPostIds(currentPostIds, sourcePostId, targetPostId),
    );
    handleDragEnd();
  }

  function handleDragEnd() {
    setDraggedPostId('');
    setDragTargetPostId('');
  }

  return (
    <AdminContentPanel
      section={POSTS_SECTION}
      title="Bài viết nổi bật trên trang chủ"
      count={`${selectedPostIds.length} bài đã chọn`}
      actions={
        <>
          <button
            type="button"
            onClick={handleUseDefaultSelection}
            disabled={isLoading || isSaving || posts.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Dùng mặc định
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving || !hasChanges}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? <Sharingan size={16} /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Đang lưu' : 'Lưu cấu hình'}
          </button>
        </>
      }
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm bài viết"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 sm:w-72"
              />
            </label>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-5 text-sm font-semibold text-slate-500">
              <Sharingan size={18} label="Đang tải bài viết nổi bật" />
              Đang tải bài viết
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : filteredPosts.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-5 text-sm font-semibold text-slate-500">
              Không có bài viết published phù hợp.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredPosts.map((post) => {
                const isSelected = selectedPostIds.includes(post.id);

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => togglePost(post.id)}
                    className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <PostThumb post={post} />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-bold text-slate-950">
                        {post.title}
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                        /posts/{post.slug}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="min-w-0 p-5">
          <h3 className="text-base font-bold text-slate-950">Thứ tự hiển thị</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Kéo các bài đã chọn để đổi thứ tự trên trang chủ.
          </p>

          {selectedPosts.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
              Chưa chọn bài viết nào.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedPosts.map((post, index) => (
                <div
                  key={post.id}
                  onDragOver={(event) => handleDragOver(event, post.id)}
                  onDrop={(event) => handleDrop(event, post.id)}
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
                    onDragEnd={handleDragEnd}
                    onDragStart={(event) => handleDragStart(event, post.id)}
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
                    <span className="line-clamp-2 text-sm font-bold text-slate-950">
                      {post.title}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                      /posts/{post.slug}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelectedPost(post.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                    aria-label="Bỏ chọn bài viết"
                    title="Bỏ chọn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </AdminContentPanel>
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

function reorderPostIds(postIds: string[], sourcePostId: string, targetPostId: string) {
  const sourceIndex = postIds.indexOf(sourcePostId);
  const targetIndex = postIds.indexOf(targetPostId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return postIds;
  }

  const nextPostIds = [...postIds];
  const [sourcePost] = nextPostIds.splice(sourceIndex, 1);
  nextPostIds.splice(targetIndex, 0, sourcePost);

  return nextPostIds;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
