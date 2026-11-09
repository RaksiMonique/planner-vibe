import type { Metadata } from 'next';
import Link from 'next/link';
import { DownloadIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { format } from 'date-fns';
import { ImportDeferredForm } from '@/features/import/components/import-deferred-form';
import { ImportForm } from '@/features/import/components/import-form';
import { getLatestImportFile } from '@/features/import/service';
import { DeleteDataDialog } from '@/features/settings/components/delete-data-dialog';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Your data' };
export const dynamic = 'force-dynamic';

export default async function DataPage() {
  const user = await requireUser();
  const latest = await getLatestImportFile(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Your data"
        description="Bring in the old planner, take a full copy, or start again."
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Import from the old planner</CardTitle>
            <CardDescription>
              In the old app choose Export Data in the sidebar, then upload that file here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Import the rest of the old planner
            </CardTitle>
            <CardDescription>
              Exports uploaded before Release 3 kept Bible studies, studies, journal entries and
              quotes aside. Bring them in from the stored file without uploading it again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latest ? (
              <ImportDeferredForm
                file={{
                  fileName: latest.fileName,
                  importedAt: format(latest.importedAt, 'd MMM yyyy, HH:mm'),
                  alreadyDone: Boolean(latest.summary?.deferredImportedAt),
                }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                No stored export yet. Import the JSON file above first.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Export everything</CardTitle>
            <CardDescription>A JSON file with every planner record you own.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/api/export/json"
              prefetch={false}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <DownloadIcon data-icon="inline-start" />
              Download JSON export
            </Link>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Delete all planner data</CardTitle>
            <CardDescription>
              Removes every planner record and starts you again with the default Life Segments. Your
              login is never deleted here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteDataDialog />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
