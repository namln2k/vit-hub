'use client';

import { getPostPath } from '@/constants/routes';
import type { PublicPostDto } from '@/features/posts/types';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';

function formatPostUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

interface FeaturedPostCardProps {
  post: PublicPostDto;
  onPostClick: (event: MouseEvent<HTMLAnchorElement>, slug: string) => void;
}

function FeaturedPostCard({ post, onPostClick }: FeaturedPostCardProps) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      onClick={(event) => onPostClick(event, post.slug)}
      className="group flex w-[76vw] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md sm:w-[25.2rem] lg:w-[21.6rem]"
    >
      <div className="aspect-16/10 bg-slate-100">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-950 group-hover:text-cyan-700">
          {post.title}
        </h3>
        <p className="mt-auto pt-3 text-right text-xs font-semibold text-slate-500">
          {formatPostUpdatedAt(post.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

export default function FeaturedPostsSection({
  featuredPosts,
}: {
  featuredPosts: PublicPostDto[];
}) {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activePostIndex, setActivePostIndex] = useState(0);

  const scrollToPostIndex = useCallback((index: number) => {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    const target = carousel.children.item(index);
    const firstItem = carousel.firstElementChild;

    if (!(target instanceof HTMLElement) || !(firstItem instanceof HTMLElement)) {
      return;
    }

    carousel.scrollTo({
      left: target.offsetLeft - firstItem.offsetLeft,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    scrollToPostIndex(activePostIndex);
  }, [activePostIndex, scrollToPostIndex]);

  const scrollFeaturedPosts = useCallback(
    (direction: 'previous' | 'next') => {
      setActivePostIndex((currentIndex) => {
        if (featuredPosts.length <= 1) {
          return 0;
        }

        if (direction === 'next') {
          return (currentIndex + 1) % featuredPosts.length;
        }

        return (currentIndex - 1 + featuredPosts.length) % featuredPosts.length;
      });
    },
    [featuredPosts.length],
  );

  const handlePostClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }

      event.preventDefault();
      router.push(getPostPath(slug));
    },
    [router],
  );

  if (featuredPosts.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-red-600">Tin mới</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Bài viết nổi bật</h2>
          </div>

          {featuredPosts.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollFeaturedPosts('previous')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                aria-label="Xem bài viết trước"
                title="Xem bài viết trước"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollFeaturedPosts('next')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                aria-label="Xem bài viết tiếp theo"
                title="Xem bài viết tiếp theo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={carouselRef}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {featuredPosts.map((post) => (
            <FeaturedPostCard key={post.id} post={post} onPostClick={handlePostClick} />
          ))}
        </div>
      </div>
    </section>
  );
}
