import badmintonIcon from '@/assets/icons/badminton.webp';
import pickleballIcon from '@/assets/icons/pickleball.webp';
import Header from '@/components/shared/layout/Header';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Cầu lông',
    description: 'Host kèo, ghép trận, oánh giải và thu họ về Cầu lông',
    to: '/features/badminton',
    icon: badmintonIcon,
  },
  {
    title: 'Pickleball',
    description: 'Host kèo, ghép trận, oánh giải và thu họ về Pickleball',
    to: '/features/pickleball',
    icon: pickleballIcon,
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tính năng</h1>
        </div>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = () => (
              <img src={feature.icon} alt={`${feature.title} icon`} className="h-12 w-12" />
            );

            return (
              <Link
                key={feature.title}
                to={feature.to}
                className="group flex min-h-72 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-950/10"
              >
                <div className="flex min-h-36 items-center justify-center bg-slate-50 p-6 transition-transform duration-300 group-hover:scale-[1.03]">
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors duration-300">
                    <Icon />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-black tracking-normal text-slate-950 transition-colors duration-300 group-hover:text-slate-800">
                      {feature.title}
                    </h2>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-gray-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-slate-700" />
                  </div>
                  <p className="mt-3 flex-1 text-sm font-medium leading-6 text-gray-600 transition-colors duration-300 group-hover:text-gray-800">
                    {feature.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
