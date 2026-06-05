import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-950">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
