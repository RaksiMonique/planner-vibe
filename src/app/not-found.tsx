import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="font-heading text-4xl">Not here yet</h1>
      <p className="text-muted-foreground max-w-md">
        That page does not exist, or it belongs to a later release of the planner.
      </p>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
        Back to the start
      </Link>
    </main>
  );
}
