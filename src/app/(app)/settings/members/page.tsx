import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { MembersList } from '@/features/access/components/members-list';
import { getAccess, listMembers } from '@/features/access/service';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Members' };
export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const user = await requireUser();
  const access = await getAccess(user.id);
  if (access.role !== 'owner') notFound();
  const members = await listMembers(user.id);
  return (
    <div>
      <PageHeader
        title="Members"
        description="Who may enter this planner. Sign-ins wait here until you approve them."
      />
      <MembersList members={members} />
    </div>
  );
}
