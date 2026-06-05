interface ProfileFieldProps {
  label: string;
  value: string;
  className?: string;
}

export default function ProfileField({ label, value, className = '' }: ProfileFieldProps) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || '-'}</p>
    </div>
  );
}
