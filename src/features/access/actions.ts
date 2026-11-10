'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { fail, fromError, ok, type ActionResult } from '@/lib/action-result';
import { setMemberStatus } from './service';
import type { AccessStatus } from './rules';

/** Plain forms call these, so they return nothing; a failure is logged and the page simply does not change. */
async function change(memberId: unknown, status: AccessStatus): Promise<void> {
  const result: ActionResult = await (async () => {
    try {
      const user = await requireUser();
      if (typeof memberId !== 'string' || !memberId) return fail('Which member?');
      await setMemberStatus(user.id, memberId, status);
      revalidatePath('/settings/members');
      return ok(undefined);
    } catch (e) {
      return fromError(e);
    }
  })();
  if (!result.ok) console.error('[members]', result.error);
}

export async function approveMemberAction(formData: FormData): Promise<void> {
  await change(formData.get('memberId'), 'approved');
}

export async function blockMemberAction(formData: FormData): Promise<void> {
  await change(formData.get('memberId'), 'blocked');
}

export async function setPendingAction(formData: FormData): Promise<void> {
  await change(formData.get('memberId'), 'pending');
}
