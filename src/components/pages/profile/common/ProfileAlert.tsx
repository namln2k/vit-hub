interface ProfileAlertProps {
  message: string;
  tone: 'error' | 'success';
}

const toneClasses = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-green-200 bg-green-50 text-green-700',
} as const;

export default function ProfileAlert({ message, tone }: ProfileAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${toneClasses[tone]}`}>{message}</div>
  );
}
