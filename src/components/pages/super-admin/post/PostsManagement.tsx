import {
  createPost,
  createPostSlug,
  deletePost,
  listAdminPosts,
  updatePost,
  type Post,
  type PostContentBlock,
  type PostStatus,
  type PostWrite,
} from '@/api/posts';
import { uploadPostImage, validatePostImageFile } from '@/api/postImageUpload';
import AdminContentPanel from '@/components/pages/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/pages/super-admin/common/AdminSections';
import PostRenderer from '@/components/pages/posts/PostRenderer';
import Sharingan from '@/components/shared/loading/Sharingan';
import {
  Eye,
  ImagePlus,
  List,
  Newspaper,
  Pencil,
  Plus,
  Save,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from 'react';
import { toast } from 'sonner';

type DraftBlock = PostContentBlock;

interface PostFormState {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: PostStatus;
  content: DraftBlock[];
}

const emptyForm: PostFormState = {
  id: '',
  title: '',
  slug: '',
  excerpt: '',
  status: 'draft',
  content: [createParagraphBlock()],
};

export default function PostsManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState<PostFormState>(emptyForm);
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
    setForm({
      ...emptyForm,
      content: [createParagraphBlock()],
    });
    setSaveError('');
    setIsPreviewing(false);
    setIsSlugEditing(false);
  }

  function editPost(post: Post) {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      content: post.content.length > 0 ? post.content : [createParagraphBlock()],
    });
    setSaveError('');
    setIsPreviewing(false);
    setIsSlugEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError('');

    const input = buildPostWrite(form);
    const successMessage = isEditing
      ? 'Đã lưu thay đổi bài viết.'
      : 'Đã tạo bài viết thành công.';

    if (!input.title) {
      setSaveError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }

    if (!input.slug) {
      setSaveError('Vui lòng nhập URL duy nhất cho bài viết.');
      return;
    }

    if (slugIsTaken) {
      setSaveError('URL này đã được dùng cho một bài viết khác.');
      return;
    }

    if (input.content.length === 0) {
      setSaveError('Vui lòng thêm ít nhất một nội dung cho bài viết.');
      return;
    }

    setIsSaving(true);

    try {
      const savedPost = isEditing ? await updatePost(form.id, input) : await createPost(input);
      setPosts((currentPosts) =>
        [savedPost, ...currentPosts.filter((post) => post.id !== savedPost.id)].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
      editPost(savedPost);
      toast.success(successMessage);
    } catch (savePostError) {
      const message = savePostError instanceof Error ? savePostError.message : '';
      setSaveError(message ? `Không thể lưu bài viết: ${message}` : 'Không thể lưu bài viết.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(post: Post) {
    const shouldDelete = window.confirm(`Xóa bài viết "${post.title}"?`);

    if (!shouldDelete) {
      return;
    }

    setSaveError('');

    try {
      await deletePost(post.id);
      setPosts((currentPosts) => currentPosts.filter((currentPost) => currentPost.id !== post.id));

      if (form.id === post.id) {
        startNewPost();
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : '';
      setSaveError(message ? `Không thể xóa bài viết: ${message}` : 'Không thể xóa bài viết.');
    }
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
              {posts.map((post) => {
                const isActive = post.id === form.id;

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => editPost(post)}
                    className={`block w-full px-5 py-4 text-left transition-colors ${
                      isActive ? 'bg-violet-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="line-clamp-2 text-sm font-bold text-slate-950">
                      {post.title}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                      /posts/{post.slug}
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
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="min-w-0 p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Tiêu đề</span>
              <input
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((currentForm) => ({
                    ...currentForm,
                    title,
                    slug: currentForm.slug || createPostSlug(title),
                  }));
                }}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-950 outline-none transition-colors focus:border-violet-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Trạng thái</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    status: event.target.value as PostStatus,
                  }))
                }
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition-colors focus:border-violet-500"
              >
                <option value="draft">Nháp</option>
                <option value="published">Đăng bài</option>
              </select>
            </label>
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
                    setForm((currentForm) => ({
                      ...currentForm,
                      slug: createPostSlug(event.target.value),
                    }))
                  }
                  className={`h-11 min-w-0 flex-1 px-3 text-sm font-semibold text-slate-950 outline-none ${
                    isEditing ? '' : 'rounded-r-lg'
                  }`}
                />
                {isEditing ? (
                  <button
                    type="button"
                    onClick={cancelSlugEditing}
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
                  onClick={() => setIsSlugEditing(true)}
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

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-700">Mô tả ngắn</span>
            <textarea
              value={form.excerpt}
              onChange={(event) =>
                setForm((currentForm) => ({ ...currentForm, excerpt: event.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition-colors focus:border-violet-500"
            />
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Thêm khối:</span>{' '}
            <div className="flex flex-wrap items-center gap-2">
              <EditorButton icon={<Type />} label="Tiêu đề" onClick={() => addBlock('heading')} />
              <EditorButton
                icon={<Newspaper />}
                label="Đoạn text"
                onClick={() => addBlock('paragraph')}
              />
              <EditorButton icon={<List />} label="Bullet list" onClick={() => addBlock('list')} />
              <EditorButton icon={<ImagePlus />} label="Ảnh" onClick={() => addBlock('image')} />
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewing((currentValue) => !currentValue)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100 sm:ml-auto"
            >
              <Eye className="h-4 w-4" />
              {isPreviewing ? 'Soạn thảo' : 'Xem trước'}
            </button>
          </div>

          {isPreviewing ? (
            <div className="mt-5 rounded-lg border border-slate-200 p-5">
              <PostRenderer blocks={form.content} />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {form.content.map((block) => (
                <PostBlockEditor
                  key={block.id}
                  block={block}
                  onChange={(nextBlock) => updateBlock(block.id, nextBlock)}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}
            </div>
          )}

          {saveError ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {saveError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
            {isEditing ? (
              <button
                type="button"
                onClick={() => {
                  const post = posts.find((currentPost) => currentPost.id === form.id);

                  if (post) {
                    void handleDelete(post);
                  }
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Xóa bài
              </button>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSaving ? <Sharingan size={16} /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Đang lưu' : isEditing ? 'Lưu thay đổi' : 'Tạo bài viết'}
            </button>
          </div>
        </form>
      </div>
    </AdminContentPanel>
  );

  function addBlock(type: PostContentBlock['type']) {
    const block =
      type === 'heading'
        ? createHeadingBlock()
        : type === 'list'
          ? createListBlock()
          : type === 'image'
            ? createImageBlock()
            : createParagraphBlock();

    setForm((currentForm) => ({
      ...currentForm,
      content: [...currentForm.content, block],
    }));
  }

  function updateBlock(blockId: string, nextBlock: DraftBlock) {
    setForm((currentForm) => ({
      ...currentForm,
      content: currentForm.content.map((block) => (block.id === blockId ? nextBlock : block)),
    }));
  }

  function removeBlock(blockId: string) {
    setForm((currentForm) => ({
      ...currentForm,
      content:
        currentForm.content.length > 1
          ? currentForm.content.filter((block) => block.id !== blockId)
          : [createParagraphBlock()],
    }));
  }
}

interface EditorButtonProps {
  icon: ReactElement;
  label: string;
  onClick: () => void;
}

function EditorButton({ icon, label, onClick }: EditorButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  );
}

interface PostBlockEditorProps {
  block: DraftBlock;
  onChange: (block: DraftBlock) => void;
  onRemove: () => void;
}

function PostBlockEditor({ block, onChange, onRemove }: PostBlockEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const blockTypeLabel = getBlockTypeLabel(block);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || block.type !== 'image') {
      return;
    }

    const validationError = validatePostImageFile(file);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError('');
    setIsUploadingImage(true);

    try {
      const uploadedImage = await uploadPostImage(file);
      onChange({
        ...block,
        url: uploadedImage.postImageUrl,
        postImageKey: uploadedImage.postImageKey,
        alt: block.alt || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Không thể upload ảnh bài viết.');
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-500">{blockTypeLabel}</span>
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

      {block.type === 'heading' ? (
        <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <select
            value={block.level}
            onChange={(event) =>
              onChange({ ...block, level: Number(event.target.value) as 1 | 2 | 3 })
            }
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-violet-500"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-950 outline-none focus:border-violet-500"
          />
        </div>
      ) : null}

      {block.type === 'paragraph' ? (
        <textarea
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-violet-500"
        />
      ) : null}

      {block.type === 'list' ? (
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Mỗi dòng là một bullet point
          </span>
          <textarea
            value={block.items.join('\n')}
            onChange={(event) =>
              onChange({
                ...block,
                items: event.target.value.split('\n'),
              })
            }
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-violet-500"
          />
        </label>
      ) : null}

      {block.type === 'image' ? (
        <div className="space-y-3">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">URL</span>
              <input
                value={block.url}
                onChange={(event) => onChange({ ...block, url: event.target.value })}
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
          {block.url ? (
            <img
              src={block.url}
              alt={block.alt || ''}
              className="max-h-56 w-full rounded-lg border border-slate-200 object-cover"
            />
          ) : null}
          {uploadError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {uploadError}
            </p>
          ) : null}
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
      ) : null}
    </div>
  );
}

function getBlockTypeLabel(block: DraftBlock) {
  if (block.type === 'heading') {
    return `H${block.level}`;
  }

  if (block.type === 'image') {
    return 'Ảnh';
  }

  if (block.type === 'list') {
    return 'Bullet list';
  }

  return 'Đoạn text';
}

function buildPostWrite(form: PostFormState): PostWrite {
  return {
    title: form.title.trim(),
    slug: createPostSlug(form.slug),
    excerpt: form.excerpt.trim(),
    status: form.status,
    content: form.content,
  };
}

function createBlockId() {
  return crypto.randomUUID();
}

function createHeadingBlock(): DraftBlock {
  return {
    id: createBlockId(),
    type: 'heading',
    level: 2,
    text: '',
  };
}

function createParagraphBlock(): DraftBlock {
  return {
    id: createBlockId(),
    type: 'paragraph',
    text: '',
  };
}

function createListBlock(): DraftBlock {
  return {
    id: createBlockId(),
    type: 'list',
    items: [''],
  };
}

function createImageBlock(): DraftBlock {
  return {
    id: createBlockId(),
    type: 'image',
    url: '',
    alt: '',
    caption: '',
  };
}
