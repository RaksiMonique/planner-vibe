/**
 * Who may enter the planner (docs/decisions/0005). Entry is separate from data
 * isolation: every query is already scoped to the signed-in user.
 */
export type AccessStatus = 'pending' | 'approved' | 'blocked';
export type ProfileRole = 'owner' | 'member';

export type AccessDecision = { status: AccessStatus; role: ProfileRole };

export function parseAllowList(list: string | undefined): string[] {
  return (list ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * - Blocked stays blocked unless the email is on the allow list.
 * - Allow-listed emails are approved at once and become owner when none exists.
 * - With no allow list and no owner yet, the first sign-in becomes the owner.
 * - Everyone else waits as pending until the owner approves them.
 */
export function decideAccess(input: {
  email: string;
  current: { status: AccessStatus; role: ProfileRole };
  allowList: string[];
  ownerExists: boolean;
}): AccessDecision {
  const listed = input.allowList.includes(input.email.toLowerCase());
  const { status, role } = input.current;
  if (listed) {
    return {
      status: 'approved',
      role: role === 'owner' || !input.ownerExists ? 'owner' : 'member',
    };
  }
  if (status === 'blocked') return { status, role };
  if (status === 'approved') return { status, role };
  if (input.allowList.length === 0 && !input.ownerExists)
    return { status: 'approved', role: 'owner' };
  return { status: 'pending', role };
}
