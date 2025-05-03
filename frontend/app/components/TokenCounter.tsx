export const MAX_TOKENS = 10;

interface TokenCounterProps {
  current: number;
  max: number;
}

export default function TokenCounter({ current, max }: TokenCounterProps) {
  const percent = Math.max(0, Math.min(1, current / max));
  let bg = 'from-green-400 to-green-600';
  if (percent <= 0.6 && percent > 0.3) bg = 'from-yellow-300 to-yellow-500';
  if (percent <= 0.3) bg = 'from-red-400 to-red-600';

  return (
    <div
      className={`w-48 h-28 rounded-2xl shadow-xl flex flex-col items-center justify-center bg-gradient-to-br ${bg} transition-all duration-500 relative group`}
      title={`Você tem ${current} de ${max} tokens disponíveis`}
    >
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow p-2 border-2 border-white">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="16" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="18" cy="18" r="8" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M12 18h12M18 12v12" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mt-6 flex flex-col items-center">
        <span className="text-3xl font-extrabold text-white drop-shadow">{current}</span>
        <span className="text-sm text-white/80">de {max} tokens</span>
      </div>
    </div>
  );
} 