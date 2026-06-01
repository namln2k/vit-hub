import {
  ArrowLeft,
  ClipboardList,
  Megaphone,
  Music2,
  PackageCheck,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const divisions = [
  {
    title: 'Phong trào',
    icon: Music2,
    description:
      'Hòa mình vào những sự kiện sôi động, trở thành người kết nối và truyền cảm hứng cho mọi người xung quanh. Với 2 Câu lạc bộ trực thuộc - VIT Dancer và VIT Music - là nơi hứa hẹn sẽ mang đến cơ hội để bạn thể hiện khả năng và niềm đam mê của mình.',
    registrationLabel: 'Đăng ký Mảng Phong trào, VIT Dancer, VIT Music',
    registrationUrl: 'https://bom.so/MangPhongTrao',
  },
  {
    title: 'Truyền thông',
    icon: Megaphone,
    description:
      'Thỏa sức sáng tạo với các bài viết, hình ảnh, và video giúp lan tỏa thông điệp tích cực cùng Tổ Nội dung - Quay chụp và Tổ Thiết kế - Biên tập.',
    registrationLabel: 'Đăng ký Mảng Truyền thông',
    registrationUrl: 'https://bom.so/MangTruyenThong',
  },
  {
    title: 'Hậu cần',
    icon: PackageCheck,
    description:
      'Đảm bảo mọi thứ luôn “mượt mà” từ phía sau - luôn túc trực tại “hậu phương” trong các sự kiện lớn nhỏ của Đội.',
    registrationLabel: 'Đăng ký Mảng Hậu cần',
    registrationUrl: 'https://bom.so/MangHauCan',
  },
  {
    title: 'Nhân sự - Kỉ luật',
    icon: ShieldCheck,
    description:
      'Quản lý và điều phối nhân sự trong mọi hoạt động tình nguyện, đảm bảo kỷ luật và nắm bắt thông tin thành viên.',
    registrationLabel: 'Đăng ký Mảng Nhân sự - Kỉ luật',
    registrationUrl: 'https://bom.so/MangNSKL',
  },
];

export default function DivisionsIntroduction() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-bold text-slate-950">
            VIT Hub
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </Link>
        </nav>
      </header>

      <main>
        <section className="bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-700 ring-1 ring-cyan-100">
                <UsersRound className="h-4 w-4" />
                Các mảng hoạt động
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Chọn nơi bạn muốn góp sức trong Đội Tình nguyện SOICT.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
                Mỗi mảng là một cách khác nhau để bạn tham gia tổ chức hoạt động, sáng tạo nội
                dung, hỗ trợ vận hành và đồng hành cùng các thành viên trong Đội.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            {divisions.map((division) => {
              const Icon = division.icon;

              return (
                <article
                  key={division.title}
                  className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-950">{division.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                    {division.description}
                  </p>
                  <a
                    href={division.registrationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center justify-center rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300"
                  >
                    {division.registrationLabel}
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-3 rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-cyan-950">
              <ClipboardList className="mt-1 h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold leading-6">
                Một TNV được phép đăng kí nhiều Mảng/Tổ/CLB.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
