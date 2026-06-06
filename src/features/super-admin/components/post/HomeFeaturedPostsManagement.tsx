import { saveHomeFeaturedPostIds, type Post } from '@/services/posts';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  FeaturedPostsActions,
  FeaturedPostsPicker,
  SelectedFeaturedPostsList,
} from '@/features/super-admin/components/post/HomeFeaturedPostsManagementView';
import {
  arePostIdsEqual,
  filterPostsBySearch,
  getDefaultFeaturedPostIds,
  getLoadErrorMessage,
  getSaveErrorMessage,
  getSelectedPosts,
  loadHomeFeaturedPostsConfig,
  reorderPostIds,
} from '@/features/super-admin/components/post/homeFeaturedPostsManagementUtils';
import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { toast } from 'sonner';

const POSTS_SECTION = ADMIN_SECTIONS.find((section) => section.id === 'posts') ?? ADMIN_SECTIONS[0];
const SAVE_SUCCESS_TOAST_ID = 'home-featured-posts-save-success';
const SAVE_ERROR_TOAST_ID = 'home-featured-posts-save-error';
const DEFAULT_SUCCESS_TOAST_ID = 'home-featured-posts-default-success';
const DEFAULT_ERROR_TOAST_ID = 'home-featured-posts-default-error';

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
  const selectedPostIdSet = useMemo(() => new Set(selectedPostIds), [selectedPostIds]);
  const filteredPosts = useMemo(() => filterPostsBySearch(posts, search), [posts, search]);
  const selectedPosts = useMemo(
    () => getSelectedPosts(selectedPostIds, postById),
    [postById, selectedPostIds],
  );
  const hasChanges = useMemo(
    () => !arePostIdsEqual(selectedPostIds, savedPostIds),
    [savedPostIds, selectedPostIds],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedPostsConfig() {
      setIsLoading(true);
      setError('');

      try {
        const nextConfig = await loadHomeFeaturedPostsConfig();

        if (isMounted) {
          setPosts(nextConfig.posts);
          setSelectedPostIds(nextConfig.selectedPostIds);
          setSavedPostIds(nextConfig.selectedPostIds);
          setIsUsingDefaultSelection(nextConfig.isUsingDefaultSelection);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getLoadErrorMessage(loadError));
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

  const togglePost = useCallback((postId: string) => {
    setSelectedPostIds((currentPostIds) =>
      currentPostIds.includes(postId)
        ? currentPostIds.filter((currentPostId) => currentPostId !== postId)
        : [...currentPostIds, postId],
    );
  }, []);

  const removeSelectedPost = useCallback((postId: string) => {
    setSelectedPostIds((currentPostIds) =>
      currentPostIds.filter((currentPostId) => currentPostId !== postId),
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await saveHomeFeaturedPostIds(selectedPostIds);
      setSavedPostIds(selectedPostIds);
      setIsUsingDefaultSelection(false);
      toast.success('Đã lưu bài viết nổi bật trên trang chủ.', { id: SAVE_SUCCESS_TOAST_ID });
    } catch (saveError) {
      toast.error(
        getSaveErrorMessage(saveError, 'Không thể lưu bài viết nổi bật trên trang chủ.'),
        {
          id: SAVE_ERROR_TOAST_ID,
        },
      );
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, selectedPostIds]);

  const handleUseDefaultSelection = useCallback(async () => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await saveHomeFeaturedPostIds([]);

      const latestPostIds = getDefaultFeaturedPostIds(posts);
      setSelectedPostIds(latestPostIds);
      setSavedPostIds(latestPostIds);
      setIsUsingDefaultSelection(true);
      toast.success('Đã dùng mặc định 10 bài publish mới nhất.', { id: DEFAULT_SUCCESS_TOAST_ID });
    } catch (saveError) {
      toast.error(
        getSaveErrorMessage(saveError, 'Không thể chuyển về mặc định bài viết nổi bật.'),
        {
          id: DEFAULT_ERROR_TOAST_ID,
        },
      );
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, posts]);

  const handleDragStart = useCallback((event: DragEvent<HTMLButtonElement>, postId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', postId);
    setDraggedPostId(postId);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, postId: string) => {
      if (!draggedPostId || draggedPostId === postId) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDragTargetPostId(postId);
    },
    [draggedPostId],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPostId('');
    setDragTargetPostId('');
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, targetPostId: string) => {
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
    },
    [draggedPostId, handleDragEnd],
  );

  return (
    <AdminContentPanel
      section={POSTS_SECTION}
      title="Bài viết nổi bật trên trang chủ"
      count={`${selectedPostIds.length} bài đã chọn`}
      actions={
        <FeaturedPostsActions
          hasChanges={hasChanges}
          isLoading={isLoading}
          isSaving={isSaving}
          postsCount={posts.length}
          onSave={handleSave}
          onUseDefaultSelection={handleUseDefaultSelection}
        />
      }
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FeaturedPostsPicker
          error={error}
          filteredPosts={filteredPosts}
          isLoading={isLoading}
          isUsingDefaultSelection={isUsingDefaultSelection}
          search={search}
          selectedPostIdSet={selectedPostIdSet}
          onSearchChange={setSearch}
          onTogglePost={togglePost}
        />
        <SelectedFeaturedPostsList
          dragTargetPostId={dragTargetPostId}
          draggedPostId={draggedPostId}
          posts={selectedPosts}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onRemovePost={removeSelectedPost}
        />
      </div>
    </AdminContentPanel>
  );
}
