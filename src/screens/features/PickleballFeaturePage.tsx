'use client';

import { APP_ROUTES } from '@/constants/routes';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PickleballFeaturePage() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <Link
        href={APP_ROUTES.features}
        className="mb-5 inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Tính năng
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Pickleball</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
        Host kèo, ghép trận, oánh giải và thu họ về Pickleball.
      </p>
    </section>
  );
}
