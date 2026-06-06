import { createPost, deletePost, listAdminPosts, updatePost, type Post } from '@/services/posts';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import HomeFeaturedPostsManagement from '@/features/super-admin/components/post/HomeFeaturedPostsManagement';
import PostContentBlocksEditor from '@/features/super-admin/components/post/components/PostContentBlocksEditor';
import PostListSidebar from '@/features/super-admin/components/post/components/PostListSidebar';
import PostMetadataFields from '@/features/super-admin/components/post/components/PostMetadataFields';
import {
  buildPostWrite,
  createEmptyPostForm,
  createPostBlock,
  createPostFormFromPost,
  createRichTextBlock,
  type DraftBlock,
  type DraftBlockType,
  type PostFormState,
  upsertPostByUpdatedAt,
} from '@/features/super-admin/lib/postFormUtils';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export default function PostsManagement() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') === 'featured' ? 'featured' : 'editor';

  if (activeView === 'featured') {
    return <HomeFeaturedPostsManagement />;
  }

  return <PostEditorManagement />;
}

function PostEditorManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<PostFormState>(() => createEmptyPostForm());
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const postSection = useMemo(
    () => ADMIN_SECTIONS.find((section) => section.id === 'posts') ?? ADMIN_SECTIONS[0],
    [],
  );
  const isEditing = Boolean(form.id);
  const slugIsTaken = useMemo(
    () => posts.some((post) => post.slug === form.slug && post.id !== form.id),
    [form.id, form.slug, posts],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setError('');

      try {
        const nextPosts = await listAdminPosts();

        if (isMounted) {
          setPosts(nextPosts);
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : '';
          setError(message ? `Không thể tải bài viết: ${message}` : 'Không thể tải bài viết.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  function startNewPost() {
    setForm(createEmptyPostForm());
    setIsPreviewing(false);
    setIsSlugEditing(false);
  }

  function editPost(post: Post) {
    setForm(createPostFormFromPost(post));
    setIsPreviewing(false);
    setIsSlugEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = buildPostWrite(form);
    const successMessage = isEditing ? 'Đã lưu thay đổi bài viết.' : 'Đã tạo bài viết thành công.';

    if (!input.title) {
      showSaveError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }

    if (!input.slug) {
      showSaveError('Vui lòng nhập URL duy nhất cho bài viết.');
      return;
    }

    if (slugIsTaken) {
      showSaveError('URL này đã được dùng cho một bài viết khác.');
      return;
    }

    if (input.content.length === 0) {
      showSaveError('Vui lòng thêm ít nhất một nội dung cho bài viết.');
      return;
    }

    setIsSaving(true);

    try {
      const savedPost = isEditing ? await updatePost(form.id, input) : await createPost(input);
      setPosts((currentPosts) => upsertPostByUpdatedAt(currentPosts, savedPost));
      editPost(savedPost);
      toast.success(successMessage, { id: 'post-save-success' });
    } catch (savePostError) {
      const message = getErrorMessage(savePostError);
      showSaveError(message ? `Không thể lưu bài viết: ${message}` : 'Không thể lưu bài viết.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(post: Post) {
    const shouldDelete = window.confirm(`Xóa bài viết "${post.title}"?`);

    if (!shouldDelete) {
      return;
    }

    try {
      await deletePost(post.id);
      setPosts((currentPosts) => currentPosts.filter((currentPost) => currentPost.id !== post.id));

      if (form.id === post.id) {
        startNewPost();
      }

      toast.success('Đã xóa bài viết.', { id: 'post-delete-success' });
    } catch (deleteError) {
      const message = getErrorMessage(deleteError);
      toast.error(message ? `Không thể xóa bài viết: ${message}` : 'Không thể xóa bài viết.', {
        id: 'post-delete-error',
      });
    }
  }

  function showSaveError(message: string) {
    toast.error(message, { id: 'post-save-error' });
  }

  function cancelSlugEditing() {
    const currentPost = posts.find((post) => post.id === form.id);

    if (currentPost) {
      setForm((currentForm) => ({
        ...currentForm,
        slug: currentPost.slug,
      }));
    }

    setIsSlugEditing(false);
  }

  function addBlock(type: DraftBlockType) {
    setForm((currentForm) => ({
      ...currentForm,
      content: [...currentForm.content, createPostBlock(type)],
    }));
  }

  function updateBlock(blockId: string, nextBlock: DraftBlock) {
    setForm((currentForm) => ({
      ...currentForm,
      content: currentForm.content.map((block) => (block.id === blockId ? nextBlock : block)),
    }));
  }

  function updateBlocks(nextBlocks: DraftBlock[]) {
    setForm((currentForm) => ({
      ...currentForm,
      content: nextBlocks,
    }));
  }

  function removeBlock(blockId: string) {
    setForm((currentForm) => ({
      ...currentForm,
      content:
        currentForm.content.length > 1
          ? currentForm.content.filter((block) => block.id !== blockId)
          : [createRichTextBlock()],
    }));
  }

  return (
    <AdminContentPanel
      section={postSection}
      title="Quản lý bài đăng"
      count={`${posts.length} bài viết`}
      actions={
        <button
          type="button"
          onClick={startNewPost}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Bài mới
        </button>
      }
    >
      <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
        <PostListSidebar
          activePostId={form.id}
          error={error}
          isLoading={isLoading}
          posts={posts}
          onEditPost={editPost}
        />

        <form onSubmit={handleSubmit} className="min-w-0 p-5">
          <PostMetadataFields
            form={form}
            isEditing={isEditing}
            isSlugEditing={isSlugEditing}
            slugIsTaken={slugIsTaken}
            onCancelSlugEditing={cancelSlugEditing}
            onChange={setForm}
            onStartSlugEditing={() => setIsSlugEditing(true)}
          />

          <PostContentBlocksEditor
            blocks={form.content}
            isEditing={isEditing}
            isPreviewing={isPreviewing}
            isSaving={isSaving}
            onAddBlock={addBlock}
            onChangeBlock={updateBlock}
            onChangeBlocks={updateBlocks}
            onDeleteCurrentPost={() => {
              const post = posts.find((currentPost) => currentPost.id === form.id);

              if (post) {
                void handleDelete(post);
              }
            }}
            onRemoveBlock={removeBlock}
            onTogglePreview={() => setIsPreviewing((currentValue) => !currentValue)}
          />
        </form>
      </div>
    </AdminContentPanel>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      details?: unknown;
      hint?: unknown;
      message?: unknown;
    };
    const message = typeof maybeError.message === 'string' ? maybeError.message : '';
    const details = typeof maybeError.details === 'string' ? maybeError.details : '';
    const hint = typeof maybeError.hint === 'string' ? maybeError.hint : '';
    const fullMessage = [message, details, hint].filter(Boolean).join(' ');

    if (fullMessage.includes('thumbnail_url') || fullMessage.includes('thumbnail_image_key')) {
      return 'Đã xảy ra lỗi hệ thống khi lưu thumbnail bài viết. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
    }

    return fullMessage;
  }

  return '';
}
