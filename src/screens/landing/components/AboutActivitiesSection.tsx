import { landingActivities } from '@/screens/landing/landingContent';
import { CalendarDays } from 'lucide-react';

export default function AboutActivitiesSection() {
  return (
    <section className="py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase text-red-600">Về đội</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Một điểm hẹn cho tinh thần tình nguyện trong cộng đồng SOICT.
          </h2>
        </div>

        <div className="space-y-4">
          {landingActivities.map((activity) => (
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
  );
}
