'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  fail,
  formValues,
  fromError,
  fromZodError,
  ok,
  type ActionResult,
} from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import {
  dateKeyValue,
  devotionalInput,
  planInput,
  prayerInput,
  referenceInput,
  STUDY_STATUSES,
  studyInput,
  studyNoteInput,
} from './schema';
import {
  addStudyNote,
  createPlan,
  createPrayer,
  createReference,
  createStudy,
  markChapterRead as markRead,
  removeDevotional,
  removePlan,
  removePrayer,
  removeReference,
  removeStudy,
  removeStudyNote,
  saveDevotional,
  setPlanStatus,
  setPrayerAnswered,
  setReferenceFlag,
  setStudyStatus,
  touchStudy,
  unmarkChapter,
  updatePrayer,
  updateStudy,
} from './service';

/** Faith data shows on the dashboard, the weekly view and these pages. */
function refresh() {
  revalidatePath('/', 'layout');
}

const withId = z.object({ id: z.uuid() });

type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function formAction<T>(
  schema: z.ZodType<T>,
  run: (userId: string, input: T, raw: Record<string, unknown>) => Promise<void>
): FormAction {
  return async (_prev, formData) => {
    try {
      const user = await requireUser();
      const raw = formValues(formData);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return fromZodError(parsed.error);
      await run(user.id, parsed.data, raw);
      refresh();
      return ok(undefined);
    } catch (e) {
      return fromError(e);
    }
  };
}

// Studies
export const createStudyAction: FormAction = formAction(studyInput, (u, input) =>
  createStudy(u, input).then(() => undefined)
);
export const updateStudyAction: FormAction = formAction(studyInput, async (u, input, raw) => {
  const id = withId.parse(raw).id;
  await updateStudy(u, id, input);
});

export async function setStudyStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ status: z.enum(STUDY_STATUSES) }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setStudyStatus(user.id, parsed.data.id, parsed.data.status);
  refresh();
}

export async function touchStudyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await touchStudy(user.id, parsed.data.id);
  refresh();
}

export async function deleteStudyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeStudy(user.id, parsed.data.id);
  refresh();
  redirect('/bible');
}

// Study notes
export const addStudyNoteAction: FormAction = formAction(studyNoteInput, (u, input) =>
  addStudyNote(u, input.studyId, input.content, input.reference || undefined)
);

export async function deleteStudyNoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeStudyNote(user.id, parsed.data.id);
  refresh();
}

// References
export const addReferenceAction: FormAction = formAction(referenceInput, (u, input) =>
  createReference(u, input.reference, {
    note: input.note,
    isBookmark: input.isBookmark,
    isFavourite: input.isFavourite,
  }).then(() => undefined)
);

export async function setReferenceFlagAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId
    .extend({ flag: z.enum(['isBookmark', 'isFavourite']), value: z.coerce.boolean() })
    .safeParse(formValues(formData));
  if (!parsed.success) return;
  await setReferenceFlag(user.id, parsed.data.id, parsed.data.flag, parsed.data.value);
  refresh();
}

export async function deleteReferenceAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeReference(user.id, parsed.data.id);
  refresh();
}

// Reading plans
export const createPlanAction: FormAction = formAction(planInput, (u, input) =>
  createPlan(u, input).then(() => undefined)
);

export async function setPlanStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId
    .extend({ status: z.enum(['active', 'paused', 'done']) })
    .safeParse(formValues(formData));
  if (!parsed.success) return;
  await setPlanStatus(user.id, parsed.data.id, parsed.data.status);
  refresh();
}

export async function deletePlanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removePlan(user.id, parsed.data.id);
  refresh();
}

/** Contract for the reading controls on the Bible page and dashboard. */
export async function markChapterRead(
  planId: string,
  bookId: number,
  chapter: number,
  read: boolean,
  dateKey: string
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const parsed = z
      .object({
        planId: z.uuid(),
        bookId: z.number().int().min(1).max(73),
        chapter: z.number().int().min(1),
        dateKey: dateKeyValue,
      })
      .safeParse({ planId, bookId, chapter, dateKey });
    if (!parsed.success) return fail('That chapter is not valid.');
    if (read) await markRead(user.id, planId, bookId, chapter, dateKey);
    else await unmarkChapter(user.id, planId, bookId, chapter);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

// Prayer
export const createPrayerAction: FormAction = formAction(prayerInput, (u, input) =>
  createPrayer(u, input).then(() => undefined)
);
export const updatePrayerAction: FormAction = formAction(prayerInput, async (u, input, raw) => {
  const id = withId.parse(raw).id;
  await updatePrayer(u, id, input);
});

export async function setPrayerAnsweredAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ answered: z.coerce.boolean() }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setPrayerAnswered(user.id, parsed.data.id, parsed.data.answered);
  refresh();
}

export async function deletePrayerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removePrayer(user.id, parsed.data.id);
  refresh();
}

// Devotionals
export const saveDevotionalAction: FormAction = formAction(devotionalInput, (u, input) =>
  saveDevotional(u, input).then(() => undefined)
);

export async function deleteDevotionalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeDevotional(user.id, parsed.data.id);
  refresh();
}
