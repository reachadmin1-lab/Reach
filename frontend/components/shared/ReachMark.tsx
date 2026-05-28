export function ReachMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-bold tracking-[-0.045em] leading-none ${className}`}>
      Reach
      <span className="inline-block bg-brand rounded-[2px] w-[0.22em] h-[0.22em] ml-[0.04em] self-end shadow-[0_0_22px_rgba(255,65,24,0.22)]" />
    </span>
  );
}
