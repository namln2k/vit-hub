import AvatarMenu from '@/components/shared/layout/AvatarMenu';
import UserSearch from '@/components/shared/layout/UserSearch';
import { listLatestPublishedPosts, type Post } from '@/api/posts';
import volunteerHero from '@/assets/hero.webp';
import { useAuth } from '@/contexts/useAuth';
import {
  getAllowedAvatarMenuFeatures,
  type AvatarMenuFeatureId,
} from '@/constants/avatarMenuAcl';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ExternalLink,
  HandHeart,
  ImageIcon,
  LayoutGrid,
  Laptop,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const highlights = [
  {
    icon: HandHeart,
    title: 'Hoạt động cộng đồng',
    description: 'Kết nối sinh viên trong các chương trình thiện nguyện và hỗ trợ xã hội.',
  },
  {
    icon: Laptop,
    title: 'Tinh thần công nghệ',
    description: 'Lan tỏa năng lực ICT của sinh viên SOICT vào những việc làm thiết thực.',
  },
  {
    icon: UsersRound,
    title: 'Mạng lưới sinh viên',
    description: 'Tạo môi trường để thành viên cùng học hỏi, phối hợp và trưởng thành.',
  },
];

const activities = [
  'Tổ chức và tham gia các chiến dịch tình nguyện theo mùa',
  'Hỗ trợ truyền thông, hậu cần và điều phối hoạt động sinh viên',
  'Kết nối những bạn trẻ muốn đóng góp cho cộng đồng SOICT',
];

const avatarMenuIcons: Record<AvatarMenuFeatureId, ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4" />,
  features: <LayoutGrid className="h-4 w-4" />,
  profile: <UserRound className="h-4 w-4" />,
};

function formatPostUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function LandingPage() {
  const { currentUser, appUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const featuredPostsCarouselRef = useRef<HTMLDivElement>(null);
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [isLoadingFeaturedPosts, setIsLoadingFeaturedPosts] = useState(true);
  const [featuredPostsError, setFeaturedPostsError] = useState('');
  const [activeFeaturedPostIndex, setActiveFeaturedPostIndex] = useState(0);
  const fullName = appUser
    ? `${appUser.lastName} ${appUser.middleName} ${appUser.firstName}`.trim()
    : '';
  const avatarLabel = fullName || appUser?.username || currentUser?.email || '';

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedPosts() {
      setIsLoadingFeaturedPosts(true);
      setFeaturedPostsError('');

      try {
        const posts = await listLatestPublishedPosts(10);

        if (isMounted) {
          setFeaturedPosts(posts);
          setActiveFeaturedPostIndex(0);
        }
      } catch (error) {
        if (isMounted) {
          setFeaturedPosts([]);
          setActiveFeaturedPostIndex(0);
          setFeaturedPostsError(
            error instanceof Error ? error.message : 'Không thể tải bài viết nổi bật.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeaturedPosts(false);
        }
      }
    }

    void loadFeaturedPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const scrollFeaturedPostsToIndex = useCallback((index: number) => {
    const carousel = featuredPostsCarouselRef.current;

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
    scrollFeaturedPostsToIndex(activeFeaturedPostIndex);
  }, [activeFeaturedPostIndex, scrollFeaturedPostsToIndex]);

  const scrollFeaturedPosts = useCallback((direction: 'previous' | 'next') => {
    setActiveFeaturedPostIndex((currentIndex) => {
      if (featuredPosts.length <= 1) {
        return 0;
      }

      if (direction === 'next') {
        return (currentIndex + 1) % featuredPosts.length;
      }

      return (currentIndex - 1 + featuredPosts.length) % featuredPosts.length;
    });
  }, [featuredPosts.length]);

  function handleFeaturedPostClick(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    navigate(`/posts/${slug}`);
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid min-h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <Link to="/" className="text-lg font-bold text-white">
              VIT Hub
            </Link>
            <div className="mx-auto w-full max-w-md">
              <UserSearch variant="dark" />
            </div>
            <div className="flex items-center gap-2">
              {currentUser ? (
                <AvatarMenu
                  avatarSrc={appUser?.avatarUrl}
                  label={avatarLabel}
                  avatarSize="md"
                  avatarClassName="border-0"
                  buttonClassName="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-bold text-slate-950 shadow-sm ring-1 ring-white/60 transition-colors hover:bg-cyan-50 cursor-pointer"
                  items={[
                    ...getAllowedAvatarMenuFeatures(appUser?.role, location.pathname).map(
                      (feature) => ({
                        label: feature.label,
                        icon: avatarMenuIcons[feature.id],
                        to: feature.to,
                      }),
                    ),
                    {
                      label: 'Đăng xuất',
                      icon: <LogOut className="h-4 w-4" />,
                      onClick: handleSignOut,
                      danger: true,
                    },
                  ]}
                />
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-50"
                >
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center">
            <Link
              to="/divisions"
              className="rounded-full bg-white/18 px-5 py-2.5 text-sm font-bold text-white shadow-sm ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-cyan-400 hover:text-slate-950 hover:ring-cyan-300"
            >
              Các mảng hoạt động
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative min-h-1/3 overflow-hidden">
          <img
            src={volunteerHero}
            alt="Sinh viên tình nguyện SOICT tham gia hoạt động cộng đồng"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.82),rgba(2,6,23,0.45),rgba(2,6,23,0.12))]" />

          <div className="relative z-10 mx-auto flex min-h-[86vh] max-w-7xl items-center px-4 pb-16 pt-24 sm:px-6 lg:px-8">
            <div className="max-w-3xl text-white">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-400/15 px-3 py-1 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-200/30">
                <MapPin className="h-4 w-4" />
                School of Information and Communications Technology, HUST
              </p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Đội Tình nguyện SOICT
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
                Không gian dành cho sinh viên yêu thích hoạt động cộng đồng, muốn góp sức bằng tinh
                thần trách nhiệm, kỹ năng tổ chức và màu sắc công nghệ của SOICT.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://www.facebook.com/doitinhnguyen.soict"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  Theo dõi Facebook
                </a>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/12 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
                >
                  Tham gia VIT Hub
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {isLoadingFeaturedPosts || featuredPosts.length > 0 || featuredPostsError ? (
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

              {isLoadingFeaturedPosts ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-64 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                    />
                  ))}
                </div>
              ) : featuredPostsError ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  Không thể tải bài viết nổi bật.
                </div>
              ) : (
                <div
                  ref={featuredPostsCarouselRef}
                  className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {featuredPosts.map((post) => (
                    <Link
                      key={post.id}
                      to={`/posts/${post.slug}`}
                      onClick={(event) => handleFeaturedPostClick(event, post.slug)}
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
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="bg-slate-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase text-red-600">Về đội</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                Một điểm hẹn cho tinh thần tình nguyện trong cộng đồng SOICT.
              </h2>
            </div>

            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity}
                  className="flex items-start gap-3 border-b border-slate-200 pb-4 last:border-b-0"
                >
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <p className="text-base leading-7 text-slate-700">{activity}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
