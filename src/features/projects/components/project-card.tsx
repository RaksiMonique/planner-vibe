import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { ProgressBar } from '@/components/shared/progress-bar';
import { cn } from '@/lib/utils';
import type { ProjectRow } from '../queries';
import { PROJECT_STATUS_LABELS } from '../schema';

export function ProjectCard({ project, todayKey }: { project: ProjectRow; todayKey: string }) {
  const closed = project.status === 'done' || project.status === 'archived';
  const overdue = !closed && project.dueDate !== null && project.dueDate < todayKey;
  return (
    <Link href={`/projects/${project.id}`} className="block h-full">
      <Card
        size="sm"
        className={cn('hover:bg-muted/40 h-full transition-colors', closed && 'opacity-75')}
      >
        <CardContent className="flex h-full flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <SegmentBadge name={project.segment.name} accent={project.segment.accent} />
            {project.status !== 'active' && (
              <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
            )}
          </div>
          <p className="font-heading text-lg leading-snug">{project.title}</p>
          <ProgressBar value={project.progress} />
          <div className="text-muted-foreground mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {project.dueDate && (
              <span className={cn(overdue && 'text-destructive')}>
                Due {format(parseISO(project.dueDate), 'd MMM yyyy')}
              </span>
            )}
            <span>
              {project.taskDone}/{project.taskTotal} tasks
            </span>
            {project.milestoneTotal > 0 && (
              <span>
                {project.milestoneDone}/{project.milestoneTotal} milestones
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
