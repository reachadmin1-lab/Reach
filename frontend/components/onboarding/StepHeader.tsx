interface StepHeaderProps {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
}

export function StepHeader({ step, total, title, subtitle }: StepHeaderProps) {
  const progress = (step / total) * 100;

  return (
    <div className="px-6 pt-8 pb-6 max-w-2xl mx-auto w-full">
      {/* Step label */}
      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
        Step {step} of {total}
      </p>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--paper-2)] rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h1 className="text-2xl font-semibold text-ink leading-tight">{title}</h1>
      {subtitle && (
        <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>
      )}
    </div>
  );
}
