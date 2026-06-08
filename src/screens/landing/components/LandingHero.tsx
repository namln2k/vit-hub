import volunteerHero from '@/assets/hero.webp';
import { APP_ROUTES } from '@/constants/routes';
import { ArrowRight, ExternalLink, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function LandingHero() {
  return (
    <section className="relative min-h-1/3 overflow-hidden">
      <img
        src={volunteerHero.src}
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
            Không gian dành cho sinh viên yêu thích hoạt động cộng đồng, muốn góp sức bằng tinh thần
            trách nhiệm, kỹ năng tổ chức và màu sắc công nghệ của SOICT.
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
              href={APP_ROUTES.register}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/12 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
            >
              Tham gia VIT Hub
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
