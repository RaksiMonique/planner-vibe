import { ACCENT_BG, type Accent } from '@/lib/accents';
import { cn } from '@/lib/utils';

export function SegmentDot({ accent, className }: { accent: Accent; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2.5 shrink-0 rounded-full', ACCENT_BG[accent], className)}
    />
  );
}

export function SegmentBadge({
  name,
  accent,
  className,
}: {
  name: string;
  accent: Accent;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-card inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs',
        className
      )}
    >
      <SegmentDot accent={accent} />
      {name}
    </span>
  );
}
