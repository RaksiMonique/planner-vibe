import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportSummary } from '../service';

export const SECTION_LABELS: Record<string, string> = {
  tasks: 'Tasks',
  captures: 'Tasks without a segment (sent to the Inbox)',
  habits: 'Habits',
  checkIns: 'Habit check-ins',
  goals: 'Goals (annual)',
  routines: 'Routines',
  steps: 'Routine steps',
  bibleStudies: 'Bible studies',
  subjects: 'Subjects (from study categories)',
  courses: 'Studies (as courses)',
  journal: 'Journal entries',
  quotes: 'Quotes',
  recipes: 'Recipes (Release 4)',
  mealPlan: 'Meal plan days (Release 4)',
};

export function ImportSummaryTable({ summary }: { summary: ImportSummary }) {
  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Section</TableHead>
            <TableHead className="text-right">Imported</TableHead>
            <TableHead className="text-right">Skipped</TableHead>
            <TableHead className="text-right">Deferred</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.keys(summary.imported).map((key) => (
            <TableRow key={key}>
              <TableCell>{SECTION_LABELS[key] ?? key}</TableCell>
              <TableCell className="text-right tabular-nums">{summary.imported[key]}</TableCell>
              <TableCell className="text-right tabular-nums">
                {summary.skipped[key] ?? '–'}
              </TableCell>
              <TableCell className="text-right tabular-nums">–</TableCell>
            </TableRow>
          ))}
          {Object.entries(summary.deferred).map(([key, count]) => (
            <TableRow key={key}>
              <TableCell>{SECTION_LABELS[key] ?? key}</TableCell>
              <TableCell className="text-right tabular-nums">–</TableCell>
              <TableCell className="text-right tabular-nums">–</TableCell>
              <TableCell className="text-right tabular-nums">{count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {summary.problems.length > 0 && (
        <ul className="text-destructive list-disc pl-5 text-sm">
          {summary.problems.map((p, i) => (
            <li key={`${i}-${p}`}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
