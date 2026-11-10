import 'server-only';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, profiles } from '@/db/schema';
import { env } from '@/env';
import { ensureProfile } from '@/features/auth/service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { decideAccess, parseAllowList, type AccessDecision, type AccessStatus } from './rules';

export type Member = Pick<
  typeof profiles.$inferSelect,
  'id' | 'email' | 'displayName' | 'accessStatus' | 'role' | 'requestedAt' | 'approvedAt'
>;

const memberColumns = {
  id: profiles.id,
  email: profiles.email,
  displayName: profiles.displayName,
  accessStatus: profiles.accessStatus,
  role: profiles.role,
  requestedAt: profiles.requestedAt,
  approvedAt: profiles.approvedAt,
};

export async function getAccess(userId: string): Promise<AccessDecision> {
  const [row] = await db
    .select({ status: profiles.accessStatus, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ?? { status: 'pending', role: 'member' };
}

async function ownerId(): Promise<string | null> {
  const [owner] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.role, 'owner'))
    .limit(1);
  return owner?.id ?? null;
}

/**
 * Runs after every successful sign-in: creates the profile if needed, applies
 * the access rules, and tells the owner about a new request.
 */
export async function resolveAccessOnSignIn(user: {
  id: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<AccessDecision> {
  await ensureProfile(user);
  if (!user.email) return { status: 'pending', role: 'member' };
  const current = await getAccess(user.id);
  const owner = await ownerId();
  const decision = decideAccess({
    email: user.email,
    current,
    allowList: parseAllowList(env.AUTH_ALLOWED_EMAILS),
    ownerExists: owner !== null,
  });
  if (decision.status !== current.status || decision.role !== current.role) {
    await db
      .update(profiles)
      .set({
        accessStatus: decision.status,
        role: decision.role,
        approvedAt: decision.status === 'approved' ? new Date() : null,
        approvedBy: decision.status === 'approved' ? (owner ?? user.id) : null,
      })
      .where(eq(profiles.id, user.id));
  }
  // First visit as pending: let the owner know, once.
  if (decision.status === 'pending' && owner && owner !== user.id && current.status === 'pending') {
    const [already] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(eq(notifications.userId, owner), eq(notifications.href, `/settings/members#${user.id}`))
      )
      .limit(1);
    if (!already) {
      await db.insert(notifications).values({
        userId: owner,
        kind: 'system',
        title: `${user.email} asked to join the planner`,
        body: 'Approve or block the request under Settings, then Members.',
        href: `/settings/members#${user.id}`,
      });
    }
  }
  return decision;
}

export async function requireOwner(userId: string): Promise<void> {
  const access = await getAccess(userId);
  if (access.role !== 'owner' || access.status !== 'approved') {
    throw new ForbiddenError('Only the owner can manage members.');
  }
}

export async function listMembers(ownerUserId: string): Promise<Member[]> {
  await requireOwner(ownerUserId);
  return db.select(memberColumns).from(profiles).orderBy(asc(profiles.requestedAt));
}

export async function setMemberStatus(
  ownerUserId: string,
  memberId: string,
  status: AccessStatus
): Promise<void> {
  await requireOwner(ownerUserId);
  if (memberId === ownerUserId)
    throw new ForbiddenError('The owner cannot change their own access.');
  const [member] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, memberId), ne(profiles.role, 'owner')))
    .limit(1);
  if (!member) throw new NotFoundError('That member does not exist.');
  await db
    .update(profiles)
    .set({
      accessStatus: status,
      approvedAt: status === 'approved' ? new Date() : null,
      approvedBy: status === 'approved' ? ownerUserId : null,
    })
    .where(eq(profiles.id, memberId));
}
