import Sharingan from '@/components/shared/loading/Sharingan';

export default function MembersLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-label="Đang tải thành viên"
    >
      <Sharingan />
    </div>
  );
}
