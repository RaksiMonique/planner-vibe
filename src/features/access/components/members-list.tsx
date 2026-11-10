import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { approveMemberAction, blockMemberAction, setPendingAction } from '../actions';
import type { Member } from '../service';

const STATUS_LABEL = { pending: 'Waiting', approved: 'Member', blocked: 'Blocked' } as const;

function MemberRow({ member }: { member: Member }) {
  const isOwner = member.role === 'owner';
  return (
    <li
      id={member.id}
      className="bg-card flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{member.displayName ?? member.email}</p>
        <p className="text-muted-foreground truncate text-xs">
          {member.email} · asked {format(member.requestedAt, 'd MMM yyyy')}
        </p>
      </div>
      <Badge variant={member.accessStatus === 'approved' ? 'secondary' : 'outline'}>
        {isOwner ? 'Owner' : STATUS_LABEL[member.accessStatus]}
      </Badge>
      {!isOwner && (
        <div className="flex gap-1">
          {member.accessStatus !== 'approved' && (
            <form action={approveMemberAction}>
              <input type="hidden" name="memberId" value={member.id} />
              <Button type="submit" size="sm">
                Approve
              </Button>
            </form>
          )}
          {member.accessStatus !== 'blocked' && (
            <form action={blockMemberAction}>
              <input type="hidden" name="memberId" value={member.id} />
              <Button type="submit" size="sm" variant="outline">
                Block
              </Button>
            </form>
          )}
          {member.accessStatus === 'blocked' && (
            <form action={setPendingAction}>
              <input type="hidden" name="memberId" value={member.id} />
              <Button type="submit" size="sm" variant="ghost">
                Move to waiting
              </Button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

export function MembersList({ members }: { members: Member[] }) {
  const pending = members.filter((m) => m.accessStatus === 'pending');
  const approved = members.filter((m) => m.accessStatus === 'approved');
  const blocked = members.filter((m) => m.accessStatus === 'blocked');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Waiting for approval</CardTitle>
          <CardDescription>
            People who signed in but cannot enter yet. Approving gives them their own empty planner;
            nobody can see anyone else&apos;s data either way.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState title="No requests" description="New sign-ins appear here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {approved.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Blocked</CardTitle>
          <CardDescription>Their data is kept; they just cannot sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          {blocked.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nobody is blocked.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {blocked.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
