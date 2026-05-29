import volunteerHero from '@/assets/hero.png';
import { useAuth } from '@/contexts/useAuth';
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  HandHeart,
  Laptop,
  LogIn,
  MapPin,
  User,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

export default function LandingPage() {
  const { currentUser, userProfile } = useAuth();
  const fullName = userProfile
    ? `${userProfile.lastName} ${userProfile.middleName} ${userProfile.firstName}`.trim()
    : '';
  const avatarLabel = fullName || userProfile?.username || currentUser?.email || 'Dashboard';
  const avatarInitial = avatarLabel.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-bold text-white">
            VIT Hub
          </Link>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <Link
                to="/dashboard"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950 shadow-sm ring-1 ring-white/60 transition-colors hover:bg-cyan-50"
                title={avatarLabel}
                aria-label="Mở dashboard"
              >
                {avatarInitial ? avatarInitial : <User className="h-4 w-4" />}
              </Link>
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
        </nav>
      </header>

      <main>
        <section className="relative min-h-[90vh] overflow-hidden">
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
                Không gian dành cho sinh viên yêu thích hoạt động cộng đồng, muốn góp sức bằng
                tinh thần trách nhiệm, kỹ năng tổ chức và màu sắc công nghệ của SOICT.
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
