interface StatusDotProps {
  online: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export default function StatusDot({ online, pulse = true, size = 'sm' }: StatusDotProps) {
  const sz = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  return (
    <span className="relative inline-flex items-center justify-center">
      {online && pulse && (
        <span className={`absolute inline-flex ${sz} rounded-full bg-hub-green opacity-60 animate-ping`} />
      )}
      <span
        className={`relative inline-flex ${sz} rounded-full ${online ? 'bg-hub-green' : 'bg-hub-red'}`}
      />
    </span>
  );
}
