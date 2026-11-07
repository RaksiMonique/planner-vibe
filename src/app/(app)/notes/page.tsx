import type { Metadata } from 'next';
import { NotesPage } from '@/features/notes/components/notes-page';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Notes' };
export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  return <NotesPage kind="note" userId={user.id} searchParams={await searchParams} />;
}
