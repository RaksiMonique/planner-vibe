import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { CURRENT_RELEASE } from '@/components/layout/nav-config';
import { cn } from '@/lib/utils';

export function DashboardCard({
  title,
  icon: Icon,
  href,
  release,
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  /** Full module page this card previews. */
  href: string;
  /** Release in which that page ships; later releases show a badge instead of a link. */
  release: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ready = release <= CURRENT_RELEASE;
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="items-center">
        <h2 className="font-heading flex items-center gap-2 text-lg leading-snug">
          <Icon className="text-primary size-4" aria-hidden />
          {title}
        </h2>
        <CardAction>
          {ready ? (
            <Link
              href={href}
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              Open <ArrowUpRightIcon className="size-3" aria-hidden />
            </Link>
          ) : (
            <Badge variant="outline" title={`Full page arrives in Release ${release}`}>
              R{release}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}
