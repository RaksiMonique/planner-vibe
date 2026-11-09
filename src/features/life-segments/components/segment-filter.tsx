import Link from 'next/link';
import { SegmentDot } from '@/components/shared/segment-badge';
import { cn } from '@/lib/utils';
import type { SegmentRef } from '../types';

/** Row of segment chips that filter a list page through `?segment=<slug>`. */
export function SegmentFilter({
  basePath,
  segments,
  current,
  extra = {},
}: {
  basePath: string;
  segments: SegmentRef[];
  current?: string;
  /** Other search params to keep while switching segment. */
  extra?: Record<string, string | undefined>;
}) {
  const href = (slug?: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    if (slug) params.set('segment', slug);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chip = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
      active ? 'border-primary bg-secondary text-secondary-foreground' : 'bg-card hover:bg-muted'
    );
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <Link href={href()} className={chip(!current)} aria-current={!current ? 'page' : undefined}>
        All segments
      </Link>
      {segments.map((s) => (
        <Link
          key={s.id}
          href={href(s.slug)}
          className={chip(current === s.slug)}
          aria-current={current === s.slug ? 'page' : undefined}
        >
          <SegmentDot accent={s.accent} />
          {s.name}
        </Link>
      ))}
    </div>
  );
}
