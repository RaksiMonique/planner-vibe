import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccess } from '@/features/access/service';
import { signOut } from '@/features/auth/actions';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Waiting for approval' };
export const dynamic = 'force-dynamic';

export default async function PendingPage() {
  const user = await requireUser();
  const access = await getAccess(user.id);
  if (access.status === 'approved') redirect('/dashboard');
  const blocked = access.status === 'blocked';
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="font-heading text-primary mb-8 text-2xl">
        Life Planner
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            <h1>{blocked ? 'Access not available' : 'Waiting for approval'}</h1>
          </CardTitle>
          <CardDescription>
            {blocked
              ? 'This account cannot use the planner. Ask the owner if you think that is a mistake.'
              : `You are signed in as ${user.email ?? 'your account'}. The planner's owner has been told you would like to join and will let you in.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
          {!blocked && (
            <Link href="/pending" className="text-primary text-sm hover:underline">
              Check again
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
