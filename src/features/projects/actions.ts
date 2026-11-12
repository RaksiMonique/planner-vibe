'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { linkProject, unlinkProject } from '@/features/goals/service';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import type { ProjectOption } from './queries';
import { projectInput } from './schema';
import { createProject, deleteProject, updateProject, type Project } from './service';

function revalidateProjects() {
  revalidatePath('/projects', 'layout');
  revalidatePath('/goals', 'layout');
  revalidatePath('/segments', 'layout');
  revalidatePath('/tasks', 'layout');
  revalidatePath('/dashboard');
}

/** The saved row, in the shape pickers elsewhere need to select it straight away. */
export type ProjectActionResult = ActionResult<ProjectOption>;

function toOption(row: Project): ProjectOption {
  return { id: row.id, title: row.title, lifeSegmentId: row.lifeSegmentId };
}

export async function createProjectAction(
  _prev: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  try {
    const user = await requireUser();
    const parsed = projectInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await createProject(user.id, parsed.data);
    revalidateProjects();
    return ok(toOption(row));
  } catch (e) {
    return fromError(e);
  }
}

const withId = z.object({ id: z.uuid() });

export async function updateProjectAction(
  _prev: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = projectInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await updateProject(user.id, id.data.id, parsed.data);
    revalidateProjects();
    return ok(toOption(row));
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await deleteProject(user.id, parsed.data.id);
  revalidateProjects();
  redirect('/projects');
}

const link = z.object({ goalId: z.uuid(), projectId: z.uuid() });

export async function linkGoalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = link.safeParse(formValues(formData));
  if (!parsed.success) return;
  await linkProject(user.id, parsed.data.goalId, parsed.data.projectId);
  revalidateProjects();
}

export async function unlinkGoalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = link.safeParse(formValues(formData));
  if (!parsed.success) return;
  await unlinkProject(user.id, parsed.data.goalId, parsed.data.projectId);
  revalidateProjects();
}
