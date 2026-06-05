'use client';

import { getPublishedPostBySlug, type Post } from '@/services/posts';
import PostRenderer from '@/components/pages/posts/PostRenderer';
import Header from '@/components/shared/layout/Header';
import Sharingan from '@/components/shared/loading/Sharingan';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PostPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug ?? '';
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      setIsLoading(true);
      setError('');

      try {
        const nextPost = await getPublishedPostBySlug(slug);

        if (isMounted) {
          setPost(nextPost);
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : '';
          setError(message ? `Không thể tải bài viết: ${message}` : 'Không thể tải bài viết.');
          setPost(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPost();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">
            <Sharingan />
            Đang tải bài viết
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : post ? (
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8 border-b border-slate-200 pb-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <p className="text-sm font-bold uppercase tracking-wide text-violet-700">
                  Bài viết
                </p>
                <Link
                  href="/"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Trang chủ
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">{post.title}</h1>
            </div>
            {post.thumbnailUrl ? (
              <img
                src={post.thumbnailUrl}
                alt=""
                className="mb-8 aspect-video w-full rounded-lg object-cover"
              />
            ) : null}
            <PostRenderer blocks={post.content} />
          </article>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-950">Không tìm thấy bài viết</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Bài viết này chưa được đăng hoặc URL không tồn tại.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              Về trang chủ
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
